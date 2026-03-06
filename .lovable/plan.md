

# Ajustes finos no ContactInfoCard — Organização

Arquivo unico afetado: `src/components/ContactInfoCard.tsx`

## Alteracoes

### 1. Debounce na busca (300ms)
- Importar `useDebouncedValue` (ja existe em `src/hooks/useDebouncedValue.ts`)
- Usar `debouncedOrgSearch = useDebouncedValue(orgSearchTerm, 300)` como queryKey e no `enabled`

### 2. Evitar re-vincular a mesma org
- No popover de resultados, se `org.id === contact.organization_id`: mostrar badge "Atual" e desabilitar o botao

### 3. Confirmacao para "Trocar" org
- Adicionar estado `confirmSwitch` com `{ orgId, orgName }` 
- Ao clicar numa org diferente no popover (quando contato ja tem org), em vez de chamar `handleSelectOrg` direto, setar `confirmSwitch`
- Novo `AlertDialog`: "Esse contato vai sair de **Org A** e entrar em **Org B** — confirmar?"
- Ao confirmar, executar `linkOrgMutation.mutate(confirmSwitch.orgId)`

### 4. Invalidar queries adicionais
- No `onSuccess` da mutation, alem de `["contact", contact.id]`, invalidar:
  - `["organizationContacts"]` (wildcard — cobre qualquer orgId)
  - `["organizations"]`

### 5. Placeholder atualizado
- Mudar de "Buscar organização..." para "Digite ao menos 2 caracteres..."

## Sem novos arquivos, sem migrations, sem mudanca de RLS

