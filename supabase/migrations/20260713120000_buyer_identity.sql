-- ============================================================
-- Buyer Identity Model — Release 2.0, Wave 1
-- Status: PRONTO PARA EXECUÇÃO
-- ============================================================
--
-- Implementa a arquitetura já decidida e nunca construída em
-- docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md (ADR-045/046):
--
-- 1. buyers              — aggregate root de comprador, independente de
--                           auth.users/profiles (sobrevive à anonimização)
-- 2. buyer_consent_log   — prova de consentimento, append-only, nunca
--                           anonimizado (é o próprio registro de conformidade)
-- 3. buyer_events/buyer_sessions.buyers_id — coluna aditiva, aponta para
--                           buyers.id em vez de auth.users(id) diretamente
--                           (a coluna antiga buyer_id é mantida nesta
--                           migration — nunca teve dado real, mas remover
--                           uma coluna é uma mudança separada e revisada à
--                           parte, não silenciosamente empacotada aqui)
-- 4. handle_new_user() passa a respeitar um marcador opcional
--    (raw_user_meta_data->>'is_buyer') — nenhum fluxo existente (merchant/
--    admin) passa esse marcador, então o comportamento atual não muda; um
--    futuro fluxo de cadastro de comprador poderá optar por não receber
--    uma linha em profiles (ADR-046 já nomeia isso como pré-requisito)
-- 5. Rate limiting real em buyer_events/buyer_sessions — a Wave 6 do
--    Release 1.8 (Program 0) já tinha encontrado que o comentário "a API
--    valida rate limit" nesta mesma tabela (migration
--    20260702090000_analytics_platform.sql) era falso; corrigido aqui via
--    trigger de banco (funciona independente de qual rota faz o insert)
--
-- Verificação: nenhuma migration de Database Migration System V2 embute
-- verificação — ver docs/engineering/DATABASE_ENGINEERING.md.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- PARTE 1 — buyers (aggregate root)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyers (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nunca ON DELETE CASCADE: a identidade sobrevive ao apagamento da conta
  -- de autenticação, na forma anonimizada (ver anonymized_at).
  auth_user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email              text        DEFAULT NULL,
  email_verified_at  timestamptz DEFAULT NULL,
  display_name       text        DEFAULT NULL,
  phone              text        DEFAULT NULL,
  marketing_opt_in   boolean     NOT NULL DEFAULT false,
  anonymized_at      timestamptz DEFAULT NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyers_auth_user_id
  ON buyers (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_buyers_email
  ON buyers (email)
  WHERE email IS NOT NULL AND anonymized_at IS NULL;

-- ──────────────────────────────────────────────────────────
-- PARTE 2 — buyer_consent_log (append-only, nunca anonimizado)
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buyer_consent_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id     uuid        NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  consent_type text        NOT NULL,
  granted      boolean     NOT NULL,
  metadata     jsonb       DEFAULT '{}'::jsonb,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_consent_log_buyer
  ON buyer_consent_log (buyer_id, recorded_at DESC);

-- ──────────────────────────────────────────────────────────
-- PARTE 3 — buyer_events/buyer_sessions: coluna aditiva buyers_id
-- ──────────────────────────────────────────────────────────

ALTER TABLE buyer_events
  ADD COLUMN IF NOT EXISTS buyers_id uuid REFERENCES buyers(id) ON DELETE SET NULL;

ALTER TABLE buyer_sessions
  ADD COLUMN IF NOT EXISTS buyers_id uuid REFERENCES buyers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buyer_events_buyers_id
  ON buyer_events (buyers_id, occurred_at DESC)
  WHERE buyers_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_buyer_sessions_buyers_id
  ON buyer_sessions (buyers_id, started_at DESC)
  WHERE buyers_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────
-- PARTE 4 — handle_new_user(): respeita o marcador is_buyer
-- ──────────────────────────────────────────────────────────
-- Nenhum fluxo existente (merchant/admin) passa
-- raw_user_meta_data->>'is_buyer' — o comportamento hoje (toda linha nova
-- em auth.users ganha uma linha em profiles com role='operator') continua
-- idêntico para eles. Um futuro fluxo de cadastro de comprador passa
-- { data: { is_buyer: true } } em supabase.auth.signUp() para pular esta
-- inserção (ADR-046: comprador nunca usa profiles).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE((NEW.raw_user_meta_data ->> 'is_buyer')::boolean, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────
-- PARTE 5 — Rate limiting real em buyer_events/buyer_sessions
-- ──────────────────────────────────────────────────────────
-- Limites generosos o bastante para não afetar uso legítimo
-- (EventPlatformService já envia em lotes de até 50 eventos por chamada —
-- ver src/domains/merchant-analytics/services/EventPlatformService.ts) mas
-- reais o bastante para bloquear um flood óbvio. Aplicado em nível de
-- banco (trigger BEFORE INSERT) para funcionar independentemente de qual
-- rota realiza o insert — defesa em profundidade, não só na API.

CREATE OR REPLACE FUNCTION public.enforce_buyer_events_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM buyer_events
  WHERE anonymous_id = NEW.anonymous_id
    AND occurred_at > now() - interval '5 minutes';

  IF recent_count >= 300 THEN
    RAISE EXCEPTION 'rate limit exceeded for anonymous_id %', NEW.anonymous_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyer_events_rate_limit ON buyer_events;
CREATE TRIGGER trg_buyer_events_rate_limit
  BEFORE INSERT ON buyer_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_buyer_events_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_buyer_sessions_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM buyer_sessions
  WHERE anonymous_id = NEW.anonymous_id
    AND started_at > now() - interval '1 hour';

  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'rate limit exceeded for anonymous_id %', NEW.anonymous_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_buyer_sessions_rate_limit ON buyer_sessions;
CREATE TRIGGER trg_buyer_sessions_rate_limit
  BEFORE INSERT ON buyer_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_buyer_sessions_rate_limit();

-- Hardening complementar: teto de tamanho de payload (RLS/CHECK não
-- substituem o rate limit acima, mas fecham o caso de poucos eventos
-- gigantes em vez de muitos pequenos).
ALTER TABLE buyer_events
  ADD CONSTRAINT IF NOT EXISTS buyer_events_page_url_length CHECK (char_length(page_url) <= 2048),
  ADD CONSTRAINT IF NOT EXISTS buyer_events_referrer_length CHECK (referrer IS NULL OR char_length(referrer) <= 2048),
  ADD CONSTRAINT IF NOT EXISTS buyer_events_search_query_length CHECK (search_query IS NULL OR char_length(search_query) <= 512),
  ADD CONSTRAINT IF NOT EXISTS buyer_events_metadata_size CHECK (pg_column_size(metadata) <= 8192);

-- Corrige o comentário que a Wave 6 do Release 1.8 já havia identificado
-- como falso (a API nunca validou rate limit de fato).
COMMENT ON POLICY buyer_events_insert ON buyer_events IS
  'Insert público (anon+authenticated) para tracking anônimo. Rate limiting real: trigger trg_buyer_events_rate_limit (Release 2.0), não a API.';
COMMENT ON POLICY buyer_sessions_insert ON buyer_sessions IS
  'Insert público (anon+authenticated) para sessão anônima. Rate limiting real: trigger trg_buyer_sessions_rate_limit (Release 2.0), não a API.';

-- ──────────────────────────────────────────────────────────
-- RLS — buyers
-- ──────────────────────────────────────────────────────────
-- Tabela de identidade com PII — nunca legível pela chave anônima.
-- Leitura/escrita só via service_role (mesma postura de merchants/profiles
-- para dado sensível equivalente); o próprio comprador autenticado lê seu
-- registro através de uma API que usa service_role após validar a sessão
-- (mesmo padrão de requireMerchant()/lib/merchant-auth.ts), nunca via RLS
-- direta com auth.uid() nesta fase (não há sessão de comprador ainda).

ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy pública criada — service_role bypassa RLS por padrão.

-- ──────────────────────────────────────────────────────────
-- RLS — buyer_consent_log
-- ──────────────────────────────────────────────────────────
-- Mesma postura: sem policy pública. A prova de consentimento é gravada
-- exclusivamente por código server-side com service_role.

ALTER TABLE buyer_consent_log ENABLE ROW LEVEL SECURITY;
