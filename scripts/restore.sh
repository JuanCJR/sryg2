#!/usr/bin/env bash
# Restauración de un respaldo cifrado (OPS-02, D11). Ver docs/respaldos.md.
#
# Descifra con age un archivo sryg-*.dump.age y lo restaura con pg_restore en la base de destino, en
# una sola transacción. El volcado en claro nunca toca el disco.
#
# Uso:
#   scripts/restore.sh --identity <clave-age.txt> --target <url-destino> [opciones] <respaldo.dump.age>
#
# Opciones:
#   --identity <archivo>   Clave privada age (o AGE_IDENTITY_FILE).
#   --target <url>         Base de destino postgres:// (o RESTORE_DATABASE_URL). Nunca se toma de
#                          DATABASE_URL.
#   --allow-remote         Permite un destino que no sea localhost (por ejemplo, una rama de Neon para el
#                          simulacro). Sin esta opción solo se restaura en localhost.
#   --confirm-db <nombre>  Confirma el nombre de la base remota sin preguntar (uso no interactivo).
#
# Protecciones (no se pueden desactivar): el destino no puede ser la misma base que DATABASE_URL,
# DATABASE_MIGRATION_URL ni PRODUCTION_DATABASE_URL, si están definidas en el entorno.
#
# PG_BIN (opcional): directorio de pg_restore y psql, de la misma versión mayor que el respaldo o más nueva.
set -euo pipefail

die() {
  printf 'restore: %s\n' "$*" >&2
  exit 1
}

usage() {
  printf 'Uso: scripts/restore.sh --identity <clave-age.txt> --target <url-destino> <respaldo.dump.age>\n' >&2
  exit 2
}

identity="${AGE_IDENTITY_FILE:-}"
target="${RESTORE_DATABASE_URL:-}"
allow_remote=false
confirm_db=''
file=''

while [ $# -gt 0 ]; do
  case "$1" in
    --identity) identity="${2:-}"; shift 2 ;;
    --target) target="${2:-}"; shift 2 ;;
    --allow-remote) allow_remote=true; shift ;;
    --confirm-db) confirm_db="${2:-}"; shift 2 ;;
    -h | --help) usage ;;
    -*) die "opción desconocida: $1" ;;
    *)
      [ -z "$file" ] || die 'se esperaba un solo archivo de respaldo.'
      file="$1"
      shift
      ;;
  esac
done

[ -n "$file" ] || usage
[ -f "$file" ] || die "el archivo no existe: $file"
[ -n "$identity" ] || die 'falta la identidad age (--identity <archivo> o AGE_IDENTITY_FILE).'
[ -f "$identity" ] || die "la identidad age no existe: $identity"
[ -n "$target" ] || die 'falta la base de destino: pasala con --target <url> (o RESTORE_DATABASE_URL).'

# Devuelve "host:puerto/base" de una URL postgres://, para comparar destinos sin credenciales ni parámetros.
db_key() {
  local rest authority host port db
  rest="${1#*://}"
  rest="${rest%%\?*}"
  authority="${rest%%/*}"
  db=''
  [ "$rest" = "$authority" ] || db="${rest#*/}"
  authority="${authority##*@}"
  host="$authority"
  port='5432'
  case "$authority" in
    *\]) ;;
    *:*) host="${authority%:*}" port="${authority##*:}" ;;
  esac
  printf '%s:%s/%s' "$(printf '%s' "$host" | tr '[:upper:]' '[:lower:]')" "$port" "$db"
}

target_key="$(db_key "$target")"
target_host="${target_key%:*}"
target_db="${target_key#*/}"
[ -n "$target_db" ] || die 'la URL de destino no indica la base.'

for var in DATABASE_URL DATABASE_MIGRATION_URL PRODUCTION_DATABASE_URL; do
  value="${!var:-}"
  if [ -n "$value" ] && [ "$(db_key "$value")" = "$target_key" ]; then
    die "el destino es la misma base que $var. Restaurá en una base nueva y vacía."
  fi
done

case "$target_host" in
  '' | localhost | 127.0.0.1 | '[::1]') ;;
  *)
    $allow_remote || die "el destino ($target_host) no es local. Si es una base de simulacro, agregá --allow-remote."
    if [ -z "$confirm_db" ]; then
      [ -t 0 ] || die "destino remoto: confirmá el nombre de la base con --confirm-db $target_db."
      read -r -p "Se va a reemplazar el contenido de '$target_db' en $target_host. Escribí el nombre de la base: " \
        confirm_db
    fi
    [ "$confirm_db" = "$target_db" ] || die "la confirmación ('$confirm_db') no coincide con la base '$target_db'."
    ;;
esac

pg_restore="${PG_BIN:+$PG_BIN/}pg_restore"
psql="${PG_BIN:+$PG_BIN/}psql"

# 1. Validar: descifrar y leer el índice del respaldo, sin tocar el destino.
set +e
age -d -i "$identity" "$file" | "$pg_restore" --list >/dev/null
status=("${PIPESTATUS[@]}")
set -e
[ "${status[0]}" -eq 0 ] || die "no se pudo descifrar $file con $identity (¿clave equivocada o archivo dañado?)."
[ "${status[1]}" -eq 0 ] || die "$file no es un respaldo válido de pg_dump."

# 2. Restaurar en una sola transacción: si algo falla, el destino queda como estaba.
printf 'Restaurando %s en %s...\n' "$file" "$target_key"
age -d -i "$identity" "$file" |
  "$pg_restore" --dbname="$target" --clean --if-exists --no-owner --no-privileges --single-transaction \
    --exit-on-error

# 3. Resumen para el registro del simulacro.
"$psql" -X -q -v ON_ERROR_STOP=1 --dbname="$target" <<'SQL'
SELECT count(*) AS tablas_restauradas
  FROM information_schema.tables
 WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema');
SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS has_migrations \gset
\if :has_migrations
SELECT count(*) AS migraciones_aplicadas FROM drizzle.__drizzle_migrations;
\else
\echo 'Sin tabla de migraciones de Drizzle.'
\endif
SQL
printf 'Restauración terminada.\n'
