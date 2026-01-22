-- Inserir status "Retorno" para quando ticket volta ao agente anterior
INSERT INTO public.ticket_statuses (
  name, 
  label, 
  color, 
  icon, 
  display_order, 
  is_archived_status, 
  is_final_status, 
  is_active,
  description
) VALUES (
  'returned',
  'Retorno',
  '#8B5CF6',
  'rotate-ccw',
  2,
  false,
  false,
  true,
  'Ticket retornou para o agente anterior'
) ON CONFLICT (name) DO NOTHING;