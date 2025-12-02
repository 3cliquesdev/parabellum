-- =============================================
-- TEAMS & TEAM MEMBERS MANAGEMENT SYSTEM
-- =============================================

-- Teams table (support groups/teams)
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  manager_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Team members junction table
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Anyone can view active teams"
ON public.teams FOR SELECT
USING (is_active = true);

CREATE POLICY "Admin/Manager can manage teams"
ON public.teams FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support_manager'::app_role));

-- RLS Policies for team_members
CREATE POLICY "Anyone can view team members"
ON public.team_members FOR SELECT
USING (true);

CREATE POLICY "Admin/Manager can manage team members"
ON public.team_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support_manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'support_manager'::app_role));

-- Team managers can manage their own team members
CREATE POLICY "Team manager can manage own team"
ON public.team_members FOR ALL
USING (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_members.team_id AND teams.manager_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.teams WHERE teams.id = team_members.team_id AND teams.manager_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_teams_manager_id ON public.teams(manager_id);

-- Trigger for updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_departments_updated_at();

-- Insert default teams
INSERT INTO public.teams (name, description, color) VALUES
  ('Suporte N1', 'Primeiro nível de atendimento', '#3B82F6'),
  ('Suporte N2', 'Segundo nível de atendimento técnico', '#8B5CF6'),
  ('Financeiro', 'Equipe financeira', '#10B981'),
  ('Retenção', 'Equipe de retenção de clientes', '#F59E0B'),
  ('Comercial', 'Equipe de vendas', '#EF4444');