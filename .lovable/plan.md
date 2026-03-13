

## Plano: Toggle de detecção de onboarding no nó de IA

### O que será feito

Adicionar um switch "Detectar onboarding incompleto" no painel de propriedades do nó de IA, que controla se a IA deve buscar e usar informações de onboarding pendente para aquele nó específico.

### Mudanças

**1. Frontend — `SmartCollectionSection.tsx` ou `AIResponsePropertiesPanel.tsx`**

Adicionar uma nova seção simples (antes do Separator de "Coleta Inteligente") com:
- Icone `GraduationCap` + Label "Detectar Onboarding Incompleto"
- Switch ligado a `onboarding_detection_enabled` (default: `false`)
- Texto explicativo: "A IA identifica se o cliente tem etapas pendentes e direciona para continuar"

**2. Backend — `process-chat-flow/index.ts`**

Nos ~7 blocos onde o `flow_context` é montado com `objective`, `forbidQuestions`, etc., adicionar:
```
onboardingDetection: resolvedNode.data?.onboarding_detection_enabled ?? false,
```

**3. Backend — `ai-autopilot-chat/index.ts`**

- Adicionar `onboardingDetection?: boolean` no tipo `FlowContext` (linha ~1215)
- Extrair: `const flowOnboardingDetection = flow_context?.onboardingDetection ?? true;`
  - Default `true` quando sem flow (autopilot puro) 
  - Default `false` quando com flow (controlado pelo toggle)
- Condicionar o bloco de enriquecimento (linha ~1857): só buscar onboarding se `flowOnboardingDetection === true` (ou se não houver flow_context)
- Condicionar o `onboardingGuardInstruction` (linha ~6603): só injetar se `onboardingInfo` existir (já é assim) E `flowOnboardingDetection === true`

### Comportamento

| Cenário | Toggle | Resultado |
|---------|--------|-----------|
| Autopilot (sem fluxo) | N/A | Sempre detecta onboarding |
| Nó IA no fluxo, toggle OFF | `false` | Ignora onboarding |
| Nó IA no fluxo, toggle ON | `true` | Detecta e injeta no prompt |

### Arquivos modificados
- `src/components/chat-flows/AIResponsePropertiesPanel.tsx` — nova seção com toggle
- `supabase/functions/process-chat-flow/index.ts` — passar `onboardingDetection` nos ~7 blocos de flow_context
- `supabase/functions/ai-autopilot-chat/index.ts` — tipo FlowContext + condicional no enriquecimento

