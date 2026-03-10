

# Auditoria de IA e Chat Flow — Status Atual

## O que ESTÁ funcionando (pós-fix)

As correções anteriores estão ativas e funcionando:
- **Trigger BEFORE**: Nenhuma conversa com `department = NULL` encontrada
- **flow_advance_needed**: Jessé Silva (8eac256b) → contract violation detectado → `forceAIExit` → fluxo avançou para menu ✅
- **forceCommercialExit**: Conv 0abf18d5 → bloqueio comercial → flow avançou ✅
- **Anti-loop**: O guard de 0% confiança + 0 artigos KB está ativo

---

## BUGS ATIVOS (3 problemas)

### BUG 1: Prefixo `**Baseado nas informações disponíveis:**` causa contract_violation

**Causa raiz**: A função `generateResponsePrefix('cautious')` (linha 995) adiciona `**Baseado nas informações disponíveis:**` com markdown. A IA então gera passos numerados (1. 2. 3.) que ativam `ESCAPE_PATTERNS` → o sistema bloqueia a própria resposta como violação de contrato.

**Impacto**: 16 contract violations nas últimas 2h. Todas com `blocked_preview` começando com `**Baseado nas...`.

**Conversas afetadas agora**:
- Lucas Mugnol (83e38c1f) — msg às 14:47, violation às 14:48, SEM resposta há 35min
- Carlos Antônio (ca133a86) — msg às 14:56, violation às 14:57, SEM resposta há 23min

**Fix**: Remover markdown do prefixo cautious. Usar texto plano: `"Baseado nas informações disponíveis:\n\n"` (sem `**`).

### BUG 2: Dispatch jobs marcados "completed/already_assigned" para conversas SEM agente

5 conversas em `copilot` com `assigned_to = NULL` mas dispatch job `status: completed, last_error: already_assigned`:
- `0a6acf51` (Jorge ~) — 12h sem agente
- `85904262` (Jorge) — 4h sem agente
- `1bfd61f8` (Daiane) — copilot, sem agente
- `6d733cab` — copilot, sem agente
- `8eac256b` (Jessé) — autopilot, sem agente

**Causa**: O trigger `ensure_dispatch_job` marca dispatch como `completed` quando `assigned_to IS NOT NULL`, mas a função `dispatch-conversations` está retornando `already_assigned` erroneamente e completando o job sem atribuir agente.

**Fix**: Na SQL, reabrir esses dispatch jobs como `pending` para re-processamento. E investigar por que `dispatch-conversations` retorna `already_assigned` quando `assigned_to IS NULL`.

### BUG 3: Customer Success sem agentes (crônico)

3 conversas escaladas há horas sem resolução:
- Cristiane Reich — 8 tentativas
- Emerson Smanioto — 6 tentativas
- Michael platini — 7 tentativas

Não é bug de código — departamento Customer Success não tem agentes online.

---

## Plano de Correção

### Fix 1: Remover markdown do prefixo cautious
Alterar `generateResponsePrefix('cautious')` de `'**Baseado nas informações disponíveis:**\n\n'` para `'Baseado nas informações disponíveis:\n\n'`. Isso elimina a auto-sabotagem.

### Fix 2: Corrigir conversas stuck + dispatch jobs
SQL para:
- Cancelar flow states de Lucas Mugnol e Carlos Antônio (presos em ia_entrada)
- Mover para `waiting_human` com departamento Suporte
- Reabrir dispatch jobs `completed/already_assigned` para conversas sem agente como `pending`
- Criar dispatch jobs para conversas copilot que não têm

### Fix 3: Investigar dispatch-conversations "already_assigned"
Verificar a lógica na edge function `dispatch-conversations` que retorna `already_assigned` para conversas sem agente. Possível race condition ou check incorreto.

---

## Resultado Esperado

- Prefixo cautious sem markdown → ZERO contract violations auto-infligidas
- Conversas stuck corrigidas → clientes recebem atendimento
- Dispatch jobs reabertos → agentes recebem as conversas na fila

