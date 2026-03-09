

# Adicionar coluna "Respondido" ao relatório de envios de e-mail

## Problema
A tabela `email_sends` não possui um campo `replied_at` para rastrear quando o contato respondeu ao e-mail. O relatório exportado não mostra essa informação.

## Solução

### 1. Migração: adicionar coluna `replied_at` na tabela `email_sends`
```sql
ALTER TABLE public.email_sends ADD COLUMN replied_at timestamptz;
```

### 2. Editar `useExportEmailSendsReport.tsx`
- Incluir `replied_at` no select da query
- Adicionar "Respondido" na lógica de `getEmailStatus` (prioridade entre "Clicado" e "Aberto")
- Adicionar coluna "Respondido" no Excel com `fmtDateTime(row.replied_at)`

### 3. Atualização de status (hierarquia)
```
Bounce > Respondido > Clicado > Aberto > Erro > Enviado > Pendente
```

### 4. Marcação manual (por enquanto)
Como não há integração de inbox para detectar respostas automaticamente, o `replied_at` poderá ser preenchido:
- Manualmente pelo usuário na timeline do contato
- Ou futuramente via webhook de resposta

Sem essa marcação automática, a coluna ficará disponível mas vazia até ser preenchida manualmente ou por integração futura.

