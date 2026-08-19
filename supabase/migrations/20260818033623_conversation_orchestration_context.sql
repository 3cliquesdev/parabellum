-- Contexto operacional persistente do orquestrador de IA. Fica na conversa
-- (e nao apenas na memoria efemera do workflow) para preservar dono, etapa e
-- pendencias entre mensagens neutras como "entendi" ou "ok".
ALTER TABLE public.conversas
  ADD COLUMN IF NOT EXISTS orchestration_context jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.conversas.orchestration_context IS
  'Estado interno do orquestrador: intent, owner_agent, conversation_state, produto, dor, objecao e proxima acao. Nunca expor ao cliente.';
