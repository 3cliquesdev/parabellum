

## Mostrar Nome do Template no Relatorio de Playbook

### Problema
A coluna "Email N - Titulo" no relatorio de sequencia de emails mostra o **assunto do email** (ex: "Boas-vindas ao Armazem Drop! Seu caminho para a primeira venda comeca agora.") em vez do **nome do template** (ex: "Onboarding (Simples)").

### Solucao
Alterar a RPC `get_playbook_email_sequence_report` para extrair o nome do template a partir do `flow_definition` do playbook, usando o campo `playbook_node_id` de `email_sends` para localizar o no correto. Adicionar esse campo ao frontend e ao export Excel.

### Detalhes Tecnicos

**1. Alterar a RPC `get_playbook_email_sequence_report` (migracao SQL)**
- Adicionar campo `email_template_name` ao retorno
- Extrair o `label` do no correspondente no `flow_definition` via jsonb:
  ```sql
  (SELECT n->'data'->>'label'
   FROM jsonb_array_elements(p.flow_definition::jsonb->'nodes') AS n
   WHERE n->>'id' = es.playbook_node_id
   LIMIT 1)::TEXT AS email_template_name
  ```

**2. `src/hooks/usePlaybookEmailSequenceReport.tsx`**
- Adicionar `email_template_name: string | null` na interface `EmailSequenceRow`

**3. `src/hooks/useExportPlaybookEmailSequence.tsx`**
- Trocar a coluna "Email N - Titulo" para usar `email_template_name` (com fallback para `email_subject` caso esteja nulo)

**4. `src/pages/PlaybookEmailSequenceReport.tsx`**
- Se a tabela na tela exibir o titulo, atualizar para usar `email_template_name`

### Impacto
- Upgrade: o nome do template e mais util e descritivo que o assunto
- Fallback: se `email_template_name` for nulo, mantem o `email_subject` como antes
- Nenhuma feature existente e afetada
