

# Relatório de Envios de Email por Template — Export Excel

## O que será construído

Botão "Exportar Relatório" na página de Email Templates que baixa um Excel com todos os envios (`email_sends`), filtráveis por período e template, com as colunas:

| Coluna | Fonte |
|--------|-------|
| Template | `email_templates_v2.name` via `template_id` |
| Destinatário | `recipient_email` |
| Assunto | `subject` |
| Data/Hora Envio | `sent_at` (DD/MM/YYYY HH:mm) |
| Status | Derivado: Bounce / Clicado / Aberto / Enviado / Erro / Pendente |
| Clicado | `clicked_at` (DD/MM/YYYY HH:mm ou vazio) |
| Aberto | `opened_at` (DD/MM/YYYY HH:mm ou vazio) |
| Bounce | `bounced_at` (DD/MM/YYYY HH:mm ou vazio) |
| Contato | `contacts.first_name + last_name` via `contact_id` |

## Implementação

### 1. Hook `useExportEmailSendsReport.tsx` (novo)
- Recebe filtros: `dateRange` (opcional), `templateId` (opcional)
- Query na tabela `email_sends` com join em `contacts` e `email_templates_v2` (nome do template)
- Paginação automática (mesma lógica do `fetchAllRpcPages` mas direto no client, pois a tabela já tem RLS)
- Gera Excel via `xlsx` com auto-width, seguindo o padrão do `useExportPlaybookEmailSequence`
- Colunas: Template, Contato, Email, Assunto, Data/Hora Envio, Status, Clicado, Aberto, Bounce

### 2. Componente `EmailSendsExportDialog.tsx` (novo)
- Dialog com:
  - Date range picker (filtro período)
  - Select de template (opcional, "Todos" por padrão) — lista de `email_templates_v2`
  - Botão "Exportar Excel"
- Ao clicar, chama o hook que busca dados e gera o arquivo

### 3. Integração na página `EmailTemplates.tsx`
- Adicionar botão "Exportar Relatório" (ícone Download) no header da página, ao lado do título
- Abre o `EmailSendsExportDialog`

### Impacto
- Zero regressão: apenas adiciona botão e dialog novos
- Usa padrões existentes (xlsx, date utils, supabase client)

