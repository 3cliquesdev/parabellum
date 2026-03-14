

# Plano: OTP Integrado no Nó de IA (para intents Financeiro/Saque)

## Problema Atual

O V4 não tem nó `verify_customer_otp` no canvas. Quando a IA detecta intent `financeiro` ou `saque`, o fluxo avança direto para o próximo nó (ticket/transfer) **sem verificar a identidade do cliente**.

## Solução

Adicionar um **toggle "Exigir OTP"** no painel do nó AI Response, que quando ativado para as saídas `financeiro` e/ou `saque`, intercepta o avanço do fluxo e executa a máquina de estados OTP **inline** antes de seguir para o próximo nó.

## Arquitetura

```text
Cliente diz "quero sacar"
   ↓
IA detecta → [[FLOW_EXIT:saque]]
   ↓
process-chat-flow detecta saqueIntentMatch + require_otp_for_financial=true
   ↓
Em vez de avançar para o próximo nó, ENTRA no sub-fluxo OTP inline:
   1. Pede email → 2. Verifica na base → 3. Envia OTP → 4. Valida código
   ↓
Se verificado → avança normalmente (path=saque) com customer_verified=true
Se falhou → avança com customer_verified=false (para tratamento condicional)
```

## Alterações

### 1. Frontend — BehaviorControlsSection.tsx
Adicionar um toggle **"🔐 Exigir verificação OTP"** que aparece condicionalmente quando `forbidFinancial` ou `forbidSaque` estão ativados. Campos:
- `require_otp_for_financial` (boolean) — toggle principal
- `otp_message_ask_email` — mensagem customizável para pedir email
- `otp_message_sent` — mensagem quando OTP enviado
- `otp_max_attempts` — máximo de tentativas (default 3)

### 2. Frontend — AIResponsePropertiesPanel.tsx
Sem alteração (BehaviorControlsSection já é renderizado dentro dele).

### 3. Backend — process-chat-flow/index.ts
Na seção de exit por intent (~linha 3608-3706), quando `financialIntentMatch || saqueIntentMatch` **E** `currentNode.data?.require_otp_for_financial === true`:

- **Em vez de avançar**, setar `collectedData.__otp_step = 'ask_email'` e `collectedData.__otp_from_ai_intent = path`
- Mudar status para `waiting_input`
- Retornar mensagem pedindo email (reutilizando a mesma lógica OTP que já existe no handler `verify_customer_otp` ~linha 1780-2050)

Adicionar um **novo bloco** no handler do nó `ai_response` (quando `collectedData.__otp_step` existe e `currentNode.type === 'ai_response'`):
- Executar a mesma máquina de estados OTP (ask_email → check_email → confirm_email → wait_code)
- Quando concluído, restaurar o `path` salvo em `__otp_from_ai_intent` e avançar normalmente

### 4. Backend — Reutilização de código
A lógica OTP (~270 linhas) já existe no handler de `verify_customer_otp`. Vou **extrair** as partes reutilizáveis (verificar email, enviar código, validar código) em funções helper para evitar duplicação.

### 5. Passagem de dados para ai-autopilot-chat
Adicionar `require_otp_for_financial` no objeto retornado por `process-chat-flow` → `ai-autopilot-chat` (linhas 4430-4440 e 3727-3755) para que o contexto esteja disponível.

## Resumo de Arquivos

| Arquivo | Alteração |
|---|---|
| `src/components/chat-flows/panels/BehaviorControlsSection.tsx` | Toggle OTP + mensagens configuráveis |
| `supabase/functions/process-chat-flow/index.ts` | Interceptar exit financeiro/saque → sub-fluxo OTP inline |

## Escopo Controlado
- OTP só é ativado para intents `financeiro` e `saque` (configurável pelo toggle)
- Reutiliza as edge functions `verify-customer-email` e `send-verification-code` já existentes
- Variáveis `customer_verified`, `customer_verified_email`, `__otp_result` são salvas no `collectedData` para uso em condições subsequentes

