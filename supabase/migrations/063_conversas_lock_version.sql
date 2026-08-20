-- Trava otimista contra corrida entre atendentes (assumir/transferir/resolver
-- simultaneos numa mesma conversa). lock_version incrementa a cada UPDATE via
-- trigger; operacoes concorrentes condicionam o UPDATE final ao valor lido no
-- inicio da operacao - se alguem mexeu na linha nesse meio tempo, 0 linhas sao
-- afetadas e o chamador sabe que perdeu a corrida, em vez de sobrescrever
-- silenciosamente o que a outra operacao gravou.
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION bump_conversas_lock_version()
RETURNS trigger AS $$
BEGIN
  NEW.lock_version = OLD.lock_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversas_lock_version ON conversas;
CREATE TRIGGER conversas_lock_version
  BEFORE UPDATE ON conversas
  FOR EACH ROW
  EXECUTE FUNCTION bump_conversas_lock_version();

-- Duracao (em segundos) de mensagens de audio - preenchida pelo client no
-- momento da gravacao (nota de voz); mensagens recebidas do lead ficam null
-- (a Meta nao manda essa informacao no webhook).
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS media_duracao_seg integer;
