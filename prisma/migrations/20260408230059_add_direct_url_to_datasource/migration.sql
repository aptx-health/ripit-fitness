-- Schema-only change: add `directUrl = env("DIRECT_URL")` to the datasource
-- block in schema.prisma. No DDL required — this tells Prisma which
-- connection string to use for `migrate deploy` (direct to Postgres, bypassing
-- PgBouncer) without affecting runtime queries.
--
-- See docs/DATABASE_CONNECTIONS.md for context.
SELECT 1;
