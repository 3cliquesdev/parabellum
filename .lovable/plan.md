

# Diagnóstico: Conversa 0E680F44 Abandonada

## Root Cause Identificado

A IA **não gerou** a mensagem "Desculpe, estou com dificuldades técnicas...". Essa mensagem é **hardcoded no error handler** (linha 9386) — a chamada à API de IA falhou com erro técnico, ativando o **protocolo de emergência**.

O protocolo de emergência (linhas 9367-9507) faz:
1. Salva mensagem hardcoded: *"Desculpe, estou com dificuldades técnicas no momento. Vou te conectar com um atendente humano!"*
2. **Força `ai_mode = 'copilot'`** (linha 9452) — **SEM verificar se há fluxo ativo**
3. Roteia para fila humana

**Violação de soberania do fluxo**: A conversa tinha um fluxo ativo (`ia_entrada`), mas o error handler ignorou o `flow_context` e forçou copilot. Com `copilot` + sem agente atribuído → mensagem "Sério?" ficou sem resposta.

**Evidência nos logs:**
```
process-buffered-messages: Conv 0e680f44 no longer autopilot (copilot) — marking processed
```

Estado atual: `ai_mode: copilot`, `assigned_to: null`, fluxo `active` em `ia_entrada`.

## Correções (2 bugs)

### Bug 1: Error handler ignora flow sovereignty
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts` (linhas 9367-9507)

Quando há fluxo ativo, o error handler deve:
- **Manter `ai_mode = 'autopilot'`** (não forçar copilot)
- Enviar mensagem de retry genérica: *"Entendi! Poderia me dar mais detalhes sobre o que precisa?"* em vez da promessa de transferência
- Retornar `{ status: 'fallback', flow_context_preserved: true }` para que o webhook mantenha o fluxo

Lógica:
```typescript
// Linha ~9447: Antes do handoff, verificar fluxo ativo
const hasActiveFlow = !!flow_context;
if (hasActiveFlow) {
  // NÃO mudar ai_mode — manter autopilot, manter fluxo ativo
  console.log('[ai-autopilot-chat] ⚠️ Erro técnico + flow_context ativo → mantendo autopilot');
  // Mensagem de retry sem promessa de transferência
  fallbackMessage = 'Entendi! Poderia me dar mais detalhes sobre o que precisa? Estou aqui para ajudar.';
} else {
  // Comportamento atual: copilot + handoff
  await supabaseClient.from('conversations')
    .update({ ai_mode: 'copilot', department: ... })
    .eq('id', conversationId);
}
```

### Bug 2: FALLBACK_STRIP_PATTERNS incompletos
**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts` (linhas 8546-8552)

Adicionar pattern para "conectar com":
```typescript
/(vou|irei|posso)\s+(te\s+)?(conectar|direcionar|redirecionar)\s+(com|a)\s+\w+/gi,
```

Isso garante que, se futuramente a IA gerar "Vou te conectar com um atendente", a frase seja removida ao invés de ser enviada ao cliente.

### Impacto
- Conversas com fluxo ativo não serão mais "abandonadas" por erros técnicos da IA
- O fluxo se mantém soberano mesmo em cenários de falha
- Zero breaking changes para conversas sem fluxo (comportamento atual preservado)

