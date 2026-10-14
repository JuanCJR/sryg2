#!/usr/bin/env bash
# Pruebas de scripts/backup.sh y scripts/restore.sh.
#
# Sin variables: corre solo las pruebas de guardas (no necesitan Postgres).
# Con BACKUP_TEST_ADMIN_URL (una URL a la base `postgres` de un servidor descartable, por ejemplo el de
# docker-compose: postgres://sryg:sryg@localhost:5432/postgres) corre además el ciclo completo:
# crea dos bases temporales, carga datos ficticios, respalda, restaura y compara.
#
# Uso: scripts/backup-restore.test.sh
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP="$SCRIPTS_DIR/backup.sh"
RESTORE="$SCRIPTS_DIR/restore.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

passed=0
failed=0

pass() {
  passed=$((passed + 1))
  printf 'ok   %s\n' "$1"
}

fail() {
  failed=$((failed + 1))
  printf 'FAIL %s\n' "$1"
  [ -n "${2:-}" ] && printf '     %s\n' "$2"
  return 0
}

# expect_failure <nombre> <texto esperado en stderr> <comando...>
expect_failure() {
  local name="$1" expected="$2"
  shift 2
  local output status=0
  output="$("$@" 2>&1 </dev/null)" || status=$?
  if [ "$status" -eq 0 ]; then
    fail "$name" "terminó con 0; se esperaba un error"
  elif [[ "$output" != *"$expected"* ]]; then
    fail "$name" "no contiene '$expected': $output"
  else
    pass "$name"
  fi
}

age-keygen -o "$WORK/key.txt" 2>/dev/null
RECIPIENT="$(age-keygen -y "$WORK/key.txt")"
printf 'no es un respaldo' | age -r "$RECIPIENT" >"$WORK/fake.dump.age"

# --- backup.sh: guardas --------------------------------------------------------------------------

expect_failure 'backup: exige DATABASE_URL' 'DATABASE_URL' \
  env -u DATABASE_URL BACKUP_AGE_RECIPIENT="$RECIPIENT" "$BACKUP" "$WORK"

expect_failure 'backup: exige BACKUP_AGE_RECIPIENT' 'BACKUP_AGE_RECIPIENT' \
  env -u BACKUP_AGE_RECIPIENT DATABASE_URL=postgres://u:p@localhost:5432/db "$BACKUP" "$WORK"

expect_failure 'backup: rechaza la URL pooled de Neon' 'pooler' \
  env DATABASE_URL='postgres://u:p@ep-x-pooler.us-east-2.aws.neon.tech/db?sslmode=require' \
  BACKUP_AGE_RECIPIENT="$RECIPIENT" "$BACKUP" "$WORK"

expect_failure 'backup: exige un directorio de salida existente' 'directorio' \
  env DATABASE_URL=postgres://u:p@localhost:5432/db BACKUP_AGE_RECIPIENT="$RECIPIENT" \
  "$BACKUP" "$WORK/no-existe"

# --- restore.sh: guardas -------------------------------------------------------------------------

expect_failure 'restore: exige el archivo de respaldo' 'Uso' \
  "$RESTORE"

expect_failure 'restore: el archivo debe existir' 'no existe' \
  "$RESTORE" --identity "$WORK/key.txt" --target postgres://u:p@localhost:5432/db "$WORK/nada.dump.age"

expect_failure 'restore: exige la identidad age' 'identidad' \
  env -u AGE_IDENTITY_FILE "$RESTORE" --target postgres://u:p@localhost:5432/db "$WORK/fake.dump.age"

expect_failure 'restore: exige una base de destino explícita' '--target' \
  env -u RESTORE_DATABASE_URL "$RESTORE" --identity "$WORK/key.txt" "$WORK/fake.dump.age"

expect_failure 'restore: no usa DATABASE_URL como destino por defecto' '--target' \
  env -u RESTORE_DATABASE_URL DATABASE_URL=postgres://u:p@localhost:5432/db \
  "$RESTORE" --identity "$WORK/key.txt" "$WORK/fake.dump.age"

expect_failure 'restore: rechaza un host remoto sin --allow-remote' '--allow-remote' \
  "$RESTORE" --identity "$WORK/key.txt" \
  --target 'postgres://u:p@ep-x.us-east-2.aws.neon.tech/neondb?sslmode=require' "$WORK/fake.dump.age"

expect_failure 'restore: rechaza el destino igual a DATABASE_URL' 'DATABASE_URL' \
  env DATABASE_URL=postgres://u:p@localhost:5432/db \
  "$RESTORE" --identity "$WORK/key.txt" --target postgres://u:p@localhost:5432/db "$WORK/fake.dump.age"

expect_failure 'restore: rechaza el destino igual a DATABASE_MIGRATION_URL' 'DATABASE_MIGRATION_URL' \
  env DATABASE_MIGRATION_URL=postgres://u:p@localhost:5432/db \
  "$RESTORE" --identity "$WORK/key.txt" --target postgres://u:p@localhost:5432/db "$WORK/fake.dump.age"

expect_failure 'restore: rechaza el destino igual a PRODUCTION_DATABASE_URL' 'PRODUCTION_DATABASE_URL' \
  env PRODUCTION_DATABASE_URL='postgres://u:p@ep-x.us-east-2.aws.neon.tech/neondb' \
  "$RESTORE" --identity "$WORK/key.txt" --allow-remote --confirm-db neondb \
  --target 'postgres://u:p@ep-x.us-east-2.aws.neon.tech/neondb' "$WORK/fake.dump.age"

expect_failure 'restore: un host remoto exige confirmar el nombre de la base' 'confirm' \
  "$RESTORE" --identity "$WORK/key.txt" --allow-remote \
  --target 'postgres://u:p@ep-x.us-east-2.aws.neon.tech/neondb' "$WORK/fake.dump.age"

expect_failure 'restore: la confirmación debe coincidir con la base' 'no coincide' \
  "$RESTORE" --identity "$WORK/key.txt" --allow-remote --confirm-db otra \
  --target 'postgres://u:p@ep-x.us-east-2.aws.neon.tech/neondb' "$WORK/fake.dump.age"

expect_failure 'restore: falla con una identidad que no corresponde' 'descifrar' \
  bash -c 'age-keygen -o "$1/other.txt" 2>/dev/null && "$2" --identity "$1/other.txt" \
    --target postgres://u:p@localhost:5432/db "$1/fake.dump.age"' _ "$WORK" "$RESTORE"

# --- ciclo completo (opcional) -------------------------------------------------------------------

if [ -n "${BACKUP_TEST_ADMIN_URL:-}" ]; then
  PSQL="${PG_BIN:+$PG_BIN/}psql"
  suffix="$$"
  src_db="sryg_backup_src_$suffix"
  dst_db="sryg_backup_dst_$suffix"
  base="${BACKUP_TEST_ADMIN_URL%/*}"
  cleanup_dbs() {
    "$PSQL" -q "$BACKUP_TEST_ADMIN_URL" -c "DROP DATABASE IF EXISTS $src_db" -c "DROP DATABASE IF EXISTS $dst_db" \
      >/dev/null 2>&1 || true
  }
  trap 'cleanup_dbs; rm -rf "$WORK"' EXIT
  "$PSQL" -q -v ON_ERROR_STOP=1 "$BACKUP_TEST_ADMIN_URL" \
    -c "CREATE DATABASE $src_db" -c "CREATE DATABASE $dst_db" >/dev/null
  "$PSQL" -q -v ON_ERROR_STOP=1 "$base/$src_db" >/dev/null <<'SQL'
CREATE TABLE persona_ficticia (id serial PRIMARY KEY, nombre text NOT NULL, foto bytea);
INSERT INTO persona_ficticia (nombre, foto)
  SELECT 'Persona Ficticia ' || g, decode(md5(g::text), 'hex') FROM generate_series(1, 250) AS g;
SQL
  # El destino ya tiene datos: la restauración debe reemplazarlos.
  "$PSQL" -q -v ON_ERROR_STOP=1 "$base/$dst_db" \
    -c "CREATE TABLE persona_ficticia (id int); INSERT INTO persona_ficticia VALUES (1)" >/dev/null

  mkdir "$WORK/out"
  if DATABASE_URL="$base/$src_db" BACKUP_AGE_RECIPIENT="$RECIPIENT" "$BACKUP" "$WORK/out" >"$WORK/backup.log" 2>&1; then
    pass 'ciclo: backup.sh termina con 0'
  else
    fail 'ciclo: backup.sh termina con 0' "$(cat "$WORK/backup.log")"
  fi

  shopt -s nullglob
  files=("$WORK"/out/sryg-*.dump.age)
  shopt -u nullglob
  if [ "${#files[@]}" -eq 1 ] && [ -s "${files[0]}" ]; then
    pass 'ciclo: deja un único archivo sryg-*.dump.age no vacío'
  else
    fail 'ciclo: deja un único archivo sryg-*.dump.age no vacío' "$(ls -la "$WORK/out")"
  fi

  if [ "${#files[@]}" -eq 1 ] && [ "$(head -c 21 "${files[0]}")" = 'age-encryption.org/v1' ]; then
    pass 'ciclo: el archivo está cifrado con age'
  else
    fail 'ciclo: el archivo está cifrado con age'
  fi

  if [ "${#files[@]}" -eq 1 ] && ! grep -aq 'Persona Ficticia' "${files[0]}"; then
    pass 'ciclo: el archivo no contiene datos en claro'
  else
    fail 'ciclo: el archivo no contiene datos en claro'
  fi

  if [ "${#files[@]}" -eq 1 ] &&
    "$RESTORE" --identity "$WORK/key.txt" --target "$base/$dst_db" "${files[0]}" >"$WORK/restore.log" 2>&1; then
    pass 'ciclo: restore.sh termina con 0'
  else
    fail 'ciclo: restore.sh termina con 0' "$(cat "$WORK/restore.log")"
  fi

  checksum_query="SELECT count(*) || ':' || md5(string_agg(id || nombre || encode(foto, 'hex'), ',' ORDER BY id))
    FROM persona_ficticia"
  src_sum="$("$PSQL" -tAq "$base/$src_db" -c "$checksum_query")"
  dst_sum="$("$PSQL" -tAq "$base/$dst_db" -c "$checksum_query" 2>&1 || true)"
  if [ "$src_sum" = "$dst_sum" ]; then
    pass 'ciclo: los datos restaurados coinciden con el origen'
  else
    fail 'ciclo: los datos restaurados coinciden con el origen' "origen=$src_sum destino=$dst_sum"
  fi
else
  printf 'skip ciclo completo (definí BACKUP_TEST_ADMIN_URL para correrlo)\n'
fi

printf '\n%d ok, %d fallidas\n' "$passed" "$failed"
[ "$failed" -eq 0 ]
