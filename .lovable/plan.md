

## Relatorio de Sequencia de E-mails por Venda (Onboarding)

### Onde fica

Na pagina **Relatorios** (`/reports`), aba **Onboarding**, como um novo card que navega para uma pagina dedicada em `/reports/playbook-email-sequence`.

### Formato da planilha exportada

```text
| Cliente | Email | Playbook | Data Venda | Hora Venda | Email 1 - Titulo | Email 1 - Data | Email 1 - Hora | Email 1 - Status | Email 2 - Titulo | ... |
```

- Cada execucao de playbook = 1 linha
- Colunas de e-mail se expandem dinamicamente conforme o maximo de e-mails encontrados
- Status: Enviado / Aberto / Clicado / Bounce / Erro

### Arquivos e Alteracoes

**1. Nova migracao SQL** — RPC `get_playbook_email_sequence_report`

Consulta que retorna execucoes com seus e-mails ordenados, aceitando filtros opcionais `p_start`, `p_end`, `p_playbook_id`. Faz JOIN entre `playbook_executions`, `contacts`, `onboarding_playbooks` e `email_sends`, retornando o numero sequencial de cada e-mail via `ROW_NUMBER()`.

**2. Novo arquivo: `src/hooks/usePlaybookEmailSequenceReport.tsx`**

- Hook que chama a RPC com filtros de data e playbook
- Retorna dados brutos para exibicao na tabela

**3. Novo arquivo: `src/hooks/useExportPlaybookEmailSequence.tsx`**

- Recebe os dados, pivota por execution_id (1 linha por execucao, N colunas por e-mail)
- Gera arquivo `.xlsx` usando a biblioteca `xlsx` (ja instalada)
- Segue o mesmo padrao do `useExportTicketsExcel`

**4. Nova pagina: `src/pages/PlaybookEmailSequenceReport.tsx`**

Pagina dedicada seguindo o padrao do `TicketsExportReport.tsx`:
- Botao voltar para `/reports`
- Filtros: DateRangePicker + Select de Playbook
- Tabela com preview dos dados (primeiros 3 e-mails visiveis, restante no Excel)
- Botao "Exportar Excel"

**5. Editar: `src/pages/Reports.tsx`**

Adicionar novo card na categoria Onboarding:
```
{
  id: 'email_sequence',
  name: 'Sequencia de E-mails',
  description: 'Exportacao com todas as etapas de e-mail por venda/execucao',
  icon: FileSpreadsheet,
  route: '/reports/playbook-email-sequence',
}
```

**6. Editar: `src/App.tsx`**

Adicionar rota `/reports/playbook-email-sequence` apontando para a nova pagina.

### Impacto

- Zero impacto em funcionalidades existentes
- Apenas adiciona novo card + pagina + RPC
- Kill Switch, Shadow Mode, CSAT, distribuicao nao sao afetados
