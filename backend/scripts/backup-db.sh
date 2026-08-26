#!/usr/bin/env bash
# Backup diário da base de dados Postgres para um bucket GCS.
# Corre via cron na VM de produção (agendado pelo workflow de deploy).
# Requer: docker compose (serviço "postgres" já a correr) e gcloud CLI autenticado na VM.
set -euo pipefail

cd "$(dirname "$0")/.."

set -a
source .env
set +a

: "${BACKUP_GCS_BUCKET:?Define BACKUP_GCS_BUCKET no backend/.env para ativar os backups}"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="/tmp/carrinho-compras-${TIMESTAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U carrinho carrinho_compras | gzip > "$DUMP_FILE"

gcloud storage cp "$DUMP_FILE" "gs://${BACKUP_GCS_BUCKET}/backups/carrinho-compras-${TIMESTAMP}.sql.gz"

rm -f "$DUMP_FILE"

echo "Backup concluído: gs://${BACKUP_GCS_BUCKET}/backups/carrinho-compras-${TIMESTAMP}.sql.gz"
