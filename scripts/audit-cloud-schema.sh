#!/usr/bin/env bash
# ============================================================
# Sprint 38D FASE 1 — Forensic METADATA-ONLY snapshot do schema `public`.
#
# Deterministico, read-only (apenas consultas de catalogo: information_schema
# e pg_catalog). NUNCA le linhas de negocio.
#
# Uso (host com psql):
#   PGPASSFILE=/run/paraguai/cloud.pgpass ./scripts/audit-cloud-schema.sh [OUTDIR]
#
# Uso contra container descartavel (audita o rebuild):
#   AUDIT_CONTAINER=paraguai-baseline-verify \
#     ./scripts/audit-cloud-schema.sh /tmp/paraguai-sprint38d/rebuild-snapshot
#
# Normalizacao: todo campo de texto e colapsado em um unico espaco
# (regexp_replace '\s+' -> ' ') — comparacao SEMANTICA, insensivel a
# whitespace/pretty-print (qual multilinha de policies, prosrc com CRLF,
# indexdef/constraintdef re-formatados pelo pg_dump, etc).
# 1 linha de saida = 1 objeto. SHA256 sobre a representacao normalizada.
#
# Falha (exit != 0) se as quantidades esperadas divergirem das da Sprint 38C-R.
# ============================================================
set -euo pipefail

NORM="regexp_replace"
CONNINFO="${CLOUD_CONNINFO:-host=aws-1-sa-east-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.acairzpzsklctaqjsukw sslmode=require}"
OUTDIR="${1:-/tmp/paraguai-sprint38d/cloud-snapshot}"
mkdir -p "$OUTDIR"

# Prefixo de comando psql (intencionalmente separado em tokens):
if [ -n "${AUDIT_CONTAINER:-}" ]; then
  PSQL_BASE=(sudo -n docker exec -i "$AUDIT_CONTAINER" psql -U postgres -X -At -F '|')
else
  if [ -n "${PGPASSFILE:-}" ]; then export PGPASSFILE; fi
  PSQL_BASE=(psql "$CONNINFO" -X -At -F '|')
fi

q() { # <name> <sql>
  local name="$1" sql="$2"
  "${PSQL_BASE[@]}" -c "$sql" | LC_ALL=C sort -u > "$OUTDIR/$name.txt"
}

# auxiliares SQL
NZ='regexp_replace'
QW='[[:space:]]+'

q tables          "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;"
q columns         "SELECT table_name||'.'||column_name||'|'||data_type||'|'||is_nullable||'|'||${NZ}(COALESCE(column_default,''),'${QW}',' ','g') FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;"
q pks             "SELECT conrelid::regclass||'|'||conname||'|'||${NZ}(pg_get_constraintdef(oid),'${QW}',' ','g') FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='p' ORDER BY 1;"
q fks             "SELECT conrelid::regclass||'|'||conname||'|'||${NZ}(pg_get_constraintdef(oid),'${QW}',' ','g') FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' ORDER BY 1;"
q uniques         "SELECT conrelid::regclass||'|'||conname||'|'||${NZ}(pg_get_constraintdef(oid),'${QW}',' ','g') FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='u' ORDER BY 1;"
q checks          "SELECT conrelid::regclass||'|'||conname||'|'||${NZ}(pg_get_constraintdef(oid),'${QW}',' ','g') FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='c' ORDER BY 1;"
q indexes         "SELECT tablename||'|'||indexname||'|'||${NZ}(indexdef,'${QW}',' ','g') FROM pg_indexes WHERE schemaname='public' ORDER BY tablename, indexname;"
q rls             "SELECT relname||'|'||relrowsecurity||'|'||relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY 1;"
q policies        "SELECT tablename||'|'||policyname||'|'||permissive||'|'||roles::text||'|'||cmd||'|'||${NZ}(COALESCE(qual,''),'${QW}',' ','g')||'|'||${NZ}(COALESCE(with_check,''),'${QW}',' ','g') FROM pg_policies p WHERE schemaname='public' ORDER BY 1;"
q functions       "SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')|'||p.prosecdef||'|'||COALESCE(array_to_string(p.proconfig,','),'')||'|'||${NZ}(p.prosrc,'${QW}',' ','g') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' ORDER BY 1;"
q triggers_public "SELECT t.tgname||'|'||c.relname||'|'||${NZ}(pg_get_triggerdef(t.oid),'${QW}',' ','g') FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND n.nspname='public' ORDER BY 1;"
q triggers_auth_paraguai "SELECT t.tgname||'|'||c.relname||'|'||${NZ}(pg_get_triggerdef(t.oid),'${QW}',' ','g') FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE NOT t.tgisinternal AND n.nspname='auth' AND pn.nspname='public' ORDER BY 1;"
q views           "SELECT schemaname||'.'||viewname FROM pg_views WHERE schemaname='public' ORDER BY 1;"
q matviews        "SELECT schemaname||'.'||matviewname FROM pg_matviews WHERE schemaname='public' ORDER BY 1;"
q sequences       "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY 1;"
q types           "SELECT t.typname||'|'||t.typtype::text FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d') ORDER BY 1;"
q extensions      "SELECT extname||'|'||extversion FROM pg_extension ORDER BY 1;"

# Representacao normalizada unica (ordem estavel por nome de arquivo).
: > "$OUTDIR/NORMALIZED.txt"
for f in "$OUTDIR"/*.txt; do
  case "$(basename "$f")" in NORMALIZED.txt|SHA256.txt|extensions.txt) continue ;; esac
  cat "$f" >> "$OUTDIR/NORMALIZED.txt"
  printf '\n' >> "$OUTDIR/NORMALIZED.txt"
done
sha256sum "$OUTDIR/NORMALIZED.txt" > "$OUTDIR/SHA256.txt"

# ---- quantidades esperadas (Sprint 38C-R, catalogo real) ----
exp() { # <var> <arquivo> <esperado>
  local var="$1" file="$2" want="$3" got
  got=$(wc -l < "$OUTDIR/$file.txt")
  echo "$var=$got (esperado $want)"
  if [ "${AUDIT_SKIP_EXPECT:-0}" != "1" ] && [ "$got" != "$want" ]; then
    echo "ERRO: $var divergiu (got=$got, want=$want) — schema drift; PARE." >&2
    exit 1
  fi
}
exp TABLES      tables          68
exp INDEXES     indexes         226
exp POLICIES    policies        50
exp FUNCTIONS   functions       2
exp VIEWS       views           0
exp MATVIEWS    matviews        0
exp SEQUENCES   sequences       0
exp TRIG_PUBLIC triggers_public 1
exp TRIG_AUTH   triggers_auth_paraguai 1

echo "snapshot OK: $OUTDIR"
cat "$OUTDIR/SHA256.txt"
