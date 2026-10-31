-- Applied to Supabase project hbjonoxlasbhbusctmom on 2026-10-31.
-- Keep anon read access only for public plans. RLS remains enabled on all public tables.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE public.plans TO anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Authenticated users retain DML grants; RLS policies decide which rows/actions are allowed.
-- Remove non-application table privileges that RLS does not constrain.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Helper/trigger functions should not be callable by anonymous users or PUBLIC.
REVOKE EXECUTE ON FUNCTION public.get_customer_code(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_code(bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.nexus_assign_customer_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
