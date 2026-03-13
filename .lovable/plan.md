

## Plano: Corrigir Resposta Vazia da IA na Conversa #213F6209

### Diagnóstico Real

Você tem razão — a janela de 24h **não era o problema**. O cliente ("Boa noite", "Tudo bem?") enviou mensagem primeiro, a conversa estava aberta.

O que realmente aconteceu:
1. O fluxo chegou ao nó AI (`node_4_ia_triagem`) corretamente
2. O `process-chat-flow` retornou `useAI: true, aiNodeActive: true`
3. O `ai-autopilot-chat` foi chamado mas **gerou uma resposta vazia** (a LLM retornou string vazia)
4. O sistema **salvou e enviou a mensagem vazia** sem nenhuma verificação
5. O contato nunca recebeu resposta útil → timeout → conversa encerrada

**Prova:** A mensagem ID `2747f737` tem `content: ""`, `is_ai_generated: true`, mas NÃO existe nenhum registro em `ai_quality_logs` nem `ai_events` para essa conversa — indicando que o caminho principal da IA falhou silenciosamente.

### Causa Raiz

**Falta de guarda contra conteúdo vazio** em 3 pontos críticos:

1. **`ai-autopilot-chat` (linha 9186):** Salva `content: assistantMessage` SEM verificar se está vazio
2. **`ai-autopilot-chat` (linha 9278):** Envia via WhatsApp SEM verificar se a mensagem é vazia
3. **`meta-whatsapp-webhook`:** Quando recebe resposta do autopilot, não valida conteúdo antes de enviar

### O que será feito

#### 1. Guarda contra resposta vazia no `ai-autopilot-chat`
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`
- **Antes de salvar** (antes da linha 9186): Verificar `if (!assistantMessage || assistantMessage.trim().length === 0)`
- Se vazio, substituir por mensagem de fallback: "Olá! Como posso te ajudar hoje?"
- Log de alerta: `[ai-autopilot-chat] ⚠️ EMPTY RESPONSE GUARD: mensagem vazia substituída`
- Registrar em `ai_events` para auditoria

#### 2. Guarda contra envio vazio no `sendWhatsAppMessage`
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts` (helper `sendWhatsAppMessage`)
- Na função `sendWhatsAppMessage` (linha ~640): Validar `message` não é vazio antes de chamar `send-meta-whatsapp`
- Se vazio, retornar `{ success: false, error: 'empty_message' }` sem enviar

#### 3. Guarda no `send-meta-whatsapp`
**Arquivo:** `supabase/functions/send-meta-whatsapp/index.ts`
- Adicionar validação: se `message` está vazio e não é template/media, retornar erro 400 com mensagem clara
- Impede que qualquer chamador consiga enviar mensagem vazia

#### 4. Retry com prompt simplificado quando IA retorna vazio
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`
- Na seção onde `rawAIContent` é vazio (linha ~7216): Tentar UMA vez com prompt simplificado
- Se segunda tentativa também falhar, usar fallback contextual baseado no `flow_context`

### Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Guarda empty response + retry simplificado |
| `supabase/functions/send-meta-whatsapp/index.ts` | Validação contra mensagem vazia |

### Resultado
- Mensagens vazias nunca mais são salvas no banco
- Mensagens vazias nunca mais são enviadas ao WhatsApp
- Se a IA falhar, o cliente recebe uma mensagem de fallback em vez de nada
- Log de auditoria para rastrear quando isso acontece

