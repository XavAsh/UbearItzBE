-- Backfill legacy enum values after renaming roles:
-- CUSTOMER -> USER
-- OWNER -> RESTAURANT
UPDATE "User"
SET "role" = 'USER'
WHERE "role" = 'CUSTOMER';

UPDATE "User"
SET "role" = 'RESTAURANT'
WHERE "role" = 'OWNER';

