-- TTS na persona
ALTER TABLE personas
  ADD COLUMN IF NOT EXISTS responder_com_audio boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS voz_tts text DEFAULT 'pt-BR-feminina';
