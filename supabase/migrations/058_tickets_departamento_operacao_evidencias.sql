-- Fase 3 da reconstrucao da tela de Tickets no padrao antigo: campos de
-- departamento/operacao no ticket, e bucket de storage pra evidencias
-- (print/foto) anexadas na criacao do ticket.

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS operacao_id uuid REFERENCES operacoes(id) ON DELETE SET NULL;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS evidencia_url text;

CREATE INDEX IF NOT EXISTS idx_tickets_department ON tickets(department_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-evidencias',
  'ticket-evidencias',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Caminho dos arquivos: {tenant_id}/{arquivo} - RLS confere que o usuario e
-- membro do tenant no primeiro segmento do path.
DROP POLICY IF EXISTS "ticket_evidencias_read" ON storage.objects;
CREATE POLICY "ticket_evidencias_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'ticket-evidencias');

DROP POLICY IF EXISTS "ticket_evidencias_insert" ON storage.objects;
CREATE POLICY "ticket_evidencias_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-evidencias'
    AND (storage.foldername(name))[1]::uuid IN (SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid())
  );
