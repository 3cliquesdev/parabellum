-- Tabela para rastrear execuções de teste de playbooks
CREATE TABLE IF NOT EXISTS public.playbook_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NULL REFERENCES public.onboarding_playbooks(id) ON DELETE SET NULL,
  execution_id UUID NOT NULL REFERENCES public.playbook_executions(id) ON DELETE CASCADE,
  started_by UUID NOT NULL,
  tester_email TEXT NOT NULL,
  tester_name TEXT NULL,
  speed_multiplier INT NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'running',
  flow_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_playbook_test_runs_started_by ON public.playbook_test_runs(started_by);
CREATE INDEX IF NOT EXISTS idx_playbook_test_runs_execution_id ON public.playbook_test_runs(execution_id);

-- Enable RLS
ALTER TABLE public.playbook_test_runs ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver seus próprios testes
CREATE POLICY "Users can view their own test runs"
ON public.playbook_test_runs
FOR SELECT
USING (auth.uid() = started_by);

-- Policy: Usuários podem criar seus próprios testes
CREATE POLICY "Users can create their own test runs"
ON public.playbook_test_runs
FOR INSERT
WITH CHECK (auth.uid() = started_by);

-- Policy: Usuários podem atualizar seus próprios testes
CREATE POLICY "Users can update their own test runs"
ON public.playbook_test_runs
FOR UPDATE
USING (auth.uid() = started_by);

-- Trigger para updated_at
CREATE TRIGGER update_playbook_test_runs_updated_at
  BEFORE UPDATE ON public.playbook_test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();