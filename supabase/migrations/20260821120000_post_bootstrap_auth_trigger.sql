-- ============================================================
-- POS-BOOTSTRAP — reproduz o trigger on_auth_user_created do Cloud
-- Sprint 38D (FASE 4) — dependencia auth.users
--
-- POR QUE ESTE ARQUIVO EXISTE
--
-- O baseline canonico (00000000000000_cloud_baseline.sql) foi extraido com
-- pg_dump --schema=public: ele contem a funcao public.handle_new_user()
-- (SECURITY DEFINER, SET search_path TO 'public'), mas NAO o trigger
-- on_auth_user_created, que vive em auth.users (schema da plataforma,
-- criado pelo GoTrue). No Cloud esse trigger existe e cria o profile a
-- cada novo usuario; reproduzi-lo e necessario para CLOUD_SCHEMA == REBUILD.
--
-- ORDEM: aplicar SOMENTE apos o bootstrap da plataforma (auth.users ja
-- existe). Nunca criar auth.users aqui — pertence ao Supabase.
--
-- Idempotente (DROP TRIGGER IF EXISTS + guarda de schema).
-- ============================================================

DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'auth.users ausente — aplicar esta migration APOS o bootstrap do GoTrue';
  END IF;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
