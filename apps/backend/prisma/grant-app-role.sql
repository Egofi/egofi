-- Attaches a password to the unprivileged runtime role created by the
-- row_level_security migration. Kept out of the migration itself so no password
-- ever lands in version control.
--
-- Run once per environment, as the owner role:
--
--   psql "$DIRECT_DATABASE_URL" -v password="$(openssl rand -hex 24)" -f prisma/grant-app-role.sql
--
-- then point DATABASE_URL at postgres://egofi_app:<password>@host/egofi
--
-- Dev shortcut (matches the DATABASE_URL in .env.example):
--
--   docker exec -i egofi-dev-postgres-1 psql -U egofi -d egofi \
--     -v password=egofi_app_dev -f - < prisma/grant-app-role.sql

ALTER ROLE egofi_app WITH LOGIN PASSWORD :'password';

-- Sanity: this role must never be able to see past a policy.
DO $$
DECLARE
  privileged boolean;
BEGIN
  SELECT rolsuper OR rolbypassrls INTO privileged FROM pg_roles WHERE rolname = 'egofi_app';
  IF privileged THEN
    RAISE EXCEPTION 'egofi_app has SUPERUSER or BYPASSRLS; row-level security would be inactive';
  END IF;
END
$$;
