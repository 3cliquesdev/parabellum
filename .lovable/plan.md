

# Plano: Saídas Condicionais pós-OTP no Nó AI Response

## Problema

Atualmente, após o OTP inline (verificado ou falho), o motor usa o mesmo `savedPath` (ex: "saque") para avançar. Não há como direcionar clientes verificados para um caminho e não-verificados para outro no canvas.

## Solução

Adicionar 2 novos source handles no nó AI Response: `otp_verified` e `otp_failed`. Eles só aparecem visualmente quando `require_otp_for_financial = true`. O motor usará esses handles em vez do `savedPath` após OTP.

```text
AI Response (Triagem)
  ├── 💰 saque ─────────→ (sem OTP, caminho direto)
  ├── ✅ otp_verified ──→ Ticket Saque → Transfer Financeiro
  └── ❌ otp_failed ────→ Transfer Suporte / Mensagem de erro
```

## Alterações

### 1. Frontend — `AIResponseNode.tsx`
- Adicionar 2 handles condicionais (`otp_verified` e `otp_failed`) que renderizam apenas quando `data.require_otp_for_financial === true`
- Labels visuais: "✅ OTP ok" (verde) e "❌ OTP falhou" (vermelho)
- Posicionados abaixo dos handles existentes ou reorganizados

### 2. Frontend — `AIResponseNodeData` interface
- Adicionar `require_otp_for_financial?: boolean` à interface para que o nó saiba quando mostrar os handles

### 3. Backend — `process-chat-flow/index.ts` (OTP success ~L3276)
- Onde atualmente faz `findNextNode(flowDef, currentNode, savedPath)`:
  - Primeiro tentar `findNextNode(flowDef, currentNode, 'otp_verified')`
  - Se não encontrar edge, fallback para `findNextNode(flowDef, currentNode, savedPath)` (compatibilidade)

### 4. Backend — `process-chat-flow/index.ts` (OTP failed ~L3440)
- Onde atualmente faz `findNextNode(flowDef, currentNode, savedPath)`:
  - Primeiro tentar `findNextNode(flowDef, currentNode, 'otp_failed')`
  - Se não encontrar edge, fallback para `findNextNode(flowDef, currentNode, savedPath)` (compatibilidade)

### 5. Backend — `process-chat-flow/index.ts` (OTP not_customer ~L3170)
- Usar `findNextNode(flowDef, currentNode, 'otp_failed')` com fallback

## Compatibilidade

Fluxos existentes que não conectaram os novos handles continuarão funcionando normalmente via fallback para `savedPath`.

