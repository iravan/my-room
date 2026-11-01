#!/bin/sh
# Checks the migration's row-level security in a throwaway Postgres (no Supabase stack needed).
# Uses colima's VM when the host Docker socket isn't reachable. Exit 0 = all asserts passed.
set -e
cd "$(dirname "$0")/.."
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="colima ssh -- docker"
$DOCKER run --rm -e POSTGRES_PASSWORD=x -v "$PWD:/sb:ro" postgres:17-alpine sh -c '
  docker-entrypoint.sh postgres >/dev/null 2>&1 & until pg_isready -q -U postgres; do sleep 0.3; done; sleep 1
  set -- ; for m in /sb/migrations/*.sql; do set -- "$@" -f "$m"; done
  psql -q -v ON_ERROR_STOP=1 -U postgres -c "create extension if not exists pgcrypto" -f /sb/tests/stubs.sql "$@" -f /sb/tests/rls.sql'
