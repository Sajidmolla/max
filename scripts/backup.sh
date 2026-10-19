#!/usr/bin/env bash
# Manual logical backup of the public schema + data. Requires pg_dump (PostgreSQL client).
# Usage: SUPABASE_DB_URL='postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres' ./scripts/backup.sh
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (Supabase → Project Settings → Database → Connection string)}"
mkdir -p backups
out="backups/max-$(date +%Y%m%d-%H%M%S).sql"
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --no-privileges -f "$out"
echo "Wrote $out — store it somewhere safe (not in git)."
