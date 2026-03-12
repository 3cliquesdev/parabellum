
Objetivo: corrigir o incidente da conversa #4384C42E para (1) parar a “alucinação/fallback imediato” e (2) garantir que toda resposta enviada ao cliente também apareça no Inbox.

Diagnóstico confirmado (com evidências)
1) Falha crítica de IA em toda tentativa no nó ia_entrada
- Logs de `ai-autopilot-chat` mostram repetidamente: `OpenAI error: 400` seguido de handoff automático.
- Isso força a mensagem de emergência (“dificuldades técnicas...”) no WhatsApp, dando percepção de alucinação logo no início.

2) Mensagem enviada ao cliente não aparece no chat interno
- A mensagem de fallback é enviada (`send-meta-whatsapp` retorna sucesso), mas o insert local falha silenciosamente.
- Em `ai-autopilot-chat`, fallback é salvo com `status: 'pending'` na tabela `messages`.
- O enum `message_status` NÃO aceita `pending` (somente: `sending | sent | delivered | failed | read`).
- Resultado: sem registro no Inbox e webhook depois loga “Message not found for status update”.

3) Risco adicional de inconsistência de status
- `send-meta-whatsapp` usa `status: 'dispatched'` em update por `client_message_id`, mas esse status também não existe no enum atual.
- Isso pode quebrar reconciliação em fluxos que usam `client_message_id`.

Plano de implementação

Fase 1 — Corrigir persistência das mensagens (Inbox x WhatsApp)
- Arquivo: `supabase/functions/ai-autopilot-chat/index.ts`
- Trocar fallback insert de `status: 'pending'` para `status: 'sending'`.
- Capturar e tratar explicitamente erro do insert (`fallbackSaveError`) antes de seguir.
- Se salvar no banco falhar, registrar erro detalhado e NÃO assumir que “salvou”.
- Ao enviar via `send-meta-whatsapp`, atualizar status para `sent`/`failed` com base no resultado.

Fase 2 — Corrigir a causa do `OpenAI 400` (resiliência de modelo/payload)
- Arquivo: `supabase/functions/ai-autopilot-chat/index.ts`
- Melhorar `callAIWithFallback`:
  - Ler e logar corpo completo do erro 400 (não só status).
  - Aplicar normalização de payload para modelos avançados (ex.: conversão de `max_tokens` -> `max_completion_tokens` quando necessário e sanitização de campos não aceitos).
  - Implementar fallback técnico automático em 400: tentar modelo de contingência seguro (`gpt-4o-mini`) antes de acionar protocolo de handoff.
- Resultado esperado: reduzir drasticamente “fallback técnico imediato” e restaurar resposta normal da IA.

Fase 3 — Hardening de reconciliação de status
- Arquivo: `supabase/functions/send-meta-whatsapp/index.ts`
- Substituir `status: 'dispatched'` por um status válido do enum (`sending` ou `sent`, conforme etapa).
- Garantir update de `provider_message_id` sem introduzir status inválido.
- Manter compatibilidade com `skip_db_save` + `client_message_id`.

Fase 4 — Robustez contra saídas malformadas do LLM (prevenção futura)
- Arquivo: `supabase/functions/ai-autopilot-chat/index.ts`
- Adicionar helper seguro para parse de JSON de tool arguments:
  - limpeza de markdown/code fences,
  - correções simples (trailing comma/control chars),
  - detecção de truncamento.
- Usar esse helper nos pontos de `JSON.parse(toolCall.function.arguments)` para evitar quedas por payload truncado/malformado.

Validação (teste end-to-end)
1) Repetir teste na conversa #4384C42E com mensagens simples (“Oi”, “Como você está?”).
2) Confirmar:
- IA responde sem cair em “dificuldades técnicas”.
- Mensagem enviada ao WhatsApp aparece no Inbox com status evoluindo (`sending -> sent -> delivered/read`).
- Sem novos registros `OpenAI error: 400` em `ai_failure_logs`.
- Sem “Message not found for status update” para mensagens novas.
3) Testar também cenário de erro forçado de IA:
- fallback deve aparecer no WhatsApp E no Inbox (consistentes).

Arquivos que serão alterados
- `supabase/functions/ai-autopilot-chat/index.ts`
- `supabase/functions/send-meta-whatsapp/index.ts`

Resultado esperado após aplicar
- Fim do fallback técnico imediato (“alucinação” percebida).
- Sincronia completa entre mensagem enviada ao cliente e histórico visível no chat interno.
- Pipeline de IA mais resiliente para erros 400 e respostas malformadas.
