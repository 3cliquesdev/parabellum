

# Fix: Trava financeira deve avançar para próximo nó do fluxo

## Problema

Quando a trava financeira (`forbid_financial`) é ativada dentro de um nó `ai_response`, o `ai-autopilot-chat` faz um **hard transfer** direto:
- Define `ai_mode = waiting_human` (linha 1312)
- Mata o fluxo como `transferred` (linha 1334)
- Retorna `financialBlocked: true`

O webhook vê `financialBlocked`, envia mensagem genérica de handoff e faz `continue` — **ignorando completamente o próximo nó do fluxo**.

Isso impede que o designer de fluxo controle o que acontece após detecção financeira (ex: menu, pergunta, transfer para departamento específico, etc).

## Causa raiz

Duas camadas de interceptação competem:
1. `process-chat-flow` (linha 1168): detecta financeiro → avança para próximo nó ✅
2. `ai-autopilot-chat` (linha 1303): detecta financeiro → hard transfer ❌

Quando `process-chat-flow` retorna `aiNodeActive: true` (ex: a primeira interação no nó AI, ou timing de chamadas), o webhook chama `ai-autopilot-chat` que faz o hard transfer, bypassando o avanço do fluxo.

## Solução (3 arquivos)

### 1. `ai-autopilot-chat/index.ts` — Remover hard transfer quando em flow context

Quando `financialBlocked` E existe `flow_context`, **NÃO** fazer:
- `update conversations set ai_mode = waiting_human` 
- `update chat_flow_states set status = transferred`

Apenas retornar `financialBlocked: true` + `exitKeywordDetected: true` para que o webhook re-invoque o motor de fluxo.

### 2. `meta-whatsapp-webhook/index.ts` — Re-invocar process-chat-flow ao receber financialBlocked

Quando `autopilotData.financialBlocked === true`, em vez de enviar mensagem genérica e `continue`:
- Chamar `process-chat-flow` novamente com flag `forceFinancialExit: true`
- Processar a resposta normalmente (transfer, message, end, etc.)
- Só fazer hard transfer se process-chat-flow não retornar próximo nó

### 3. `process-chat-flow/index.ts` — Aceitar flag `forceFinancialExit`

Quando `forceFinancialExit: true` no request body:
- No bloco `ai_response`, tratar como `financialIntentMatch = true` independente do regex
- Avançar para próximo nó normalmente via `findNextNode`

## Resultado

- Financial guard ativa → fluxo avança para o próximo nó (transfer, menu, condition, etc.)
- O designer do fluxo mantém controle total sobre o destino pós-trava
- Se não houver próximo nó, aí sim completa o fluxo normalmente
- Zero regressão em fluxos sem trava financeira

