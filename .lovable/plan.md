

# Fix: Trava financeira deve avançar para o próximo nó do fluxo, não fazer handoff hardcoded

## Problema

Conversa #6FE96859: cliente enviou "Sacar saldo" no nó AI (`ia_entrada`). O nó tem `forbid_financial: true` e TEM um próximo nó no fluxo (condição de inatividade → ask_options "Você já é nosso cliente?"). Mas o sistema fez handoff hardcoded para o departamento Financeiro em vez de avançar no fluxo.

**Evidência**: `ai_events` mostra apenas um evento de `ai-autopilot-chat` (não de `process-chat-flow`), significando que o `process-chat-flow` retornou `aiNodeActive: true` (ficou no nó AI) e delegou ao autopilot, que detectou a intenção financeira e disparou o fallback de handoff no webhook.

## Causa raiz

Dois problemas encadeados:

1. **`process-chat-flow`**: Quando detecta financial intent no nó AI e encontra o próximo nó, funciona. Mas se por algum motivo NÃO detecta (race condition, estado do fluxo), retorna `aiNodeActive: true` e o autopilot assume.

2. **Webhook fallback (linhas 1133-1208)**: Quando o `process-chat-flow` é re-invocado com `forceFinancialExit` e retorna uma resposta estática (ask_options) SEM `transfer: true`, o webhook envia a mensagem e faz `continue` (linha 1124). MAS se a re-invocação falha OU se o `hasFlowContext` no autopilot retorna `false`, o fallback faz handoff hardcoded para Financeiro — ignorando completamente o fluxo.

## Solução

### 1. `process-chat-flow/index.ts` — Garantir detecção robusta

Adicionar log explícito quando `forbid_financial=true` mas financial intent NÃO é detectado, para diagnóstico futuro. Garantir que o `userMessage` está sendo testado corretamente.

### 2. `meta-whatsapp-webhook/index.ts` — Remover fallback hardcoded de Financeiro

O fallback nas linhas 1133-1208 faz handoff hardcoded para Financeiro mesmo quando o fluxo tem um próximo nó. Deve ser alterado para:

- Se `hasFlowContext === true` e a re-invocação do `process-chat-flow` retornou 200: confiar na resposta do flow (já faz `continue` na linha 1124)
- Se `hasFlowContext === true` e a re-invocação FALHOU: tentar uma segunda vez com retry, e só fazer fallback se falhar duas vezes
- Se `hasFlowContext === false`: manter o handoff hardcoded (não há fluxo para avançar)
- **Crítico**: Mover o bloco de fallback (linhas 1133-1208) para dentro de um `if (!autopilotData?.hasFlowContext)`, evitando que conversas COM fluxo ativo recebam handoff hardcoded

### 3. Corrigir conversa #6FE96859

SQL para resetar a conversa: devolver ao nó AI ou avançar para o ask_options correto no fluxo.

### Arquivos alterados
- `supabase/functions/meta-whatsapp-webhook/index.ts` — reestruturar fallback financeiro para respeitar fluxo
- `supabase/functions/process-chat-flow/index.ts` — adicionar logs de diagnóstico

### Sem risco de regressão
- Conversas SEM fluxo ativo continuam com handoff hardcoded para Financeiro (comportamento atual)
- Conversas COM fluxo ativo passam a respeitar o próximo nó do fluxo
- O `continue` na linha 1124 já funciona quando a re-invocação sucede

