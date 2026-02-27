-- B2: Migrate Supabase Auth users to BetterAuth tables
-- Preserves UUIDs (no changes needed in 16 app tables) and bcrypt password hashes
--
-- Usage:
--   doppler run --config <config> -- bash -c 'psql "$DATABASE_URL" -f scripts/migrate-supabase-users-to-betterauth.sql'
--
-- Run the BetterAuth table creation migration first:
--   doppler run --config <config> -- bash -c 'psql "$DATABASE_URL" -f better-auth_migrations/2026-02-27T00-36-22.044Z.sql'

BEGIN;

-- 1. Migrate users (preserve Supabase UUIDs)
INSERT INTO public."user" (id, name, email, "emailVerified", image, "createdAt", "updatedAt")
SELECT
  au.id::text,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  au.email,
  (au.email_confirmed_at IS NOT NULL),
  au.raw_user_meta_data->>'avatar_url',
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public."user" u WHERE u.id = au.id::text)
ORDER BY au.created_at;

-- 2. Migrate password credentials (preserve bcrypt hashes)
INSERT INTO public.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  au.email,
  'credential',
  au.id::text,
  au.encrypted_password,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.deleted_at IS NULL
  AND au.encrypted_password IS NOT NULL
  AND au.encrypted_password != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.account a
    WHERE a."userId" = au.id::text AND a."providerId" = 'credential'
  )
ORDER BY au.created_at;

COMMIT;

-- Verify
SELECT 'Users migrated:' as status, count(*) as count FROM public."user";
SELECT 'Accounts migrated:' as status, count(*) as count FROM public.account WHERE "providerId" = 'credential';
