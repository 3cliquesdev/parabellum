

# Configuracao de Campos Obrigatorios no Formulario de Ticket

## Resumo

Adicionar uma secao de configuracao na pagina "Depart. e Operacoes" que permite ao admin definir quais campos do formulario de criacao de ticket sao **obrigatorios** ou **opcionais**. Isso usa a tabela `system_configurations` ja existente (key/value).

## Campos configuraveis

| Campo | Key no banco | Padrao atual |
|---|---|---|
| Departamento Responsavel | `ticket_field_department_required` | false (opcional) |
| Operacao | `ticket_field_operation_required` | true (obrigatorio) |
| Origem do Ticket | `ticket_field_origin_required` | true (obrigatorio) |
| Categoria | `ticket_field_category_required` | false (opcional) |
| Cliente | `ticket_field_customer_required` | false (opcional) |
| Responsavel (Atribuir a) | `ticket_field_assigned_to_required` | false (opcional) |

## O que muda

### 1. Seed das configuracoes no banco

Inserir registros na tabela `system_configurations` com os valores padrao, usando `ON CONFLICT DO NOTHING` para nao sobrescrever se ja existir.

```sql
INSERT INTO system_configurations (key, value, description, category)
VALUES
  ('ticket_field_department_required', 'false', 'Departamento responsavel obrigatorio na criacao de ticket', 'tickets'),
  ('ticket_field_operation_required', 'true', 'Operacao obrigatoria na criacao de ticket', 'tickets'),
  ('ticket_field_origin_required', 'true', 'Origem obrigatoria na criacao de ticket', 'tickets'),
  ('ticket_field_category_required', 'false', 'Categoria obrigatoria na criacao de ticket', 'tickets'),
  ('ticket_field_customer_required', 'false', 'Cliente obrigatorio na criacao de ticket', 'tickets'),
  ('ticket_field_assigned_to_required', 'false', 'Responsavel obrigatorio na criacao de ticket', 'tickets')
ON CONFLICT (key) DO NOTHING;
```

### 2. Novo hook: `useTicketFieldSettings.tsx`

- Busca todas as configs com category = 'tickets' e key LIKE 'ticket_field_%_required'
- Retorna um objeto tipado: `{ department: boolean, operation: boolean, origin: boolean, category: boolean, customer: boolean, assigned_to: boolean }`
- Mutation para atualizar cada campo individualmente

### 3. Nova aba "Campos" na pagina Departments.tsx

- Aba adicional ao lado de Departamentos, Operacoes, Categorias e Origens
- Lista cada campo com:
  - Nome do campo
  - Toggle (Switch) obrigatorio/opcional
  - Descricao curta
- Salva automaticamente ao clicar no toggle (sem botao "Salvar")

### 4. Atualizar CreateTicketDialog.tsx

- Importar `useTicketFieldSettings()`
- Usar as configs para:
  - Mostrar asterisco (*) nos labels de campos obrigatorios
  - Mostrar "(opcional)" nos labels de campos nao obrigatorios
  - Ajustar `canSubmit` dinamicamente baseado nos campos marcados como obrigatorios
- Nenhum campo e removido do formulario - apenas muda se e obrigatorio ou nao

### 5. Logica de validacao dinamica

```typescript
// Exemplo de canSubmit dinamico
const canSubmit =
  subject.trim() &&
  (!fieldSettings.operation || operationId) &&
  (!fieldSettings.origin || originId) &&
  (!fieldSettings.department || departmentId) &&
  (!fieldSettings.category || category) &&
  (!fieldSettings.customer || customerId) &&
  (!fieldSettings.assigned_to || assignedTo) &&
  !createTicket.isPending;
```

## Arquivos envolvidos

| Arquivo | Acao |
|---|---|
| Migracao SQL | Seed das configs |
| `src/hooks/useTicketFieldSettings.tsx` | **Novo** - hook de leitura/escrita |
| `src/pages/Departments.tsx` | Nova aba "Campos" |
| `src/components/support/CreateTicketDialog.tsx` | Validacao dinamica |

## Impacto

- Zero regressao: valores padrao mantêm o comportamento atual (Operacao e Origem obrigatorios, resto opcional)
- Admin pode mudar a qualquer momento sem deploy
- Formulario reflete as configs em tempo real via React Query
