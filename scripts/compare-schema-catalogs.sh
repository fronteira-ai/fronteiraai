#!/usr/bin/env bash
# ============================================================
# Sprint 38D FASE 12 — diff deterministico CLOUD × REBUILD.
#
# Uso:
#   CLOUD_DIR=/tmp/paraguai-sprint38d/cloud-snapshot \
#   REBUILD_DIR=/tmp/paraguai-sprint38d/rebuild-snapshot \
#   ./scripts/compare-schema-catalogs.sh
#
# Compara objeto a objeto (nao apenas contagens): tables, columns, pks,
# fks, uniques, checks, indexes, rls, policies, functions, triggers,
# views, matviews, sequences, types + a representacao normalizada (SHA256).
#
# Exit 0  => SEMANTIC_DIFF=0
# Exit 1  => diferencas (detalhe em <REBUILD_DIR>/diff-*.txt); classificar:
#            EXPECTED_PLATFORM_DIFFERENCE | BASELINE_BUG |
#            NORMALIZATION_BUG | UNKNOWN  (nunca "aceitar como equivalente").
# ============================================================
set -euo pipefail

CLOUD_DIR="${CLOUD_DIR:-/tmp/paraguai-sprint38d/cloud-snapshot}"
REBUILD_DIR="${REBUILD_DIR:-/tmp/paraguai-sprint38d/rebuild-snapshot}"
CATEGORIES="tables columns pks fks uniques checks indexes rls policies functions triggers_public triggers_auth_paraguai views matviews sequences types"
diffs=0
for f in $CATEGORIES; do
  if ! diff -u "$CLOUD_DIR/$f.txt" "$REBUILD_DIR/$f.txt" > "$REBUILD_DIR/diff-$f.txt" 2>&1; then
    echo "DIFF: $f  -> $REBUILD_DIR/diff-$f.txt"
    diffs=$((diffs + 1))
  fi
done

echo "----- resumo -----"
for f in $CATEGORIES; do
  printf '%-22s cloud=%-4s rebuild=%s\n' "$f" "$(wc -l < "$CLOUD_DIR/$f.txt")" "$(wc -l < "$REBUILD_DIR/$f.txt")"
done
echo "CLOUD   SHA: $(cut -d' ' -f1 "$CLOUD_DIR/SHA256.txt")"
echo "REBUILD SHA: $(cut -d' ' -f1 "$REBUILD_DIR/SHA256.txt")"
echo "extensions (informacional, fora do SEMANTIC_DIFF — EXPECTED_PLATFORM_DIFFERENCE): cloud=$(wc -l < "$CLOUD_DIR/extensions.txt") rebuild=$(wc -l < "$REBUILD_DIR/extensions.txt")"

if [ "$diffs" -eq 0 ] && cmp -s "$CLOUD_DIR/NORMALIZED.txt" "$REBUILD_DIR/NORMALIZED.txt"; then
  echo "SEMANTIC_DIFF=0 — CLOUD_SCHEMA == REBUILT_SCHEMA"
  exit 0
fi

echo "SEMANTIC_DIFF=$diffs (categorias) + NORMALIZED $(cmp -s "$CLOUD_DIR/NORMALIZED.txt" "$REBUILD_DIR/NORMALIZED.txt" && echo igual || echo diferente)"
echo "CLASSIFICAR cada diff: EXPECTED_PLATFORM_DIFFERENCE | BASELINE_BUG | NORMALIZATION_BUG | UNKNOWN"
exit 1
