

## Plano: IA detecta onboarding incompleto e direciona cliente

### Resumo
Adicionar ao `ai-autopilot-chat` a capacidade de detectar clientes com onboarding incompleto e informar a IA, de forma condicional e não-intrusiva.

### Mudanças (arquivo unico: `supabase/functions/ai-autopilot-chat/index.ts`)

**1. Enriquecimento condicional (apos linha ~1853, dentro do bloco enrichPromises)**

Adicionar queries de onboarding **apenas se** `contact.status === 'customer'`:

```typescript
// Onboarding progress (SÓ para clientes com produto contratado)
if (contact.status === 'customer') {
  enrichPromises.push(
    supabaseClient
      .from('playbook_executions')
      .select('id, status, playbook:onboarding_playbooks(name)')
      .eq('contact_id', contact.id)
      .eq('status', 'in_progress')
      .limit(1)
      .then((r: any) => ({ type: 'onboarding_execution', data: r.data }))
  );
  enrichPromises.push(
    supabaseClient
      .from('customer_journey_steps')
      .select('id, step_name, completed, position')
      .eq('contact_id', contact.id)
      .order('position', { ascending: true })
      .then((r: any) => ({ type: 'onboarding_steps', data: r.data }))
  );
}
```

**2. Processar resultados (apos linha ~1863, no loop de enrichResults)**

Declarar variáveis e processar:
```
let onboardingInfo = null; // { status, progress, nextStep, playbookName, executionId, resumeLink }
```

No loop de resultados, extrair dados e montar `onboardingInfo` com status, progresso ("3/7"), próxima etapa pendente e link público `/public-onboarding/{executionId}`.

**3. Injetar no prompt do cliente (apos linha ~6828)**

Bloco condicional:
```
${onboardingInfo ? `- Onboarding: ${onboardingInfo.status} (${onboardingInfo.progress})
- Próxima etapa pendente: "${onboardingInfo.nextStep}"
- Link para continuar: ${onboardingInfo.resumeLink}` : ''}
```

**4. Instrução de comportamento (adicionar no contextualizedSystemPrompt, ~linha 6556)**

Adicionar instrução condicional (só quando `onboardingInfo` existir):
```
📋 ONBOARDING DO CLIENTE:
Este cliente tem onboarding incompleto.
- NÃO mencione proativamente. Só aborde se:
  1. Cliente perguntar "o que falta fazer", "próximos passos", "como usar"
  2. O assunto da conversa for diretamente relacionado ao produto do onboarding
- Quando relevante, compartilhe o link para continuar de onde parou.
```

### O que NÃO muda
- Zero migrations (tabelas já existem)
- Queries só rodam para `status === 'customer'` (leads não são impactados)
- IA só menciona onboarding quando contexto for relevante (nunca proativamente em conversa sobre boleto)

