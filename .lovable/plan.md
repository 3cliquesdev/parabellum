

# Plano: Adicionar Datas Detalhadas ao Relatório

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Objetivo

Adicionar uma segunda aba/seção ao relatório com visao detalhada por registro individual, mostrando:
- **Data do preenchimento** (`form_submissions.created_at`)
- **Data do fechamento** (`deals.closed_at`)
- Nome do contato, formulario, status do deal, valor

A tabela resumida diaria atual continua existindo (sem regressao).

## Como funciona a ligacao

`form_submissions.contact_id` → `contacts.id` ← `deals.contact_id` + `deals.lead_source = 'formulario'`

## Mudancas

### 1. Hook `useFormLeadsConversionReport.tsx` — Nova query detalhada

Adicionar query que busca form_submissions com join no contato e nos deals:

```
form_submissions.select(`
  id, created_at, form_id,
  contact:contacts!form_submissions_contact_id_fkey(id, name),
  forms!form_submissions_form_id_fkey(name)
`)
```

Separadamente, buscar deals com `lead_source = 'formulario'` no periodo, agrupados por `contact_id`. Fazer o match client-side.

Retorna novo array `detailedData`:
```
{
  submissionDate: string     // form_submissions.created_at
  closingDate: string | null // deals.closed_at (se existir)
  contactName: string
  formName: string
  dealStatus: string | null  // won/lost/open/null
  dealValue: number | null
}
```

### 2. Pagina `FormLeadsConversionReport.tsx` — Nova tabela detalhada

Adicionar Tabs (Resumo Diario | Detalhado) usando `@radix-ui/react-tabs`:

**Aba "Resumo Diario"**: tabela atual (sem mudanca)

**Aba "Detalhado"**: nova tabela com colunas:
- Data Preenchimento | Contato | Formulario | Status Deal | Data Fechamento | Valor

Com paginacao propria e ordenacao por data de preenchimento.

### 3. Excel `useExportFormLeadsExcel.tsx` — Segunda planilha

Adicionar segunda aba na planilha Excel ("Detalhado") com os registros individuais incluindo ambas as datas.

## Arquivos

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useFormLeadsConversionReport.tsx` | Adicionar query detalhada + retornar `detailedData` |
| `src/pages/FormLeadsConversionReport.tsx` | Adicionar Tabs com aba detalhada |
| `src/hooks/useExportFormLeadsExcel.tsx` | Adicionar segunda sheet com dados detalhados |

## Impacto

- Zero regressao: aba "Resumo Diario" permanece identica
- Apenas adicao de nova aba e nova query
- Join via `contact_id` compartilhado entre form_submissions e deals

