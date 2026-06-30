-- Migration 0017 — Hotfix: completa o que 0016 deixou incompleto
-- Contexto: 0016 rodou parcialmente duas vezes.
--   Execução 1: parou em "trust_signals_admin_all" (admin_users não existe — já corrigido)
--   Execução 2: parou em "trust_signals_public_read" (policy já existe, PostgreSQL não tem CREATE POLICY IF NOT EXISTS)
-- Esta migration cria o que ficou faltando, de forma totalmente idempotente.
-- Nota: DO blocks usam $do$ como delimitador externo; EXECUTE strings usam $p$.

-- ── trust_signals: política admin faltante ───────────────────────────────────

DO $do$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trust_signals' AND policyname = 'trust_signals_admin_all'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "trust_signals_admin_all" ON trust_signals
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'operator')
          )
        )
    $p$;
  END IF;
END $do$;

-- ── signal_provenance ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signal_provenance (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id        uuid NOT NULL REFERENCES trust_signals(id) ON DELETE CASCADE,
  merchant_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generated_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  verification_id  uuid REFERENCES merchant_verifications(id) ON DELETE SET NULL,
  evidence_summary text NOT NULL DEFAULT '',
  how_obtained     text NOT NULL DEFAULT '',
  approved_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  trust_level      text NOT NULL DEFAULT 'medium'
                     CHECK (trust_level IN ('high', 'medium', 'low')),
  is_auditable     boolean NOT NULL DEFAULT true,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signal_provenance_signal_idx   ON signal_provenance (signal_id);
CREATE INDEX IF NOT EXISTS signal_provenance_merchant_idx ON signal_provenance (merchant_id);

ALTER TABLE signal_provenance ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signal_provenance' AND policyname = 'signal_provenance_admin_read') THEN
    EXECUTE $p$
      CREATE POLICY "signal_provenance_admin_read" ON signal_provenance
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'signal_provenance' AND policyname = 'signal_provenance_admin_write') THEN
    EXECUTE $p$
      CREATE POLICY "signal_provenance_admin_write" ON signal_provenance
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

-- ── merchant_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_reviews (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating               int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title                text,
  body                 text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'hidden', 'removed')),
  is_verified_purchase boolean NOT NULL DEFAULT false,
  purchase_ref         uuid,
  merchant_reply       text,
  merchant_reply_at    timestamptz,
  edited_at            timestamptz,
  edit_count           int NOT NULL DEFAULT 0,
  helpful_count        int NOT NULL DEFAULT 0,
  report_count         int NOT NULL DEFAULT 0,
  metadata             jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz,
  UNIQUE (merchant_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS merchant_reviews_merchant_idx ON merchant_reviews (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_reviewer_idx ON merchant_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_status_idx   ON merchant_reviews (status);
CREATE INDEX IF NOT EXISTS merchant_reviews_public_idx
  ON merchant_reviews (merchant_id, rating)
  WHERE status = 'approved' AND deleted_at IS NULL;

ALTER TABLE merchant_reviews ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_public_read') THEN
    EXECUTE $p$ CREATE POLICY "merchant_reviews_public_read" ON merchant_reviews FOR SELECT USING (status = 'approved' AND deleted_at IS NULL) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_auth_insert') THEN
    EXECUTE $p$ CREATE POLICY "merchant_reviews_auth_insert" ON merchant_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_reviewer_update') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_reviews_reviewer_update" ON merchant_reviews
        FOR UPDATE USING (auth.uid() = reviewer_id AND status IN ('pending', 'approved'))
        WITH CHECK (auth.uid() = reviewer_id)
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_reviews' AND policyname = 'merchant_reviews_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_reviews_admin_all" ON merchant_reviews
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

-- ── review_reports ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       text NOT NULL
                 CHECK (reason IN ('spam', 'fake', 'offensive', 'irrelevant', 'conflict_of_interest', 'other')),
  description  text CHECK (char_length(description) <= 1000),
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  reviewed_by  uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at  timestamptz,
  action_taken text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS review_reports_review_idx   ON review_reports (review_id);
CREATE INDEX IF NOT EXISTS review_reports_status_idx   ON review_reports (status);
CREATE INDEX IF NOT EXISTS review_reports_reporter_idx ON review_reports (reporter_id);

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_reports' AND policyname = 'review_reports_auth_insert') THEN
    EXECUTE $p$ CREATE POLICY "review_reports_auth_insert" ON review_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_reports' AND policyname = 'review_reports_reporter_read') THEN
    EXECUTE $p$ CREATE POLICY "review_reports_reporter_read" ON review_reports FOR SELECT USING (auth.uid() = reporter_id) $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_reports' AND policyname = 'review_reports_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "review_reports_admin_all" ON review_reports
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

-- ── review_history (INSERT-ONLY) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_history (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id         uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action            text NOT NULL
                      CHECK (action IN (
                        'created', 'edited', 'approved', 'hidden', 'removed',
                        'restored', 'merchant_replied', 'report_added', 'marked_helpful'
                      )),
  previous_body     text,
  new_body          text,
  previous_status   text,
  new_status        text,
  performed_by      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role text,
  reason            text,
  metadata          jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_history_review_idx   ON review_history (review_id);
CREATE INDEX IF NOT EXISTS review_history_merchant_idx ON review_history (merchant_id);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_history' AND policyname = 'review_history_admin_read') THEN
    EXECUTE $p$
      CREATE POLICY "review_history_admin_read" ON review_history
        FOR SELECT USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_history' AND policyname = 'review_history_admin_insert') THEN
    EXECUTE $p$
      CREATE POLICY "review_history_admin_insert" ON review_history
        FOR INSERT WITH CHECK (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'review_history' AND policyname = 'review_history_service_insert') THEN
    EXECUTE $p$ CREATE POLICY "review_history_service_insert" ON review_history FOR INSERT WITH CHECK (true) $p$;
  END IF;
END $do$;

-- ── merchant_timeline ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_timeline (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type     text NOT NULL,
  title          text NOT NULL,
  description    text,
  category       text NOT NULL
                   CHECK (category IN ('verification', 'review', 'badge', 'profile', 'operational')),
  reference_id   uuid,
  reference_type text,
  visibility     text NOT NULL DEFAULT 'public'
                   CHECK (visibility IN ('public', 'merchant_only', 'admin_only')),
  occurred_at    timestamptz NOT NULL DEFAULT now(),
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merchant_timeline_merchant_idx    ON merchant_timeline (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_timeline_occurred_idx    ON merchant_timeline (occurred_at DESC);
CREATE INDEX IF NOT EXISTS merchant_timeline_category_idx   ON merchant_timeline (category);
CREATE INDEX IF NOT EXISTS merchant_timeline_visibility_idx ON merchant_timeline (visibility);

ALTER TABLE merchant_timeline ENABLE ROW LEVEL SECURITY;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_public_read') THEN
    EXECUTE $p$ CREATE POLICY "merchant_timeline_public_read" ON merchant_timeline FOR SELECT USING (visibility = 'public') $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_merchant_read') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_timeline_merchant_read" ON merchant_timeline
        FOR SELECT USING (
          merchant_id IN (SELECT user_id FROM merchants WHERE user_id = auth.uid())
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_admin_all') THEN
    EXECUTE $p$
      CREATE POLICY "merchant_timeline_admin_all" ON merchant_timeline
        FOR ALL USING (
          EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator'))
        )
    $p$;
  END IF;
END $do$;

DO $do$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'merchant_timeline' AND policyname = 'merchant_timeline_service_insert') THEN
    EXECUTE $p$ CREATE POLICY "merchant_timeline_service_insert" ON merchant_timeline FOR INSERT WITH CHECK (true) $p$;
  END IF;
END $do$;

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS merchant_timeline CASCADE;
-- DROP TABLE IF EXISTS review_history CASCADE;
-- DROP TABLE IF EXISTS review_reports CASCADE;
-- DROP TABLE IF EXISTS merchant_reviews CASCADE;
-- DROP TABLE IF EXISTS signal_provenance CASCADE;
-- DROP POLICY IF EXISTS "trust_signals_admin_all" ON trust_signals;
