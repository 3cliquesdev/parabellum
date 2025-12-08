-- Vincular deals a contatos existentes pelo email
-- Corrige 81+ deals onde contact_id é NULL mas existe contato com mesmo email
UPDATE deals d
SET contact_id = c.id
FROM contacts c
WHERE d.contact_id IS NULL
  AND d.lead_email IS NOT NULL
  AND LOWER(TRIM(d.lead_email)) = LOWER(TRIM(c.email))
  AND c.email IS NOT NULL;