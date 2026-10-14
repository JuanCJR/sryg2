#!/usr/bin/env bash
# Respaldo cifrado de PostgreSQL (OPS-01, OPS-05, D11). Ver docs/respaldos.md.
#
# Hace pg_dump (formato custom, comprimido) de DATABASE_URL y lo cifra con age en un solo pipe: el
# volcado en claro nunca toca el disco. Deja <directorio>/sryg-<AAAAMMDDTHHMMSSZ>.dump.age.
#
# Uso: DATABASE_URL=... BACKUP_AGE_RECIPIENT=age1... scripts/backup.sh [directorio]
#
# Variables:
#   DATABASE_URL          URL postgres:// de la base a respaldar. En Neon, la conexión directa (sin -pooler).
#   BACKUP_AGE_RECIPIENT  Una o más claves públicas age (age1...), separadas por espacios o saltos de línea.
#   PG_BIN                Opcional: directorio de pg_dump (tiene que ser de la misma versión mayor que el
#                         servidor o más nueva).
set -euo pipefail

die() {
  printf 'backup: %s\n' "$*" >&2
  exit 1
}

out_dir="${1:-.}"

[ -n "${DATABASE_URL:-}" ] || die 'falta DATABASE_URL (URL de la base a respaldar).'
[ -n "${BACKUP_AGE_RECIPIENT:-}" ] || die 'falta BACKUP_AGE_RECIPIENT (clave pública age, age1...).'
[ -d "$out_dir" ] || die "el directorio de salida no existe: $out_dir"

# pg_dump a través de PgBouncer en modo transacción no es confiable; Neon pide la conexión directa.
authority="${DATABASE_URL#*://}"
authority="${authority%%/*}"
host="${authority##*@}"
case "$host" in
  *-pooler*) die "DATABASE_URL apunta al pooler ($host). Usá la conexión directa de Neon (sin -pooler)." ;;
esac

recipients=()
for recipient in $BACKUP_AGE_RECIPIENT; do
  recipients+=(-r "$recipient")
done

pg_dump="${PG_BIN:+$PG_BIN/}pg_dump"
file="$out_dir/sryg-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
partial="$file.partial"
trap 'rm -f "$partial"' EXIT

umask 077
"$pg_dump" --format=custom --dbname="$DATABASE_URL" | age "${recipients[@]}" -o "$partial"
[ -s "$partial" ] || die 'el respaldo quedó vacío.'
mv "$partial" "$file"

printf 'Respaldo cifrado: %s (%s bytes)\n' "$file" "$(wc -c <"$file" | tr -d ' ')"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  printf 'file=%s\n' "$file" >>"$GITHUB_OUTPUT"
fi
