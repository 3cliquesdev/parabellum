CREATE POLICY "authenticated_can_read_configurations"
  ON public.system_configurations
  FOR SELECT
  TO authenticated
  USING (true);