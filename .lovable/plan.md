

## Verificação: Já está correto

Após inspecionar o código atual:

1. **`OnboardingProgress.tsx` linha 179**: O botão "Preencher agora →" já usa `/public-onboarding/${executionId}` onde `executionId` é o `id` da `playbook_executions`, passado como prop ao `StepItem`.

2. **`useClientOnboarding.ts`**: O hook já retorna `exec.id` (que é `playbook_executions.id`) no campo `id` de cada `OnboardingExecution`.

3. **Fluxo de dados confirmado**:
   - `exec.id` = `playbook_executions.id` ✅
   - Passado como `executionId={exec.id}` ao `StepItem` ✅
   - Usado no href como `/public-onboarding/${executionId}` ✅

**Nenhuma alteração necessária** — a implementação já segue exatamente a instrução do usuário. O `execution_id` correto da `playbook_executions` está sendo usado, não o `form_id` do step.

