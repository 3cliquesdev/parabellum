

# Emails de Status, SLA de 30 dias e CRUD de Motivos de Devolução

## 1. Emails automáticos por mudança de status

### Edge function `notify-return-status` (nova)
- Recebe `return_id`, `new_status`, `return_data` (pedido, motivo, descrição, rastreios, protocolo)
- Monta HTML com todos os dados da devolução
- Templates por status:
  - **`pending` (criada)**: "Sua devolução foi recebida" — já existe no `register-return`, mas falta para devoluções criadas pelo admin
  - **`refunded`**: "Seu reembolso foi processado"
  - **`rejected`**: "Sua devolução foi recusada" (com motivo/descrição)
- Envia via `send-email` com `useRawHtml: true`

### Hook `useUpdateReturnStatus` (editar)
- Após atualizar o status no banco, chamar `supabase.functions.invoke("notify-return-status")` passando os dados completos do return
- Só dispara para `refunded` e `rejected` (o `pending`/criado já é tratado no `register-return`)

### Hook `useCreateAdminReturn` (editar)
- Após inserir com sucesso, se o return tiver `registered_email` ou `contact_id`, invocar `notify-return-status` com status `pending`

---

## 2. SLA de 30 dias — Status `archived`

### Mudanças no schema
- Adicionar status `archived` ao sistema (não precisa de coluna nova, é apenas um valor de status)

### Configuração
- Adicionar constante `STATUS_CONFIG.archived` com label "Arquivada" e variant adequado
- No `ReturnDetailsDialog`, adicionar opção "Arquivada" ao select de status
- No `ReturnsManagement`, adicionar filtro "Arquivada"

### Arquivamento manual
- No `ReturnDetailsDialog`, exibir alerta visual quando `created_at` > 30 dias: "Esta devolução tem mais de 30 dias. Recomenda-se arquivar — reembolso não será mais possível."
- Admin arquiva manualmente mudando status para `archived`
- Quando status = `archived`, desabilitar opção `refunded` no select

---

## 3. CRUD de Motivos de Devolução

### Nova tabela `return_reasons`
```sql
CREATE TABLE return_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```
- Seed com os motivos atuais (defeito, arrependimento, troca, nao_recebido, outro)
- RLS: leitura pública (anon+authenticated), escrita só authenticated

### Hook `useReturnReasons`
- Query para listar motivos ativos (ordenados por `sort_order`)
- Mutations para criar, editar e deletar (soft delete via `is_active = false`)

### Página/Seção de configuração
- Nova aba ou card dentro das Settings (ou dentro de SLASettings com uma tab "Devoluções")
- Tabela editável: label, key, ativo/inativo, ordenação
- Botão "Novo Motivo" com dialog simples (key + label)
- Edição inline ou via dialog

### Substituir `REASON_LABELS` hardcoded
- `NewReturnDialog`, `AdminReturnDialog`, `ReturnDetailsDialog`, `ReturnsList`, `ReturnsManagement` — todos passam a consumir `useReturnReasons()` em vez do objeto estático
- Edge function `register-return` — validar reasons dinâmicamente consultando a tabela `return_reasons` em vez de array hardcoded

---

## Arquivos impactados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/notify-return-status/index.ts` | **Novo** — edge function de email |
| `src/hooks/useReturns.ts` | Chamar notify após update/create |
| `src/hooks/useClientReturns.ts` | Remover `REASON_LABELS` hardcoded, adicionar `archived` ao `STATUS_CONFIG` |
| `src/hooks/useReturnReasons.ts` | **Novo** — CRUD de motivos |
| `src/components/support/ReturnDetailsDialog.tsx` | Alerta 30 dias, bloquear refunded se archived |
| `src/components/support/ReturnsManagement.tsx` | Filtro archived |
| `src/components/support/ReturnReasonsSettings.tsx` | **Novo** — UI de CRUD |
| `src/components/client-portal/NewReturnDialog.tsx` | Usar `useReturnReasons` |
| `src/components/support/AdminReturnDialog.tsx` | Usar `useReturnReasons` |
| `supabase/functions/register-return/index.ts` | Validar motivos via DB |
| Migration SQL | Criar tabela `return_reasons` + seed |

