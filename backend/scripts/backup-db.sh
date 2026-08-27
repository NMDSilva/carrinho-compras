#!/usr/bin/env bash
# Backup diário da base de dados Postgres, guardado localmente na VM.
# Corre via cron na VM de produção (agendado pelo workflow de deploy).
# Requer: docker compose (serviço "postgres" já a correr).
#
# Guarda os dumps em ~/backups/carrinho-compras, fora do volume Docker —
# protege contra apagar o volume por acidente, migração mal feita ou
# corrupção, mas NÃO contra perda do disco/VM (fica no mesmo disco).
set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="$HOME/backups/carrinho-compras"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DUMP_FILE="$BACKUP_DIR/carrinho-compras-${TIMESTAMP}.sql.gz"

docker compose exec -T postgres pg_dump -U carrinho carrinho_compras | gzip > "$DUMP_FILE"

# Mantém só os últimos 14 backups (2 semanas), elimina o resto.
ls -1t "$BACKUP_DIR"/carrinho-compras-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Backup concluído: $DUMP_FILE"
