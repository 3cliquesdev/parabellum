-- Bucket "whatsapp-media" nunca existiu de verdade no Storage - o codigo
-- (src/lib/inbox/outbound.ts, src/lib/meta-channel.ts) sempre assumiu que
-- existia e usava getPublicUrl() cegamente, que gera uma URL mesmo se o
-- bucket/arquivo nao existir (nao valida nada). Resultado: toda midia
-- enviada/recebida (audio, imagem, video, documento) desde sempre gravava
-- uma media_url que aponta pra um bucket inexistente - por isso nunca tocava
-- de volta dentro do proprio CRM, mesmo a entrega real via WhatsApp funcionando
-- (o upload pra Meta e um caminho totalmente separado do Storage).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('whatsapp-media', 'whatsapp-media', true, 104857600)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit;

-- Caminho dos arquivos: {tenant_id}/{arquivo} - mesmo padrao de ticket-evidencias.
DROP POLICY IF EXISTS "whatsapp_media_read" ON storage.objects;
CREATE POLICY "whatsapp_media_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'whatsapp-media');

DROP POLICY IF EXISTS "whatsapp_media_insert" ON storage.objects;
CREATE POLICY "whatsapp_media_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'whatsapp-media'
    AND (storage.foldername(name))[1]::uuid IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );

-- Uploads de midia recebida via webhook (fetchAndStoreWhatsAppMedia) usam a
-- service role, que ja ignora RLS - mas uploads feitos com a service role
-- direto do server (nao autenticados via auth.uid()) tambem precisam de uma
-- policy propria caso a chamada nao va pela service role em algum ponto.
DROP POLICY IF EXISTS "whatsapp_media_service_insert" ON storage.objects;
CREATE POLICY "whatsapp_media_service_insert" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'whatsapp-media');
