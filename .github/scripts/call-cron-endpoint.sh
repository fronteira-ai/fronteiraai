#!/usr/bin/env bash
# Hardened HTTP trigger for a single /api/cron/* endpoint (RC-3 Final
# Hardening). Shared by every job in high-frequency-crons.yml so the
# retry/timeout/logging behavior lives in one place, not copy-pasted per
# endpoint.
#
# Usage: call-cron-endpoint.sh <name> <url>
# Requires CRON_SECRET in the environment.
#
# Behavior:
#   - explicit per-attempt timeout (curl --max-time)
#   - up to 3 attempts, exponential backoff (2s, 4s) between retries
#   - logs endpoint, timestamp, duration, HTTP status, and outcome for
#     every attempt
#   - exits non-zero (fails the step/job/workflow) with a ::error::
#     annotation if all attempts are exhausted
set -uo pipefail

NAME="${1:?usage: call-cron-endpoint.sh <name> <url>}"
URL="${2:?usage: call-cron-endpoint.sh <name> <url>}"
: "${CRON_SECRET:?CRON_SECRET env var is required}"

readonly MAX_ATTEMPTS=3
# Hotfix (2026-07-30): was 20s, too short for merge-suggestions, whose
# route.ts deliberately runs up to its own maxDuration=60s (deadline-aware
# hotfix, 2026-07-29). 70 = maxDuration (60s, the platform's guaranteed
# ceiling) + 10s margin for TLS/routing/cold-start overhead not captured
# by the endpoint's own in-process timing. Anchored to that ceiling, not
# to any single observed sample, so no real 200 or 504 is ever missed by
# the client giving up early.
readonly TIMEOUT_SECONDS=70
backoff_seconds=2

attempt=1
http_status="000"
curl_exit=1

while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  started_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  start_ms=$(date +%s%3N)

  if response=$(curl --silent --show-error --max-time "$TIMEOUT_SECONDS" \
        --write-out "\n%{http_code}" \
        -H "Authorization: Bearer ${CRON_SECRET}" \
        "$URL" 2>&1); then
    http_status=$(printf '%s' "$response" | tail -n1)
    curl_exit=0
  else
    curl_exit=$?
    http_status="000"
  fi

  end_ms=$(date +%s%3N)
  duration_ms=$((end_ms - start_ms))

  if [ "$curl_exit" -eq 0 ] && [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
    echo "[cron] endpoint=${NAME} url=${URL} attempt=${attempt}/${MAX_ATTEMPTS} started_at=${started_at} duration_ms=${duration_ms} http_status=${http_status} result=success"
    exit 0
  fi

  echo "[cron] endpoint=${NAME} url=${URL} attempt=${attempt}/${MAX_ATTEMPTS} started_at=${started_at} duration_ms=${duration_ms} http_status=${http_status} curl_exit=${curl_exit} result=failure"

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    echo "[cron] endpoint=${NAME} retrying in ${backoff_seconds}s (exponential backoff)"
    sleep "$backoff_seconds"
    backoff_seconds=$((backoff_seconds * 2))
  fi

  attempt=$((attempt + 1))
done

echo "::error::cron endpoint '${NAME}' (${URL}) failed after ${MAX_ATTEMPTS} attempts — last http_status=${http_status}, curl_exit=${curl_exit}. See job log above for per-attempt detail."
exit 1
