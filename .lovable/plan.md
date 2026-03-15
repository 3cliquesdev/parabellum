

# Corrigir formulário de devolução: remover email, auto-buscar rastreio por pedido

## Problemas identificados

1. **Email desnecessário** — O cliente já está logado. O email deve ser pego automaticamente do `user.email`, sem campo visível.
2. **Busca por email no banco não faz sentido** — A tabela `deals` não indexa por email diretamente. O `lookup-order-tracking` busca contact por email → depois deal por contact_id. Mas o `external_order_id` já é único o suficiente para localizar o deal diretamente.
3. **Rastreio original não aparece corretamente** — O campo "Número do Pedido" está funcionando mas a busca depende de email que pode não bater com o contact cadastrado.

## Alterações

### 1. `NewReturnDialog.tsx`
- **Remover o campo Email** do formulário. Usar `user.email` diretamente no submit e no lookup (invisível para o cliente).
- **Chamar lookup apenas com `external_order_id`** no `onBlur` do campo Número do Pedido (sem depender de email).
- Manter a exibição do rastreio original encontrado (read-only) e o campo de rastreio reverso opcional.

### 2. `lookup-order-tracking/index.ts`
- Tornar o `email` opcional. Buscar deal diretamente por `external_order_id` sem exigir email.
- Se email vier, usar como filtro adicional (via contact_id), mas não obrigatório.
- Lógica: buscar deal por `external_order_id` → se encontrar, retornar `tracking_code`.

### 3. `register-return/index.ts`
- Já recebe email no body — continuará recebendo do frontend (invisível, vindo do `user.email`). Sem mudança necessária aqui.

## Fluxo corrigido
```text
Cliente (já logado) preenche nº pedido → onBlur → lookup-order-tracking(external_order_id)
                                                    ↓
                                         Retorna tracking_code_original
                                                    ↓
                                    Exibe rastreio original (read-only)
                                    Campo rastreio reverso (opcional)
                                                    ↓
                        Submit → register-return(email=user.email, ...)
```

