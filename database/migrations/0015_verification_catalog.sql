-- Migration: 0015_verification_catalog
-- Sprint 1.5.2 — Merchant Verification System
-- Creates: verification_types (catalog), verification_evidence, verification_history (audit)
-- Alters: merchant_verifications — expands CHECK constraints for new types and revoked status

-- ─── 1. Expand merchant_verifications.status to include 'revoked' ─────────────

ALTER TABLE merchant_verifications
  DROP CONSTRAINT IF EXISTS merchant_verifications_status_check;

ALTER TABLE merchant_verifications
  ADD CONSTRAINT merchant_verifications_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'revoked'));

-- ─── 2. Expand merchant_verifications.verification_type ───────────────────────

ALTER TABLE merchant_verifications
  DROP CONSTRAINT IF EXISTS merchant_verifications_verification_type_check;

ALTER TABLE merchant_verifications
  ADD CONSTRAINT merchant_verifications_verification_type_check
  CHECK (verification_type IN (
    -- Sprint 1.5.1 — legacy
    'document', 'address', 'phone', 'email', 'bank', 'social_media', 'manual',
    -- Sprint 1.5.2 — semantic
    'identity', 'company', 'location', 'contact', 'hours', 'operation', 'partner', 'documentation'
  ));

-- ─── 3. Verification Types catalog ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verification_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        text NOT NULL CHECK (category IN ('identity', 'business', 'operational', 'compliance')),
  requires_evidence boolean NOT NULL DEFAULT false,
  validity_days   integer NULL CHECK (validity_days IS NULL OR validity_days > 0),
  sort_order      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed: catalog entries for all verification types
INSERT INTO verification_types (label, description, category, requires_evidence, validity_days, sort_order) VALUES
  ('Identidade',          'Verificação de identidade do responsável legal pela loja',       'identity',    true,  730, 10),
  ('Empresa',             'CNPJ ou registro empresarial confirmado',                        'business',    true,  365, 20),
  ('Localização',         'Endereço físico da loja confirmado',                             'business',    true,  365, 30),
  ('Contato',             'Dados de contato (telefone e e-mail) verificados',               'business',    false, 365, 40),
  ('Horários',            'Horário de funcionamento validado',                              'operational', false, 180, 50),
  ('Operação',            'Loja com histórico consistente de operação ativa',               'operational', false, NULL, 60),
  ('Parceiro Oficial',    'Relacionamento oficial com fabricante ou distribuidor confirmado','compliance',  true,  365, 70),
  ('Documentação',        'Documentação regulatória e fiscal verificada',                   'compliance',  true,  365, 80),
  -- Legacy types
  ('Documento',           'Documento oficial enviado e validado',                           'identity',    true,  730, 90),
  ('Endereço',            'Comprovante de endereço verificado',                             'business',    true,  365, 100),
  ('Telefone',            'Número de telefone verificado por chamada ou SMS',               'business',    false, 365, 110),
  ('E-mail',              'Endereço de e-mail verificado',                                  'business',    false, 365, 120),
  ('Conta Bancária',      'Conta bancária verificada para recebimentos',                    'compliance',  true,  365, 130),
  ('Redes Sociais',       'Perfis em redes sociais confirmados como oficiais',              'business',    false, NULL, 140),
  ('Verificação Manual',  'Verificação manual realizada por agente da ParaguAI',            'identity',    false, 365, 150)
ON CONFLICT DO NOTHING;

-- ─── 4. Verification Evidence ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS verification_evidence (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id     uuid NOT NULL REFERENCES merchant_verifications(id) ON DELETE CASCADE,
  merchant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evidence_type       text NOT NULL CHECK (evidence_type IN ('document', 'image', 'url', 'text', 'json')),
  label               text NOT NULL,
  content             text NULL,
  file_path           text NULL,
  mime_type           text NULL,
  file_size_bytes     bigint NULL CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  uploaded_by         uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_valid            boolean NULL,
  review_note         text NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_verification_evidence_verification_id ON verification_evidence(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_evidence_merchant_id ON verification_evidence(merchant_id);
CREATE INDEX IF NOT EXISTS idx_verification_evidence_active ON verification_evidence(verification_id) WHERE deleted_at IS NULL;

-- ─── 5. Verification History (audit log — INSERT-ONLY) ───────────────────────

CREATE TABLE IF NOT EXISTS verification_history (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id     uuid NOT NULL REFERENCES merchant_verifications(id) ON DELETE CASCADE,
  merchant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action              text NOT NULL CHECK (action IN (
    'created', 'submitted', 'approved', 'rejected', 'revoked',
    'expired', 'evidence_added', 'evidence_removed', 'metadata_updated'
  )),
  previous_status     text NULL,
  new_status          text NULL,
  performed_by        uuid NULL REFERENCES profiles(id) ON DELETE SET NULL,
  performed_by_role   text NULL CHECK (performed_by_role IN ('admin', 'merchant', 'system', 'buyer')),
  reason              text NULL,
  metadata            jsonb NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now()
  -- No updated_at, no deleted_at — this table is INSERT-ONLY
);

CREATE INDEX IF NOT EXISTS idx_verification_history_verification_id ON verification_history(verification_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_merchant_id ON verification_history(merchant_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_created_at ON verification_history(created_at DESC);

-- ─── 6. RLS Policies ─────────────────────────────────────────────────────────

ALTER TABLE verification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_history ENABLE ROW LEVEL SECURITY;

-- verification_types: public read, admin write
CREATE POLICY "Public can read active verification types"
  ON verification_types FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage verification types"
  ON verification_types FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- verification_evidence: merchant reads own, admin reads all, service role writes
CREATE POLICY "Merchant reads own evidence"
  ON verification_evidence FOR SELECT
  USING (
    merchant_id = auth.uid() AND deleted_at IS NULL
  );

CREATE POLICY "Admin reads all evidence"
  ON verification_evidence FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- verification_history: merchant reads own, admin reads all
CREATE POLICY "Merchant reads own verification history"
  ON verification_history FOR SELECT
  USING (merchant_id = auth.uid());

CREATE POLICY "Admin reads all verification history"
  ON verification_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ─── ROLLBACK ────────────────────────────────────────────────────────────────
-- To rollback this migration:
--
-- DROP TABLE IF EXISTS verification_history;
-- DROP TABLE IF EXISTS verification_evidence;
-- DROP TABLE IF EXISTS verification_types;
--
-- ALTER TABLE merchant_verifications
--   DROP CONSTRAINT IF EXISTS merchant_verifications_status_check;
-- ALTER TABLE merchant_verifications
--   ADD CONSTRAINT merchant_verifications_status_check
--   CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
--
-- ALTER TABLE merchant_verifications
--   DROP CONSTRAINT IF EXISTS merchant_verifications_verification_type_check;
-- ALTER TABLE merchant_verifications
--   ADD CONSTRAINT merchant_verifications_verification_type_check
--   CHECK (verification_type IN ('document', 'address', 'phone', 'email', 'bank', 'social_media', 'manual'));
