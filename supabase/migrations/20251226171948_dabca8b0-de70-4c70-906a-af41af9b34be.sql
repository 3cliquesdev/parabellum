-- =============================================
-- MIGRATION: Adicionar número de protocolo sequencial aos tickets
-- Formato: TK-2025-00001 (TK + ano + sequência de 5 dígitos)
-- =============================================

-- 1. Adicionar coluna ticket_number
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS ticket_number TEXT UNIQUE;

-- 2. Criar índice para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);

-- 3. Criar função para gerar número sequencial
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_sequence INTEGER;
  new_ticket_number TEXT;
BEGIN
  -- Obter ano atual
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  -- Buscar próximo número da sequência para o ano atual
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(ticket_number FROM 'TK-' || current_year || '-(\d+)') 
      AS INTEGER
    )
  ), 0) + 1
  INTO next_sequence
  FROM public.tickets
  WHERE ticket_number LIKE 'TK-' || current_year || '-%';
  
  -- Formatar número: TK-YYYY-NNNNN
  new_ticket_number := 'TK-' || current_year || '-' || LPAD(next_sequence::TEXT, 5, '0');
  
  -- Atribuir ao novo registro
  NEW.ticket_number := new_ticket_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Criar trigger para gerar número automaticamente
DROP TRIGGER IF EXISTS set_ticket_number ON public.tickets;
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.generate_ticket_number();

-- 5. Atualizar tickets existentes com números retroativos
-- (ordenados por created_at para manter sequência cronológica)
DO $$
DECLARE
  ticket_record RECORD;
  ticket_year TEXT;
  year_sequence INTEGER;
  last_year TEXT := '';
BEGIN
  -- Iterar sobre todos os tickets sem número, ordenados por data
  FOR ticket_record IN 
    SELECT id, created_at 
    FROM public.tickets 
    WHERE ticket_number IS NULL 
    ORDER BY created_at ASC
  LOOP
    -- Obter ano do ticket
    ticket_year := to_char(ticket_record.created_at, 'YYYY');
    
    -- Resetar sequência se mudou de ano
    IF ticket_year != last_year THEN
      -- Buscar última sequência usada para este ano
      SELECT COALESCE(MAX(
        CAST(
          SUBSTRING(ticket_number FROM 'TK-' || ticket_year || '-(\d+)') 
          AS INTEGER
        )
      ), 0)
      INTO year_sequence
      FROM public.tickets
      WHERE ticket_number LIKE 'TK-' || ticket_year || '-%';
      
      last_year := ticket_year;
    END IF;
    
    -- Incrementar sequência
    year_sequence := year_sequence + 1;
    
    -- Atualizar ticket
    UPDATE public.tickets
    SET ticket_number = 'TK-' || ticket_year || '-' || LPAD(year_sequence::TEXT, 5, '0')
    WHERE id = ticket_record.id;
  END LOOP;
END;
$$;