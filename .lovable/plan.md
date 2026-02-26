

# Plano: Re-deploy da Edge Function ai-autopilot-chat

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico

O código no arquivo `supabase/functions/ai-autopilot-chat/index.ts` está **correto** — linha 5098 tem `&& !flow_context`. Porém os logs de produção (02:49:56Z) confirmam que a versão deployada **ainda não tem o fix**:

- `hasFlowContext: true` é recebido ✅
- `willAskForEmail: true` é retornado ❌ (deveria ser bypassed)
- A IA responde com "preciso que você me informe seu email" ❌

O deploy anterior **não tomou efeito**. Isso pode acontecer por cache do edge runtime ou falha silenciosa no deploy.

## Solução

1. **Re-deploy forçado** da edge function `ai-autopilot-chat`
2. **Adicionar log explícito** no ponto do bypass para confirmar que o fix está ativo em produção

### Mudança: `supabase/functions/ai-autopilot-chat/index.ts` (linha 5097-5098)

Adicionar log antes da condição para confirmar que o fix está em vigor:

```typescript
// Antes da condição Identity Wall
console.log('[ai-autopilot-chat] 🔐 Identity Wall gate:', {
  contactHasEmail,
  isPhoneVerified,
  isCustomerInDatabase,
  isKiwifyValidated,
  channel: responseChannel,
  hasFlowContext: !!flow_context,
  willBypass: !!flow_context,
});

if (!contactHasEmail && !isPhoneVerified && !isCustomerInDatabase && !isKiwifyValidated && responseChannel === 'whatsapp' && !flow_context) {
```

O log `willBypass: true` confirmará que o fix está deployado. Se nos logs aparecer `willBypass: false` com `hasFlowContext: true`, significa que há outra variável em jogo.

3. **Deploy** da edge function

## Resumo

| Arquivo | Mudança |
|---|---|
| `supabase/functions/ai-autopilot-chat/index.ts` | Adicionar log de diagnóstico no Identity Wall gate (2 linhas) |
| Deploy | Re-deploy forçado da edge function |

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — apenas log adicional + redeploy |
| Upgrade | Sim — fix finalmente entra em produção |

