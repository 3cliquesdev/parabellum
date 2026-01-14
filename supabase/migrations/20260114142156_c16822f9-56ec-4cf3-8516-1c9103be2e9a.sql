-- Criar template de saudação para clientes Kiwify validados
INSERT INTO ai_message_templates (key, title, content, description, category, is_active, variables)
VALUES (
  'saudacao_cliente_kiwify',
  'Saudação Cliente Kiwify',
  'Olá, {{contact_name}}! 🎉

Identificamos você automaticamente pelo seu número de WhatsApp.

Como posso te ajudar hoje?',
  'Saudação para clientes identificados automaticamente via telefone Kiwify',
  'saudacao',
  true,
  '["contact_name"]'::json
)
ON CONFLICT (key) DO UPDATE SET
  content = EXCLUDED.content,
  description = EXCLUDED.description,
  updated_at = now();