-- Migration 0016 — Trust Experience (Epic 2)
-- Sprint 1.5.3 — Trust Signals, Signal Provenance, Reviews, Moderation, Timeline
-- INSERT-ONLY: review_history (no updated_at, no deleted_at)
-- Soft-delete: merchant_reviews (deleted_at)

-- ── trust_signals ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_signals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type    text NOT NULL,
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'expired', 'revoked')),
  category       text NOT NULL
                   CHECK (category IN ('identity', 'business', 'operational', 'compliance')),
  title          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  evidence_summary text NOT NULL DEFAULT '',
  source         text NOT NULL DEFAULT 'admin',
  sort_order     int NOT NULL DEFAULT 0,
  issued_at      timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  is_public      boolean NOT NULL DEFAULT true,
  verification_id uuid REFERENCES merchant_verifications(id) ON DELETE SET NULL,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trust_signals_merchant_idx ON trust_signals (merchant_id);
CREATE INDEX IF NOT EXISTS trust_signals_status_idx   ON trust_signals (status);
CREATE INDEX IF NOT EXISTS trust_signals_type_idx     ON trust_signals (signal_type);

ALTER TABLE trust_signals ENABLE ROW LEVEL SECURITY;

-- Public read for active/public signals
CREATE POLICY "trust_signals_public_read" ON trust_signals
  FOR SELECT USING (is_public = true AND status = 'active');

-- Admins can read all
CREATE POLICY "trust_signals_admin_all" ON trust_signals
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

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

-- Admin read only (provenance is sensitive)
CREATE POLICY "signal_provenance_admin_read" ON signal_provenance
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

CREATE POLICY "signal_provenance_admin_write" ON signal_provenance
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

-- ── merchant_reviews ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS merchant_reviews (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating              int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title               text,
  body                text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'hidden', 'removed')),
  is_verified_purchase boolean NOT NULL DEFAULT false,
  purchase_ref        uuid,
  merchant_reply      text,
  merchant_reply_at   timestamptz,
  edited_at           timestamptz,
  edit_count          int NOT NULL DEFAULT 0,
  helpful_count       int NOT NULL DEFAULT 0,
  report_count        int NOT NULL DEFAULT 0,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  UNIQUE (merchant_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS merchant_reviews_merchant_idx ON merchant_reviews (merchant_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_reviewer_idx ON merchant_reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS merchant_reviews_status_idx   ON merchant_reviews (status);
-- Partial: only active (not soft-deleted) approved reviews are fast to query
CREATE INDEX IF NOT EXISTS merchant_reviews_public_idx
  ON merchant_reviews (merchant_id, rating)
  WHERE status = 'approved' AND deleted_at IS NULL;

ALTER TABLE merchant_reviews ENABLE ROW LEVEL SECURITY;

-- Public read for approved, non-deleted reviews
CREATE POLICY "merchant_reviews_public_read" ON merchant_reviews
  FOR SELECT USING (status = 'approved' AND deleted_at IS NULL);

-- Any authenticated user can create their own review
CREATE POLICY "merchant_reviews_auth_insert" ON merchant_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Reviewer can edit their own pending/approved review
CREATE POLICY "merchant_reviews_reviewer_update" ON merchant_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id AND status IN ('pending', 'approved'))
  WITH CHECK (auth.uid() = reviewer_id);

-- Admin full access
CREATE POLICY "merchant_reviews_admin_all" ON merchant_reviews
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

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
  -- One report per reviewer per review
  UNIQUE (review_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS review_reports_review_idx   ON review_reports (review_id);
CREATE INDEX IF NOT EXISTS review_reports_status_idx   ON review_reports (status);
CREATE INDEX IF NOT EXISTS review_reports_reporter_idx ON review_reports (reporter_id);

ALTER TABLE review_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can report
CREATE POLICY "review_reports_auth_insert" ON review_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Reporter can see their own reports
CREATE POLICY "review_reports_reporter_read" ON review_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admin full access
CREATE POLICY "review_reports_admin_all" ON review_reports
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

-- ── review_history (INSERT-ONLY) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS review_history (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id        uuid NOT NULL REFERENCES merchant_reviews(id) ON DELETE CASCADE,
  merchant_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action           text NOT NULL
                     CHECK (action IN (
                       'created', 'edited', 'approved', 'hidden', 'removed',
                       'restored', 'merchant_replied', 'report_added', 'marked_helpful'
                     )),
  previous_body    text,
  new_body         text,
  previous_status  text,
  new_status       text,
  performed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role text,
  reason           text,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now()
  -- No updated_at, no deleted_at — INSERT ONLY
);

CREATE INDEX IF NOT EXISTS review_history_review_idx   ON review_history (review_id);
CREATE INDEX IF NOT EXISTS review_history_merchant_idx ON review_history (merchant_id);

ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Admin read
CREATE POLICY "review_history_admin_read" ON review_history
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

-- Admin write (moderation actions)
CREATE POLICY "review_history_admin_insert" ON review_history
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

-- Service role can insert (for system actions)
CREATE POLICY "review_history_service_insert" ON review_history
  FOR INSERT WITH CHECK (true);

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

-- Public events visible to all
CREATE POLICY "merchant_timeline_public_read" ON merchant_timeline
  FOR SELECT USING (visibility = 'public');

-- Merchant reads their own (all visibility levels)
CREATE POLICY "merchant_timeline_merchant_read" ON merchant_timeline
  FOR SELECT USING (
    merchant_id IN (
      SELECT user_id FROM merchants WHERE user_id = auth.uid()
    )
  );

-- Admin full access
CREATE POLICY "merchant_timeline_admin_all" ON merchant_timeline
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users WHERE is_active = true
    )
  );

-- Service role insert (triggered by other services)
CREATE POLICY "merchant_timeline_service_insert" ON merchant_timeline
  FOR INSERT WITH CHECK (true);

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS merchant_timeline CASCADE;
-- DROP TABLE IF EXISTS review_history CASCADE;
-- DROP TABLE IF EXISTS review_reports CASCADE;
-- DROP TABLE IF EXISTS merchant_reviews CASCADE;
-- DROP TABLE IF EXISTS signal_provenance CASCADE;
-- DROP TABLE IF EXISTS trust_signals CASCADE;
