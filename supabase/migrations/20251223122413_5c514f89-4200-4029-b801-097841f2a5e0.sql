-- Create dedicated bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments', 
  'ticket-attachments', 
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime']
);

-- Policy: Allow authenticated users (support agents, managers) to upload
CREATE POLICY "Support agents can upload ticket attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
);

-- Policy: Allow authenticated users to view attachments
CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-attachments');

-- Policy: Public can view (since bucket is public for URLs to work)
CREATE POLICY "Public can view ticket attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'ticket-attachments');

-- Policy: Support agents and managers can delete
CREATE POLICY "Support can delete ticket attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    has_role(auth.uid(), 'support_agent'::app_role) OR
    has_role(auth.uid(), 'support_manager'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  )
);