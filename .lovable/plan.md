

# Triagem Silenciosa Unificada — Sempre Validar pela Base Kiwify

## Problema Atual
A validação por telefone/CPF no autopilot **só roda quando o contato NÃO tem email** (condição na linha 2267: `if (!contactHasEmailForKiwify)`). Isso significa que se o contato já tem email, a validação Kiwify por telefone e CPF é pulada. O correto é **sempre validar**, usando os 3 dados disponíveis (telefone, email, CPF), tudo contra a base `kiwify_events`.

## Mudanças

### 1. `ai-autopilot-chat/index.ts` — Remover condição restritiva e unificar validação
- **Remover** a condição `if (!contactHasEmailForKiwify)` que bloqueia a validação Kiwify
- **Trocar** por: `if (!contact.kiwify_validated)` — só pula se já está validado
- **Adicionar email** ao array de validationPromises (chamar `verify-customer-email` junto com phone e CPF)
- Executar os 3 em paralelo: phone + email + CPF → se qualquer um retornar `found: true`, marcar como cliente
- **Remover** a mensagem de boas-vindas verbosa (triagem silenciosa = sem perguntar, sem anunciar)

### 2. `process-chat-flow/index.ts` — Mesma lógica no nó AI Response
- Já está correto (linhas 1213-1261), executa phone/email/CPF conforme `validate_fields`
- Sem mudanças necessárias

### 3. `BehaviorControlsSection.tsx` — Sem mudanças
- Toggle e checkboxes já estão corretos

### 4. `validate-by-cpf/index.ts` e `validate-by-kiwify-phone/index.ts` — Sem mudanças
- Já buscam na base `kiwify_events` corretamente

## Resumo das Mudanças
- **1 arquivo**: `ai-autopilot-chat/index.ts`
  - Condição `!contactHasEmailForKiwify` → `!contact.kiwify_validated`
  - Adicionar `verify-customer-email` ao array de promises paralelas
  - Remover mensagem de boas-vindas verbosa (silencioso = só marca como cliente e continua)

## Resultado
Todo contato que entra e **não está validado ainda** passa por triagem silenciosa:
- Telefone → `validate-by-kiwify-phone` (busca compras pelo número)
- Email → `verify-customer-email` (busca na base kiwify_events)
- CPF → `validate-by-cpf` (busca documento na base kiwify_events)

Se qualquer um encontrar, marca `kiwify_validated = true` e trata como cliente — sem perguntar nada.

