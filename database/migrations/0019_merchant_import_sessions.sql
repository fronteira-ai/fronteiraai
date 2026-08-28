-- Migration 0019: Merchant Import Sessions (preview → approval → commit lifecycle)
-- Sprint "MERCHANT ACTIVATION & CATALOG COMMIT V1".
--
-- Modelo de sessão de importação: cada upload/preview vira uma sessão com estado
-- determinístico (UPLOADED → VALIDATED → PREVIEW_READY → APPROVED → COMMITTING →
-- COMMITTED/PARTIAL/FAILED/CANCELLED). O preview é IMUTÁVEL: um checksum de
-- fonte + snapshot do mapping + resumo ficam gravados, então o commit opera no
-- MESMO input aprovado (sem surpresas se o arquivo/feed mudar entre preview e
-- commit). ADITIVO — nada existente alterado; rollback trivial (DROP TABLE).

CREATE TABLE IF NOT EXISTS merchant_import_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id         uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  store_id            uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_id           text,
  merchant_user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type         text NOT NULL CHECK (source_type IN ('CSV','XML','JSON','FEED_URL')),
  source_mode         text NOT NULL DEFAULT 'ONE_TIME_UPLOAD'
                      CHECK (source_mode IN ('ONE_TIME_UPLOAD','CONTINUOUS_FEED')),
  status              text NOT NULL DEFAULT 'UPLOADED'
                      CHECK (status IN ('UPLOADED','VALIDATED','PREVIEW_READY','APPROVED',
                                        'COMMITTING','COMMITTED','PARTIAL','FAILED','CANCELLED')),
  -- Contagens (snapshot do preview/plan)
  total_items          integer NOT NULL DEFAULT 0,
  valid_items          integer NOT NULL DEFAULT 0,
  invalid_items        integer NOT NULL DEFAULT 0,
  matched_items        integer NOT NULL DEFAULT 0,
  new_items            integer NOT NULL DEFAULT 0,
  ambiguous_items      integer NOT NULL DEFAULT 0,
  prohibited_items     integer NOT NULL DEFAULT 0,
  unchanged_items      integer NOT NULL DEFAULT 0,
  -- Imutabilidade do preview
  source_checksum      text NOT NULL DEFAULT '',
  mapping_snapshot     jsonb,
  preview_summary      jsonb,
  error_summary        jsonb,
  -- Resultado do commit
  result_summary       jsonb,
  -- Linha do tempo
  filename             text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  validated_at         timestamptz,
  approved_at          timestamptz,
  committed_at         timestamptz
);

CREATE INDEX IF NOT EXISTS merchant_import_sessions_merchant_idx ON merchant_import_sessions(merchant_id);
CREATE INDEX IF NOT EXISTS merchant_import_sessions_store_idx  ON merchant_import_sessions(store_id);
CREATE INDEX IF NOT EXISTS merchant_import_sessions_status_idx  ON merchant_import_sessions(status);
CREATE INDEX IF NOT EXISTS merchant_import_sessions_created_idx ON merchant_import_sessions(created_at DESC);

-- RLS: cada merchant só enxerga suas próprias sessões de import.
ALTER TABLE merchant_import_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_import_sessions_own"
  ON merchant_import_sessions FOR ALL
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));
