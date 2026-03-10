
# Correções Cirúrgicas no AI Autopilot Chat — CONCLUÍDO (10/03/2026)

## Status dos Bugs

| Bug | Status | Ação |
|-----|--------|------|
| BUG 1: Trigger AFTER→BEFORE | ✅ Já migrado | Nenhuma |
| BUG 2: ESCAPE_PATTERNS markdown | ✅ Já corrigido | Nenhuma |
| BUG 4: Dispatch copilot | ✅ Já migrado | Nenhuma |
| BUG 5: generateRestrictedPrompt markdown | ✅ Corrigido | FIX 1 |
| BUG 6: forbidQuestions falso positivo | ✅ Corrigido | FIX 2 |
| BUG 7: Mensagens ticket com markdown | ✅ Corrigido | FIX 3 |
| MELHORIA 1: SCORE_MINIMUM 0.10→0.25 | ✅ Corrigido | FIX 4 |

## Alterações aplicadas em `supabase/functions/ai-autopilot-chat/index.ts`

- **FIX 1**: generateRestrictedPrompt agora proíbe markdown explicitamente e remove `**` do bloco "Contexto do Cliente"
- **FIX 2**: validateResponseRestrictions usa split por frases — só bloqueia se frase termina em `?`
- **FIX 3**: Mensagens de ticket (saque fallback + orderInfo) sem markdown
- **FIX 4**: SCORE_MINIMUM de 0.10 → 0.25

## Deploy: ✅ Edge function deployed
