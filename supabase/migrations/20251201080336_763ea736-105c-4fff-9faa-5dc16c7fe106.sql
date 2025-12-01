-- Criar tabela de jobs de sincronização
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,           -- 'kiwify_sync'
  status TEXT DEFAULT 'pending',    -- pending, running, completed, failed
  total_items INTEGER,
  processed_items INTEGER DEFAULT 0,
  created_items INTEGER DEFAULT 0,
  updated_items INTEGER DEFAULT 0,
  contacts_created INTEGER DEFAULT 0,
  auth_users_created INTEGER DEFAULT 0,
  deals_created INTEGER DEFAULT 0,
  deals_updated INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  options JSONB DEFAULT '{}'::jsonb, -- Armazena silent, create_auth_users, days_back
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscar jobs por usuário
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_by ON sync_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

-- Habilitar realtime para progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE sync_jobs;