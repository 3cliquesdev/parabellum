

# Plano: Upgrade "Nível Produto" para Sales Channels

## Análise de Contexto

O sistema e single-tenant (um CRM usado por uma empresa). A tabela `organizations` representa empresas-clientes no CRM, nao tenants. Portanto, `organization_id` em `sales_channels` nao se aplica -- canais de venda sao configuracoes globais gerenciadas por managers.

Vou implementar os upgrades que fazem sentido neste contexto:

## 1. Migration: Novos campos em `sales_channels`

Adicionar via ALTER TABLE:

- `sort_order int DEFAULT 0` -- ordenacao no select
- `updated_at timestamptz DEFAULT now()` -- rastreabilidade
- `description text NULL` -- ajuda o gerente

Criar trigger para `updated_at` automatico.

Criar indice: `(is_active, sort_order, name)` para performance no select.

## 2. Migration: Campos dedicados em `deals`

Adicionar campos na tabela `deals` para auditoria sem depender de metadata:

- `sales_channel_id uuid NULL REFERENCES sales_channels(id)`
- `sales_channel_name text NULL` -- snapshot do nome no momento
- `external_order_id text NULL`
- `company_contact_id uuid NULL REFERENCES contacts(id)` -- FK para empresa
- `company_name_snapshot text NULL` -- nome no momento do fechamento

## 3. Hook `useSalesChannels` -- ordenacao por sort_order

Atualizar query para `order by sort_order, name` (ja esta parcialmente assim, confirmar).

## 4. `ValidateWonDealDialog.tsx` -- empresa com autocomplete

- Trocar campo texto "Empresa" por autocomplete de contacts (tipo empresa/organizacao)
- Botao "Cadastrar nova" inline
- Enviar `company_contact_id` + `company_name_snapshot` no payload

Atualizar interface `onManualSuccess` para incluir `company_contact_id`.

## 5. `Deals.tsx` -- salvar nos campos dedicados do deal

Atualizar `handleManualWonSuccess`:
- Salvar `sales_channel_id`, `sales_channel_name` (snapshot), `external_order_id`, `company_contact_id`, `company_name_snapshot` diretamente no update do deal
- Manter log de interacao como esta

## 6. `SalesChannelsSettingsPage.tsx` -- novos campos

Adicionar ao CRUD:
- Campo `description` (textarea)
- Campo `sort_order` (input numerico)
- Ordenar tabela por sort_order

## 7. Backend validation (requires_order_id)

No `handleManualWonSuccess` (Deals.tsx), antes de salvar, buscar o canal do banco e validar server-side se `requires_order_id=true` e `external_order_id` esta vazio. Isso evita bypass via request direto.

Alternativa mais robusta: criar edge function `close-deal-manual` que faz a validacao no backend. Mas como o update do deal ja passa por RLS e o handler e no frontend com dados controlados, a validacao dupla (frontend + re-check no handler) e suficiente para este caso.

## Arquivos a alterar

| Arquivo | Acao |
|---|---|
| Migration SQL | ALTER TABLE sales_channels + deals (novos campos) |
| `src/hooks/useSalesChannels.tsx` | Order by sort_order |
| `src/components/deals/ValidateWonDealDialog.tsx` | Autocomplete empresa, payload expandido |
| `src/pages/Deals.tsx` | Salvar campos dedicados no deal |
| `src/pages/SalesChannelsSettingsPage.tsx` | Campos description + sort_order |

## Nota sobre multi-tenant

O sistema e single-tenant. `organizations` sao clientes do CRM, nao tenants. Adicionar `organization_id` em `sales_channels` criaria complexidade sem beneficio. Se futuramente o sistema virar multi-tenant, sera um refactor separado que afeta todas as tabelas.

