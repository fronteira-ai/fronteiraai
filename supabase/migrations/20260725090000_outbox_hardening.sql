-- ============================================================
-- Outbox Hardening — Priority, Expiration, Historical Bootstrap Checkpoint
-- (Program Ω — Mission Ω-Hardening)
-- Status: PRONTO PARA EXECUÇÃO
-- Rollback: total e seguro.
--   - `priority` em canonical_suggestion_outbox: coluna nova, NOT NULL
--     DEFAULT 'normal' — toda linha existente recebe o valor padrão
--     automaticamente, nenhum comportamento de leitura/escrita anterior
--     muda (claimBatch já ordenava só por next_attempt_at/claimed_at;
--     passa a também considerar priority, sempre 'normal' para tudo
--     enfileirado antes desta migration — equivalente ao comportamento
--     anterior).
--   - 'expired' no CHECK de status: união de um novo valor permitido,
--     nenhum valor existente invalidado.
--   - `canonical_bootstrap_checkpoint`: tabela nova e aditiva, de
--     propriedade de connectors/. DROP TABLE não quebra nada fora desta
--     migration.
--   Nenhuma tabela de canonical-catalog/, product-identity/ ou qualquer
--   outro domínio é tocada.
-- ============================================================

-- 1. Prioridade — permite que futuros conectores/chamadores enfileirem
--    com prioridade diferente sem qualquer mudança de arquitetura
--    (enqueue() já aceita um parâmetro opcional, default 'normal' —
--    CanonicalLinkStage continua chamando com a assinatura de 2
--    argumentos de sempre, comportamento idêntico).
ALTER TABLE canonical_suggestion_outbox
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('high', 'normal', 'low'));

CREATE INDEX IF NOT EXISTS idx_cso_priority_created
  ON canonical_suggestion_outbox (priority, created_at);

-- 2. Status 'expired' — item que permaneceu tempo demais em retry
--    (medido por enqueued_at, independente da contagem de attempts —
--    uma rede de segurança complementar ao dead_letter por
--    MAX_ATTEMPTS, nunca um substituto dele). Precisa recriar o CHECK
--    constraint (Postgres não tem "ALTER CHECK" direto).
ALTER TABLE canonical_suggestion_outbox
  DROP CONSTRAINT IF EXISTS canonical_suggestion_outbox_status_check;

ALTER TABLE canonical_suggestion_outbox
  ADD CONSTRAINT canonical_suggestion_outbox_status_check
  CHECK (status IN ('pending', 'processing', 'done', 'failed', 'dead_letter', 'expired'));

CREATE INDEX IF NOT EXISTS idx_cso_expired ON canonical_suggestion_outbox (status) WHERE status = 'expired';

COMMENT ON COLUMN canonical_suggestion_outbox.priority IS
  'Mission Ω-Hardening. HIGH/NORMAL/LOW — claimBatch() ordena por '
  'prioridade primeiro, created_at em segundo. Default NORMAL preserva '
  'o comportamento de todo enqueue() já existente.';

-- 3. Checkpoint do Historical Canonical Bootstrap Service — permite
--    retomar processamento de centenas de milhares de produtos
--    históricos após reinício de processo, com cancelamento seguro.
--    Uma linha por execução nomeada (run_key) — nunca uma linha global
--    única, para permitir auditoria de execuções passadas lado a lado.
CREATE TABLE IF NOT EXISTS canonical_bootstrap_checkpoint (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key            text        NOT NULL UNIQUE,
  status             text        NOT NULL DEFAULT 'running'
                                    CHECK (status IN ('running', 'paused', 'cancel_requested', 'cancelled', 'completed', 'failed')),
  last_product_id    uuid,
  processed_count    integer     NOT NULL DEFAULT 0,
  created_count      integer     NOT NULL DEFAULT 0,
  linked_count       integer     NOT NULL DEFAULT 0,
  enqueued_count     integer     NOT NULL DEFAULT 0,
  failed_count       integer     NOT NULL DEFAULT 0,
  last_error         text,
  started_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cbc_status ON canonical_bootstrap_checkpoint (status);

ALTER TABLE canonical_bootstrap_checkpoint ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE canonical_bootstrap_checkpoint IS
  'Mission Ω-Hardening. Checkpoint durável do HistoricalCanonicalBootstrapService '
  '— permite retomada após reinício de processo (keyset em last_product_id, '
  'mesmo padrão de IRecoveryRepository.fetchCandidates) e cancelamento seguro '
  '(operador marca status=cancel_requested; o serviço para após o batch atual, '
  'nunca no meio de um item).';
