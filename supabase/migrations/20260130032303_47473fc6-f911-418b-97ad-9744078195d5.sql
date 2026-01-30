-- Phase 2: Controlled Passive Learning Schema

-- 1. Create knowledge_candidates table (stores extracted knowledge before approval)
CREATE TABLE public.knowledge_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  when_to_use TEXT,
  when_not_to_use TEXT,
  category TEXT DEFAULT 'Aprendizado Passivo',
  tags TEXT[] DEFAULT '{}',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  extracted_by TEXT, -- 'ai-auto-trainer', 'extract-knowledge-from-chat', 'manual'
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.knowledge_candidates ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_knowledge_candidates_status ON public.knowledge_candidates(status);
CREATE INDEX idx_knowledge_candidates_source ON public.knowledge_candidates(source_conversation_id);
CREATE INDEX idx_knowledge_candidates_created_at ON public.knowledge_candidates(created_at DESC);

-- 2. Create knowledge_versions table (version history for KB articles)
CREATE TABLE public.knowledge_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_article_id UUID NOT NULL REFERENCES public.knowledge_articles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  problem TEXT,
  solution TEXT,
  category TEXT,
  tags TEXT[],
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.knowledge_versions ENABLE ROW LEVEL SECURITY;

-- Index for version lookup
CREATE INDEX idx_knowledge_versions_article ON public.knowledge_versions(knowledge_article_id, version DESC);

-- 3. Add structured columns to knowledge_articles
ALTER TABLE public.knowledge_articles 
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS when_to_use TEXT,
  ADD COLUMN IF NOT EXISTS when_not_to_use TEXT,
  ADD COLUMN IF NOT EXISTS source_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 4. Create trigger for updated_at on knowledge_candidates
CREATE TRIGGER update_knowledge_candidates_updated_at
  BEFORE UPDATE ON public.knowledge_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS Policies for knowledge_candidates

-- Select: Managers can view all candidates
CREATE POLICY "Managers can view knowledge candidates"
  ON public.knowledge_candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'support_manager', 'cs_manager', 'general_manager')
    )
  );

-- Insert: System and managers can create candidates
CREATE POLICY "System can insert knowledge candidates"
  ON public.knowledge_candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update: Managers can update (approve/reject) candidates
CREATE POLICY "Managers can update knowledge candidates"
  ON public.knowledge_candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'support_manager', 'cs_manager', 'general_manager')
    )
  );

-- Delete: Only admins can delete candidates
CREATE POLICY "Admins can delete knowledge candidates"
  ON public.knowledge_candidates
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- 6. RLS Policies for knowledge_versions

-- Select: Anyone authenticated can view versions
CREATE POLICY "Authenticated users can view knowledge versions"
  ON public.knowledge_versions
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Managers can create versions
CREATE POLICY "Managers can insert knowledge versions"
  ON public.knowledge_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager', 'support_manager', 'cs_manager', 'general_manager')
    )
  );

-- 7. Function to create version snapshot before updating knowledge_articles
CREATE OR REPLACE FUNCTION public.create_knowledge_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if significant changes (title or content)
  IF OLD.title IS DISTINCT FROM NEW.title OR OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.knowledge_versions (
      knowledge_article_id,
      version,
      title,
      content,
      problem,
      solution,
      category,
      tags,
      changed_by,
      change_reason
    ) VALUES (
      OLD.id,
      COALESCE(OLD.version, 1),
      OLD.title,
      OLD.content,
      OLD.problem,
      OLD.solution,
      OLD.category,
      OLD.tags,
      auth.uid(),
      'Auto-save before update'
    );
    
    -- Increment version on new record
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Trigger to auto-version knowledge_articles
CREATE TRIGGER knowledge_articles_version_trigger
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_knowledge_version();