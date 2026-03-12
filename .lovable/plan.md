

# Plano: Auditoria Final — Corrigir Referências Residuais

## Problemas Encontrados

Todas as 16 edge functions estão corretamente apontando para `api.openai.com` com modelos `gpt-4o-mini`/`gpt-4o`. Porém, restam **mensagens de log e fallback** que ainda mencionam "AI Gateway" e "créditos esgotados" (conceitos do Lovable Gateway, não da OpenAI direta).

### Erro 1 — `analyze-ticket/index.ts` (6 ocorrências)
- L139: `'Failed to get response from AI Gateway'` → `'Failed to get response from OpenAI'`
- L143: `AI Gateway error` → `OpenAI API error` (log)
- L150: `credits_depleted` → `payment_error` (402 na OpenAI = billing issue, não "créditos Lovable")
- L153: `AI Gateway error` → `OpenAI API error` (log)
- L162/168/174/180/186: `'Créditos de IA esgotados'` → `'Erro de billing na API OpenAI. Verifique sua conta.'`
- L202: `AI Gateway error` → `OpenAI API error`

### Erro 2 — `whatsapp-window-keeper/index.ts` (1 ocorrência)
- L317: `'AI gateway error'` → `'OpenAI API error'`

### Erro 3 — `ai-chat-stream/index.ts` (2 ocorrências)
- L214: `'AI Gateway error'` → `'OpenAI API error'` (log)
- L230: `'AI Gateway error'` → `'OpenAI API error'` (response)

## Resumo

| Arquivo | Correções |
|---|---|
| `analyze-ticket/index.ts` | 6 strings de log/fallback |
| `whatsapp-window-keeper/index.ts` | 1 string de erro |
| `ai-chat-stream/index.ts` | 2 strings de log/erro |

Total: **9 correções** em 3 arquivos. Nenhuma mudança de lógica, apenas consistência de mensagens para refletir que agora usamos OpenAI diretamente.

