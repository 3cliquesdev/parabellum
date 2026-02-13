
# Obrigatoriedade de Tags nos Tickets

## Situacao Atual

- O sistema de "Campos Obrigatorios" existe em `useTicketFieldSettings.tsx` com 6 campos: department, operation, origin, category, customer, assigned_to
- **Tags NAO estao incluidas** nesse sistema -- sempre aparecem como "(opcional)"
- O `handleStatusChange` em `TicketDetails.tsx` (linha 107) muda o status diretamente sem nenhuma validacao de tags
- A pagina de configuracao (`Departments.tsx`, aba "Campos") lista os 6 campos mas nao inclui tags

## O Que Sera Feito

### 1. Adicionar "tags" ao sistema de campos obrigatorios

**Arquivo: `src/hooks/useTicketFieldSettings.tsx`**

- Adicionar `tags: boolean` na interface `TicketFieldSettings`
- Adicionar `tags: "ticket_field_tags_required"` no `FIELD_KEYS`
- Default: `tags: false` (opcional por padrao, admin ativa quando quiser)

### 2. Validar tags na criacao do ticket

**Arquivo: `src/components/support/CreateTicketDialog.tsx`**

- Na variavel `canSubmit` (linha 179), adicionar: `(!fieldSettings.tags || selectedTagIds.length > 0)`
- No label de Tags (linha 388-391), trocar "(opcional)" por indicador dinamico baseado em `fieldSettings.tags` (usando o helper `fieldLabel` ja existente)

### 3. Bloquear encerramento de ticket sem tags

**Arquivo: `src/components/TicketDetails.tsx`**

- Importar `useTicketFieldSettings` e `useTicketTags`
- No `handleStatusChange` (linha 107): antes de chamar `updateTicket.mutate`, verificar se o status destino e "resolved" ou "closed" e se tags sao obrigatorias
- Se obrigatorio e ticket nao tem tags: exibir toast de erro e bloquear a mudanca
- Manter todos os outros status changes livres (open, in_progress, waiting_customer, etc.)

### 4. Adicionar toggle na pagina de configuracao

**Arquivo: `src/pages/Departments.tsx`**

- Na lista de campos (linha 330-336), adicionar: `{ field: "tags" as const, label: "Tags", desc: "Etiquetas de classificacao do ticket" }`
- O Switch ja funciona automaticamente via `updateField`

## Fluxo Resultante

```text
Admin ativa "Tags obrigatoria" na aba Campos
                |
    +-----------+-----------+
    |                       |
Criacao de Ticket     Encerramento (resolved/closed)
    |                       |
Botao "Criar"          handleStatusChange
bloqueado se             verifica tags
tag_ids vazio            antes de aplicar
```

## Arquivos Modificados

1. `src/hooks/useTicketFieldSettings.tsx` -- Adicionar campo `tags` (3 linhas)
2. `src/components/support/CreateTicketDialog.tsx` -- Validar `canSubmit` + label dinamico (2 linhas)
3. `src/components/TicketDetails.tsx` -- Bloquear resolved/closed sem tags (~15 linhas)
4. `src/pages/Departments.tsx` -- Adicionar toggle de tags (1 linha na lista)

## Zero Regressao

- Default `tags: false` = comportamento identico ao atual
- Campos existentes (department, operation, etc.) nao sao alterados
- Fluxos de status que nao sao resolved/closed nao sao afetados
- Hook `useTicketTags` ja existe e e reutilizado (sem nova query)
