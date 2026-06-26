-- ============================================================
-- 0009 — Admin Platform: profiles + import_logs
-- Status: PRONTO PARA EXECUÇÃO (Release 1.0)
-- ============================================================
--
-- Cria:
-- 1. profiles — vincula auth.users ao sistema de papéis do admin
-- 2. import_logs — histórico de importações (Acquisition Engine)
--
-- Idempotente: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE.
--
-- APÓS APLICAR:
-- 1. Crie um usuário em Supabase Dashboard → Authentication → Users
-- 2. Execute o SQL abaixo (substitua pelo seu e-mail):
--    UPDATE profiles SET role = 'admin'
--    WHERE email = 'danielscaramello21@gmail.com';
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — Tabela profiles
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'operator'
    CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'operator')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read"
  ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — Trigger: auto-cria profile ao cadastrar usuário
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — Tabela import_logs
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text NOT NULL,
  batch_id text NOT NULL,
  dry_run boolean NOT NULL DEFAULT false,
  success boolean NOT NULL DEFAULT false,
  total_raw integer NOT NULL DEFAULT 0,
  total_persisted integer NOT NULL DEFAULT 0,
  total_errors integer NOT NULL DEFAULT 0,
  metrics jsonb DEFAULT '{}'::jsonb,
  errors jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- import_logs: somente service_role escreve; admin lê via API (service_role)
-- Nenhuma policy pública necessária — leituras ocorrem pelo painel admin
-- via service role, que bypassa RLS.

-- ──────────────────────────────────────────────────────────
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ──────────────────────────────────────────────────────────

SELECT table_name, row_security
FROM information_schema.tables
WHERE table_name IN ('profiles', 'import_logs')
  AND table_schema = 'public'
ORDER BY table_name;

SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
