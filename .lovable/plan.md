

# Adicionar tag configurável para encerramento por inatividade da IA

## Resumo

Atualmente só o encerramento humano tem tag configurável (`human_auto_close_tag_id`). O encerramento por inatividade da IA usa sempre a tag hardcoded "9.98 Falta de Interação". O objetivo é:

1. Adicionar `ai_auto_close_tag_id` ao banco e UI — permitir escolher qual tag aplicar quando a IA encerra por inatividade do cliente
2. Melhorar os textos para ser mais claro: "cliente não respondeu ao atendimento humano" / "cliente não respondeu à IA (desinteresse)"
3. Ambos os tipos de encerramento terão seu próprio seletor de tag

## Alterações

### 1. Migração SQL
Adicionar coluna `ai_auto_close_tag_id UUID NULL REFERENCES tags(id)` na tabela `departments`.

### 2. Hooks e tipo Department
Adicionar `ai_auto_close_tag_id` em `useDepartments.tsx`, `useCreateDepartment.tsx`, `useUpdateDepartment.tsx`.

### 3. UI — DepartmentDialog.tsx
- Adicionar state `aiAutoCloseTagId` e seletor de tag dentro do bloco `aiAutoCloseEnabled`
- Melhorar textos descritivos:
  - IA: "Cliente não respondeu à IA — possível desinteresse na conversa"
  - Humano: "Cliente não respondeu ao atendimento humano"
- Salvar `ai_auto_close_tag_id` no submit

### 4. Edge function — auto-close-conversations
- No Stage 3 (AI inactivity por departamento), usar `dept.ai_auto_close_tag_id` se configurado, senão fallback para `FALTA_INTERACAO_TAG_ID`
- Incluir `ai_auto_close_tag_id` no select dos departamentos

### 5. Cards em Departments.tsx
Mostrar badge da tag configurada para IA (se aplicável).

