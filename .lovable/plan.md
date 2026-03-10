

# Encerramento automático por inatividade do agente humano

## Situação atual

O sistema tem 3 estágios de auto-close:
- **Stage 2**: Departamento com `auto_close_enabled` + `auto_close_minutes` — mas filtra `ai_mode = 'autopilot'`, ou seja, só fecha conversas de IA, não de humano.
- **Stage 3**: `ai_auto_close_minutes` — também filtra `ai_mode = 'autopilot'`.
- **Stage 3b**: Fallback para conversas sem departamento — idem, `autopilot`.

Não existe nenhum estágio que feche conversas onde o **agente humano** enviou a última mensagem e o cliente não respondeu.

## Plano

### 1. Nova coluna no banco: `human_auto_close_minutes`

Adicionar coluna `human_auto_close_minutes INTEGER NULL` na tabela `departments`. Quando preenchida, ativa o encerramento por inatividade para conversas com agente humano.

### 2. UI no DepartmentDialog — novo toggle + campo

Adicionar na seção "Encerramento Automático":
- Switch: **"Encerrar conversas humanas por inatividade"** — "Fecha conversas atendidas por humano quando o cliente não responde"
- Input: **"Tempo de inatividade humano (minutos)"** — mínimo 1 minuto

### 3. Hooks de criação/atualização

Adicionar `human_auto_close_minutes` aos hooks `useCreateDepartment` e `useUpdateDepartment`.

### 4. Edge function: novo Stage 4 — Human inactivity

No `auto-close-conversations/index.ts`, adicionar **Stage 4**:
- Buscar departamentos com `human_auto_close_minutes` configurado
- Buscar conversas `status = 'open'` + `ai_mode != 'autopilot'` (ou seja, copilot/disabled/waiting_human) + `last_message_at < threshold`
- Verificar última mensagem: só fechar se `sender_type = 'user'` (agente humano)
- Aplicar tag `9.98 Falta de Interação`, enviar mensagem de encerramento, CSAT se configurado, fechar com `closed_reason: 'human_inactivity'`

### 5. Card do departamento

Mostrar o tempo configurado no card da página Departments (similar ao badge de IA).

### Arquivos a alterar
- **Migração SQL**: adicionar coluna `human_auto_close_minutes`
- `src/components/DepartmentDialog.tsx` — novo toggle + input
- `src/hooks/useCreateDepartment.tsx` — novo campo
- `src/hooks/useUpdateDepartment.tsx` — novo campo
- `src/hooks/useDepartments.tsx` — tipo Department
- `src/pages/Departments.tsx` — badge no card
- `supabase/functions/auto-close-conversations/index.ts` — Stage 4

