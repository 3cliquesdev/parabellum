-- Criar tabela de notificações para vendedores
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver suas próprias notificações
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Política: sistema pode inserir notificações
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Política: usuários podem marcar como lida
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Adicionar ao Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;