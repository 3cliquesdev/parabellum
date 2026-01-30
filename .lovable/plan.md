

# Plano: Respeitar `waiting_human` - Bloquear Fluxo/IA Quando Cliente Está na Fila

## Problema Identificado

Quando o cliente **entra na fila** (`ai_mode = 'waiting_human'`) e manda outra mensagem:

1. O `meta-whatsapp-webhook` chama `process-chat-flow` (sem verificar `ai_mode`)
2. O `process-chat-flow` NÃO encontra fluxo ativo (porque foi completado)
3. O `process-chat-flow` busca um novo fluxo para iniciar
4. Encontra o **Master Flow** e reinicia do começo!

**Resultado:** O bot repete "Olá! Como posso ajudar? 1️⃣ Pedidos 2️⃣ Sistema..." quando o cliente deveria estar aguardando um humano.

---

## Solução: Verificação Obrigatória de `ai_mode`

Adicionar verificação no início do `process-chat-flow` (logo após o Kill Switch) para respeitar o contrato do Super Prompt v2.3:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE DECISÃO CORRIGIDO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Mensagem chega no webhook                                               │
│     └──▶ Salva mensagem no banco                                            │
│                                                                             │
│  2. Webhook chama process-chat-flow                                         │
│     └──▶ [NOVO] Verificar ai_mode da conversa PRIMEIRO                      │
│                                                                             │
│  3. Se ai_mode = 'waiting_human':                                           │
│     └──▶ NÃO processar fluxo                                                │
│     └──▶ NÃO chamar IA                                                      │
│     └──▶ Retornar { skipAutoResponse: true, reason: 'waiting_human' }       │
│     └──▶ Mensagem fica apenas no histórico para humano ver                  │
│                                                                             │
│  4. Se ai_mode = 'copilot':                                                 │
│     └──▶ NÃO processar fluxo                                                │
│     └──▶ NÃO chamar IA automaticamente                                      │
│     └──▶ Humano já está respondendo                                         │
│                                                                             │
│  5. Se ai_mode = 'disabled':                                                │
│     └──▶ NÃO processar fluxo                                                │
│     └──▶ NÃO chamar IA                                                      │
│     └──▶ Atendimento manual                                                 │
│                                                                             │
│  6. Se ai_mode = 'autopilot':                                               │
│     └──▶ Processar fluxo normalmente (comportamento atual)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações a Implementar

### 1. Edge Function: `process-chat-flow/index.ts`

**Após a linha 294** (após o Kill Switch), adicionar verificação de `ai_mode`:

```typescript
// ============================================================
// 🛡️ PROTEÇÃO: Respeitar ai_mode da conversa (Contrato v2.3)
// Se cliente está na fila ou com humano, NÃO processar fluxo
// ============================================================
const { data: convState } = await supabaseClient
  .from('conversations')
  .select('ai_mode, assigned_to')
  .eq('id', conversationId)
  .maybeSingle();

const currentAiMode = convState?.ai_mode;

// waiting_human: Cliente na fila, aguardando humano
// copilot: Humano atendendo com sugestões da IA
// disabled: Atendimento 100% manual
if (currentAiMode === 'waiting_human' || currentAiMode === 'copilot' || currentAiMode === 'disabled') {
  console.log(`[process-chat-flow] 🛡️ PROTEÇÃO: ai_mode=${currentAiMode} - NÃO processar fluxo/IA`);
  console.log(`[process-chat-flow] 📋 assigned_to: ${convState?.assigned_to || 'null'}`);
  
  return new Response(JSON.stringify({
    useAI: false,
    aiNodeActive: false,
    skipAutoResponse: true,
    reason: `ai_mode_${currentAiMode}`,
    message: `Conversa em modo ${currentAiMode} - fluxo/IA bloqueados`
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// autopilot: IA ativa, processar normalmente
console.log(`[process-chat-flow] ✅ ai_mode=${currentAiMode} - processando fluxo`);
```

### 2. Atualizar Super Prompt v2.3

Adicionar regra explícita na documentação:

```markdown
## 14. Contrato de Proteção de Modo

### Regras obrigatórias
O motor de fluxos DEVE verificar o `ai_mode` da conversa ANTES de qualquer processamento.

### Comportamento por modo

| ai_mode | Processar Fluxo | Chamar IA | Enviar Resposta |
|---------|-----------------|-----------|-----------------|
| autopilot | ✅ Sim | ✅ Se AIResponseNode | ✅ Sim |
| waiting_human | ❌ Não | ❌ Não | ❌ Não |
| copilot | ❌ Não | ❌ Não | ❌ Não |
| disabled | ❌ Não | ❌ Não | ❌ Não |

### Justificativa
- `waiting_human`: Cliente está na fila aguardando humano. Fluxo e IA devem ficar silenciosos.
- `copilot`: Humano está atendendo. IA pode sugerir internamente, mas NÃO enviar.
- `disabled`: Atendimento 100% manual. Nenhuma automação.
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/process-chat-flow/index.ts` | Adicionar verificação de `ai_mode` após Kill Switch |
| `src/docs/SUPER_PROMPT_v2.3.md` | Adicionar seção 14 - Contrato de Proteção de Modo |

---

## Impacto

### Antes (Bug)
| Cenário | Resultado |
|---------|-----------|
| Cliente na fila manda "Oi" | ❌ Fluxo reinicia do começo |
| Cliente na fila manda "Cadê meu pedido?" | ❌ IA responde (deveria esperar humano) |
| Humano atendendo, cliente manda foto | ❌ Fluxo pode interferir |

### Depois (Corrigido)
| Cenário | Resultado |
|---------|-----------|
| Cliente na fila manda "Oi" | ✅ Mensagem salva, aguarda humano |
| Cliente na fila manda "Cadê meu pedido?" | ✅ Mensagem salva, aguarda humano |
| Humano atendendo, cliente manda foto | ✅ Foto vai pro chat, humano vê |

---

## Segurança e Conformidade

| Controle | Status |
|----------|--------|
| Fluxo não reinicia quando cliente está na fila | ✅ |
| IA não responde quando humano está atendendo | ✅ |
| Mensagens são salvas normalmente | ✅ (já funciona) |
| Compatível com Super Prompt v2.3 | ✅ |
| Sem breaking changes | ✅ |

---

## Diagrama de Sequência

```text
Cliente (na fila)         Webhook         process-chat-flow         Banco
       |                     |                    |                    |
       |--- "Oi, cadê?"----->|                    |                    |
       |                     |--save message----->|                    |
       |                     |                    |                    |
       |                     |--process flow?---->|                    |
       |                     |                    |--get ai_mode------>|
       |                     |                    |<--waiting_human----|
       |                     |                    |                    |
       |                     |<--skipAutoResponse-|                    |
       |                     |   (não enviar)     |                    |
       |                     |                    |                    |
       |        [Mensagem fica no histórico para humano ver]           |
```

---

## Compatibilidade

A mudança é **backward compatible**:
- Conversas em `autopilot` continuam funcionando normalmente
- Conversas em `waiting_human/copilot/disabled` agora respeitam o contrato
- Nenhuma tabela ou coluna nova necessária
- Deploy apenas da Edge Function

