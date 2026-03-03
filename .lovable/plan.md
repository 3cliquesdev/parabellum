

# Nó "Verificar Cliente + OTP" para o Master Flow

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Fluxo desejado

```text
[Ask Email] → [Verify Customer + OTP] 
                 ├─ É cliente (OTP verificado) → [Create Ticket] → ...
                 ├─ Email não encontrado → [AI: "Email correto? Não encontramos..."] → loop ou comercial
                 └─ Não é cliente → [Message: "Vou passar para o time comercial"] → [Transfer: Comercial]
```

## O que já existe

- **`validate_customer`**: Valida por phone/email/CPF na Kiwify silenciosamente, sem OTP
- **`send-verification-code`**: Edge function que envia OTP por email (6 dígitos)
- **`verify-code`**: Edge function que valida o código digitado
- **`verify-customer-email`**: Edge function que verifica se email existe como customer

O nó `validate_customer` atual faz validação silenciosa (sem interação). Precisamos de um **novo nó** que combine verificação de identidade + OTP interativo dentro do fluxo.

## Plano de implementação

### 1. Novo nó visual: `verify_customer_otp`

**Novo arquivo:** `src/components/chat-flows/nodes/VerifyCustomerOTPNode.tsx`
- Ícone ShieldCheck (roxo/azul)
- Propriedades configuráveis:
  - `message_ask_email`: mensagem pedindo email (default: "Para verificar sua identidade, me informe seu email cadastrado")
  - `message_otp_sent`: mensagem quando OTP enviado (default: "Enviamos um código de 6 dígitos para {{email}}. Digite o código:")
  - `message_not_found`: mensagem quando email não encontrado (default: "Não encontramos este email em nossa base. O email está correto?")
  - `message_not_customer`: mensagem quando não é cliente (default: "Vou encaminhar para nosso time comercial")
  - `save_verified_as`: variável (default: `customer_verified`)
  - `max_attempts`: máximo de tentativas OTP (default: 3)

**Novo arquivo:** `src/components/chat-flows/VerifyCustomerOTPPropertiesPanel.tsx`

### 2. Registrar no editor e exports

- Adicionar em `src/components/chat-flows/nodes/index.ts`
- Registrar em `ChatFlowEditor.tsx` no `chatFlowNodeTypes` e na sidebar
- Adicionar em `ChatFlowNodeWrapper.tsx` no type union

### 3. Backend: Handler no `process-chat-flow`

O nó opera como uma **máquina de estados interna** com sub-estados salvos no `collectedData`:

```text
Sub-estados (__otp_step):
1. "ask_email"     → Pede email, aguarda resposta
2. "check_email"   → Verifica email no banco (verify-customer-email)
   - found → envia OTP (send-verification-code), vai para "wait_code"
   - not_found → envia msg "email correto?", vai para "confirm_email"
3. "confirm_email"  → Usuário confirma ou corrige email
   - se parece email novo → volta para "check_email"
   - se confirma que não é cliente → seta resultado "not_customer", avança
4. "wait_code"     → Aguarda código OTP
   - correto → seta resultado "verified", avança
   - incorreto → retry ou falha
```

**Variáveis salvas no `collectedData`:**
- `__otp_step`: sub-estado atual
- `__otp_email`: email informado
- `__otp_attempts`: tentativas
- `customer_verified`: resultado final (`true`/`false`)
- `customer_verified_email`: email verificado
- `customer_verified_name`: nome do cliente

**Saídas para condition node:**
- `customer_verified = true` → cliente autenticado via OTP
- `customer_verified = false` + `__otp_result = not_customer` → não é cliente
- `customer_verified = false` + `__otp_result = failed` → falhou OTP

### 4. Integração com Create Ticket (próximo passo)

Após este nó, o fluxo pode ramificar:
- **Verificado** → nó `create_ticket` (a implementar depois)
- **Não é cliente** → nó `transfer` para departamento Comercial
- **Email incorreto** → loop de retry

## Sem risco de regressão
- Nó `validate_customer` existente continua funcionando (validação silenciosa)
- Edge functions `send-verification-code` e `verify-code` já existem e são reutilizadas
- Nenhum código existente é alterado, apenas adições

