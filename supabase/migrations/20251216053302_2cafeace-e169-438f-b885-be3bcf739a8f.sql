-- Create media bucket for email template images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view media (public bucket)
CREATE POLICY "Public media access" ON storage.objects
FOR SELECT USING (bucket_id = 'media');

-- Policy: Authenticated users can upload media
CREATE POLICY "Authenticated users can upload media" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update media" ON storage.objects
FOR UPDATE USING (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can delete media
CREATE POLICY "Authenticated users can delete media" ON storage.objects
FOR DELETE USING (bucket_id = 'media' AND auth.role() = 'authenticated');