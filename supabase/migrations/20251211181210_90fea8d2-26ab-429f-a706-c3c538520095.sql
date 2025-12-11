-- ==============================================
-- MEDIA ATTACHMENTS - Enterprise Media Storage
-- ==============================================

-- Storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments', 
  'chat-attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'audio/ogg', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/wav', 'video/mp4', 'video/webm', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Media attachments table
CREATE TABLE IF NOT EXISTS public.media_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES public.profiles(id),
  
  -- File metadata
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  
  -- Storage
  storage_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'chat-attachments',
  
  -- Processing status
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'failed', 'quarantine')),
  processing_error TEXT,
  
  -- Transcoding (for audio)
  transcoded_path TEXT,
  transcoded_mime_type TEXT,
  
  -- Previews
  thumbnail_path TEXT,
  waveform_data JSONB, -- Array of amplitudes for audio player
  duration_seconds NUMERIC, -- Duration for audio/video
  width INTEGER, -- For images
  height INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_attachments_message ON media_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_conversation ON media_attachments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_media_attachments_status ON media_attachments(status);
CREATE INDEX IF NOT EXISTS idx_media_attachments_uploaded_by ON media_attachments(uploaded_by);

-- Enable RLS
ALTER TABLE public.media_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view media in their conversations"
ON media_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = media_attachments.conversation_id
    AND (
      c.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'support_manager')
      OR has_role(auth.uid(), 'general_manager')
    )
  )
);

CREATE POLICY "Users can upload media to their conversations"
ON media_attachments FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'support_manager')
    )
  )
);

CREATE POLICY "Users can update their own uploads"
ON media_attachments FOR UPDATE
USING (
  uploaded_by = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete media"
ON media_attachments FOR DELETE
USING (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'manager')
);

-- Storage Policies for chat-attachments bucket
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view chat attachments they have access to"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own attachments"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins can delete chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments'
  AND (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'manager')
  )
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_media_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_media_attachments_updated_at ON media_attachments;
CREATE TRIGGER trigger_update_media_attachments_updated_at
  BEFORE UPDATE ON media_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_media_attachments_updated_at();

-- Enable Realtime for media_attachments
ALTER PUBLICATION supabase_realtime ADD TABLE public.media_attachments;