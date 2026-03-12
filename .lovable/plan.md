

# Fix: OTP Node deve usar dados do validate_customer

## Problema Atual

O nó OTP **sempre** pede o email ao cliente, mesmo quando o `validate_customer` já rodou antes no fluxo e já temos:
- `customer_validated = true/false`
- `customer_email_found = "email@..."` 
- `customer_name_found = "Nome"`

Isso é redundante e ruim para a UX.

## Nova Logica

Quando o nó OTP inicializa, verificar se `collectedData.customer_validated` já existe:

**Se `customer_validated === true`:**
- Pular `ask_email` completamente
- Usar `customer_email_found` do collectedData como email
- Enviar OTP direto para esse email
- Informar: "Enviamos um código de verificação para seu email de cadastro. Digite o código:"
- Ir direto para `wait_code`

**Se `customer_validated === false`:**
- Setar `__otp_result = 'not_customer'` e `customer_verified = false`
- Avançar para o próximo nó imediatamente (que deve ser um condition/transfer para o comercial)
- Mensagem: "Você não foi identificado como cliente. Vou encaminhar para nosso time comercial."

**Se `customer_validated` não existe (nó OTP sem validate_customer antes):**
- Comportamento atual mantido (ask_email)

## Mudancas no Codigo

**Arquivo:** `supabase/functions/process-chat-flow/index.ts`

### 1. Todos os pontos de inicializacao do OTP (6 locais)

Linhas ~1368, ~2509, ~2665, ~3655, ~4903, ~5122 — onde `__otp_step = 'ask_email'` é setado.

Em cada um, antes de setar `ask_email`, checar:

```text
if collectedData.customer_validated === true:
  → usar customer_email_found, enviar OTP, setar __otp_step = 'wait_code'
  → responder com msg de código enviado
  
if collectedData.customer_validated === false:
  → setar __otp_result = 'not_customer', customer_verified = false
  → avançar para próximo nó (findNextNode)
  
else (undefined):
  → manter comportamento atual (ask_email)
```

### 2. Handler `ask_email` (L1615) — sem mudanca

Se por algum motivo chegar em `ask_email`, comportamento atual permanece como fallback.

### Resumo

- 6 pontos de inicializacao do OTP recebem a logica de pre-check
- Zero mudancas no handler de `wait_code` ou `confirm_email`
- Usa dados já existentes no `collectedData` do validate_customer
- Fallback para comportamento atual se validate_customer não rodou

