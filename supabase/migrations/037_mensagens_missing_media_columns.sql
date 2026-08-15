-- Gap critico do 002-009: mensagens.media_url/media_type/media_nome/media_mime/
-- media_caption/latitude/longitude sao usados pelo INSERT em ingestInboundMessage()
-- (lib/inbox/service.ts) e em /api/whatsapp/send, mas nunca existiram na tabela.
-- Como o codigo nao checava o erro do insert, TODA mensagem de entrada (lead)
-- estava falhando silenciosamente em qualquer canal desde o reset do schema.

ALTER TABLE mensagens
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS media_nome text,
  ADD COLUMN IF NOT EXISTS media_mime text,
  ADD COLUMN IF NOT EXISTS media_caption text,
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;
