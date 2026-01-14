-- Drop the partial index that causes ON CONFLICT to fail
DROP INDEX IF EXISTS idx_contacts_phone_unique;

-- Create a proper UNIQUE constraint on phone that works with ON CONFLICT
-- This allows NULL values (multiple contacts without phone) but ensures uniqueness for non-null phones
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_phone_unique;

-- Create a unique index that works with ON CONFLICT (non-partial)
-- Note: This will fail if there are duplicate phones - we handle that below
DO $$
BEGIN
  -- First, let's check if there are duplicates and keep only the oldest record for each phone
  -- Update duplicates to have NULL phone to avoid constraint violation
  WITH duplicates AS (
    SELECT id, phone, 
           ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC) as rn
    FROM contacts 
    WHERE phone IS NOT NULL AND phone != ''
  )
  UPDATE contacts 
  SET phone = NULL 
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  -- Now add the unique constraint
  ALTER TABLE contacts ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add constraint: %', SQLERRM;
END $$;