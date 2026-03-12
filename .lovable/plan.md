

# Auditoria Completa: Eliminar `gpt-4o-mini` hardcoded em TODAS as edge functions

## Situação Atual

Os dois arquivos principais (`ai-autopilot-chat` e `sandbox-chat`) já estão corrigidos. Porém, **16 outras edge functions** ainda usam `gpt-4o-mini` hardcoded, criando risco de inconsistência e uso de modelos inferiores.

## Arquivos com `gpt-4o-mini` hardcoded

| # | Arquivo | Tipo de Uso | Correção |
|---|---|---|---|
| 1 | `ai-chat-stream/index.ts` L23 | `getConfiguredAIModel` retorna `'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 2 | `ai-auto-trainer/index.ts` L11 | `getConfiguredAIModel` retorna `'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 3 | `expand-query/index.ts` L43 | `model: 'gpt-4o-mini'` hardcoded | → `'gpt-5-nano'` (tarefa leve) |
| 4 | `process-knowledge-import/index.ts` L105, L213, L269 | 3x `model: 'gpt-4o-mini'` | → `'gpt-5-nano'` (processamento batch) |
| 5 | `analyze-dashboard/index.ts` L111 | `model: 'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 6 | `ai-governor/index.ts` L679 | `model: 'gpt-4o-mini'` | → `'gpt-5-nano'` (classificação simples) |
| 7 | `generate-sales-insights/index.ts` L116 | `model: 'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 8 | `generate-batch-embeddings/index.ts` L46 | `model: 'gpt-4o-mini'` (limpeza texto) | → `'gpt-5-nano'` |
| 9 | `form-ai-suggest/index.ts` L115 | `model = 'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 10 | `whatsapp-window-keeper/index.ts` L189, L295 | `model: "gpt-4o-mini"` | → `'gpt-5-nano'` (mensagem curta) |
| 11 | `extract-knowledge-from-chat/index.ts` L163 | `model: 'gpt-4o-mini'` | → `'gpt-5-nano'` |
| 12 | `generate-kb-draft/index.ts` L131 | `model: 'gpt-4o-mini'` | → `'gpt-5-nano'` |
| 13 | `analyze-ticket/index.ts` L10 | `DEFAULT_MODEL = 'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 14 | `generate-smart-reply/index.ts` L337 | `model: 'gpt-4o-mini'` | → `'gpt-5-mini'` |
| 15 | `import-octadesk/index.ts` L117 | `model: "gpt-4o-mini"` | → `'gpt-5-nano'` |
| 16 | `generate-copilot-insights/index.ts` L219 | `model: "gpt-4o-mini"` | → `'gpt-5-mini'` |

## Critério de escolha do modelo substituto

- **`gpt-5-mini`**: Tarefas que precisam de raciocínio (análise, sugestões, insights, tickets)
- **`gpt-5-nano`**: Tarefas leves/batch (limpeza de texto, expansão de query, classificação, mensagens curtas, processamento de importação)

## Nota sobre `max_tokens` vs `max_completion_tokens`

`gpt-5-nano` e `gpt-5-mini` exigem `max_completion_tokens`. Cada arquivo que usa `max_tokens` precisará ser ajustado para o parâmetro correto. Verificarei caso a caso durante a implementação.

## Resultado

Zero referências a `gpt-4o-mini` em todo o projeto. Todos os modelos na família `gpt-5`, consistentes com a configuração global.

