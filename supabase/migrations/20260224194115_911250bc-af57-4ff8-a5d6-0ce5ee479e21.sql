
ALTER TABLE public.chat_flow_states DROP CONSTRAINT chat_flow_states_status_check;
ALTER TABLE public.chat_flow_states ADD CONSTRAINT chat_flow_states_status_check 
  CHECK (status = ANY (ARRAY['active', 'completed', 'abandoned', 'transferred', 'cancelled']));
