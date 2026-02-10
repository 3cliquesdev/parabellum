
CREATE TABLE public.ticket_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  color text DEFAULT '#6B7280',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.ticket_operations (name) VALUES
  ('Nacional'), ('Internacional'), ('Híbrido');

ALTER TABLE public.ticket_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read operations"
  ON public.ticket_operations FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage operations"
  ON public.ticket_operations FOR ALL
  TO authenticated USING (
    public.has_any_role(auth.uid(), ARRAY['admin','manager','general_manager']::public.app_role[])
  );

ALTER TABLE public.tickets ADD COLUMN operation_id uuid REFERENCES public.ticket_operations(id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_operations;
