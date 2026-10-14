# Respaldos y restauración

Runbook de OPS-01 (respaldo automático), OPS-02 (restauración y simulacro) y OPS-05 (cifrado). Aplica la decisión D11 de
`docs/plan-ejecucion-paralela.md`: una GitHub Action diaria hace `pg_dump`, lo cifra con `age` y lo sube como artifact;
no hay página de respaldos en la aplicación.

| Pieza | Qué hace |
|---|---|
| `.github/workflows/backup.yml` | Corre todos los días a las 07:17 UTC (03:17 en Caracas) y a demanda (`workflow_dispatch`). Sube el respaldo como artifact `sryg-backup-<run_id>` con 30 días de retención. En los PR que tocan los scripts, corre sus pruebas. |
| `scripts/backup.sh` | `pg_dump --format=custom` de `DATABASE_URL`, cifrado con `age` en el mismo pipe. Deja `sryg-<AAAAMMDDTHHMMSSZ>.dump.age`. |
| `scripts/restore.sh` | Descifra y restaura con `pg_restore` en una base de destino explícita, en una sola transacción. |
| `scripts/backup-restore.test.sh` | Pruebas de las guardas de ambos scripts y, con `BACKUP_TEST_ADMIN_URL`, del ciclo completo. |

Objetivos que resultan de este diseño: se pierde como máximo un día de datos (RPO de 24 h) y hay respaldos de los
últimos 30 días.

## 1. Cifrado (OPS-05)

- **Respaldos en reposo:** cada respaldo se cifra con `age` (X25519 + ChaCha20-Poly1305) contra una clave pública. El
  volcado en claro nunca se escribe en disco, ni en el runner ni al restaurar. GitHub solo guarda el archivo cifrado; la
  clave privada no está en GitHub ni en Render.
- **En tránsito:** `pg_dump` se conecta a Neon con `sslmode=require` (la URL de Neon ya lo trae). La descarga del
  artifact es por HTTPS.
- **Base en producción:** el cifrado del almacenamiento lo provee Neon; este cambio no lo modifica.

## 2. Alta de los secrets (una vez)

### 2.1 Par de claves age

En una máquina de confianza (no en un servidor):

```bash
age-keygen -o sryg-backup-key.txt
# Public key: age1...
```

- La línea `Public key: age1...` es la **clave pública**: va al secret `BACKUP_AGE_RECIPIENT`. No es sensible.
- El archivo `sryg-backup-key.txt` es la **clave privada**: sin ella no se puede restaurar ningún respaldo. Guardala en
  el gestor de contraseñas del equipo y en una copia offline (por ejemplo, un pendrive en custodia). Nunca la subas a
  GitHub, a Render ni al repositorio.
- `BACKUP_AGE_RECIPIENT` admite varias claves públicas separadas por espacios (por ejemplo, una por custodio): cualquiera
  de las claves privadas correspondientes puede restaurar.

### 2.2 Secrets del repositorio

GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Valor |
|---|---|
| `DATABASE_URL` | URL **directa** de Neon (sin `-pooler` en el host), con `sslmode=require`. Es el mismo valor que `DATABASE_MIGRATION_URL` en Render (`docs/deploy.md`). `backup.sh` rechaza la URL pooled porque `pg_dump` no es confiable a través de PgBouncer. |
| `BACKUP_AGE_RECIPIENT` | La clave pública `age1...` del paso 2.1. |

Además, en Settings → Actions → General → Artifact and log retention, el máximo tiene que ser de 30 días o más (por
defecto es 90); si fuera menor, GitHub recorta la retención de los respaldos.

### 2.3 Primera ejecución

Actions → **Backup** → Run workflow (rama `main`). Al terminar, el run muestra el artifact `sryg-backup-<run_id>`.
Hacé enseguida un simulacro (§5) con ese respaldo para comprobar que la clave privada guardada es la correcta.

## 3. Respaldo

- **Automático:** el cron diario. Los workflows programados solo corren en la rama por defecto.
- **A demanda:** Actions → Backup → Run workflow. Hacelo antes de cualquier operación riesgosa (una migración manual, una
  carga masiva).
- **Seguimiento:** el historial de Actions → Backup muestra cada ejecución. GitHub avisa por correo de los runs
  programados que fallan a quien modificó el cron por última vez; revisá también la pestaña al menos una vez por semana.
- **Atención:** en repositorios públicos, GitHub desactiva los workflows programados tras 60 días sin actividad en el
  repositorio. Si pasa, Actions → Backup → Enable workflow.

Desde una máquina local (requiere `pg_dump` 17 o más nuevo y `age`):

```bash
DATABASE_URL='postgres://...' BACKUP_AGE_RECIPIENT='age1...' scripts/backup.sh ./respaldos
```

## 4. Restauración

`scripts/restore.sh` **nunca restaura en producción por defecto**:

- La base de destino se pasa siempre con `--target` (o `RESTORE_DATABASE_URL`); nunca se toma de `DATABASE_URL`.
- Sin `--allow-remote`, solo acepta `localhost`, `127.0.0.1` o `[::1]`.
- Con `--allow-remote`, pide escribir el nombre de la base (o `--confirm-db <nombre>` sin terminal interactiva).
- Siempre rechaza un destino que sea la misma base (host, puerto y nombre) que `DATABASE_URL`,
  `DATABASE_MIGRATION_URL` o `PRODUCTION_DATABASE_URL`, si esas variables están definidas. Exportá
  `PRODUCTION_DATABASE_URL` con la URL de producción en tu shell para tener esta protección explícita.
- Primero descifra y lee el índice del respaldo sin tocar el destino. Después restaura con `--clean --if-exists
  --no-owner --no-privileges --single-transaction`: si algo falla, el destino queda como estaba.
- Al final muestra la cantidad de tablas y de migraciones de Drizzle restauradas.

La base de destino tiene que existir y conviene que esté vacía: `--clean` reemplaza los objetos del respaldo, pero no
borra los que solo existen en el destino.

### 4.1 Requisitos

- `age` y `pg_restore`/`psql` de la versión 17 o más nueva (producción usa Postgres 17). Con otra versión instalada,
  apuntá `PG_BIN` a un directorio con las de la 17. Sin instalarlas, se pueden usar las de la imagen de Docker:

  ```bash
  mkdir -p ~/.local/pg17
  for t in pg_restore psql; do
    printf '#!/usr/bin/env bash\nexec docker run --rm -i --network host postgres:17 %s "$@"\n' "$t" > ~/.local/pg17/$t
    chmod +x ~/.local/pg17/$t
  done
  export PG_BIN=~/.local/pg17
  ```

- La clave privada age (`sryg-backup-key.txt`).

### 4.2 Descargar un respaldo

Actions → Backup → el run elegido → Artifacts → `sryg-backup-<run_id>`. GitHub entrega un `.zip` con el archivo
`sryg-*.dump.age` adentro (`unzip sryg-backup-<run_id>.zip`). Con la CLI de GitHub: `gh run download <run_id>`.

### 4.3 Restaurar en la base local (docker-compose)

```bash
pnpm db:up
docker compose exec db createdb -U sryg sryg_restore
scripts/restore.sh --identity ~/sryg-backup-key.txt \
  --target postgres://sryg:sryg@localhost:5432/sryg_restore \
  sryg-20261014T071712Z.dump.age
```

### 4.4 Desastre en producción

No restaures encima de la base de producción. En su lugar:

1. En Neon, creá una base o una rama nueva y vacía (por ejemplo, `sryg_restore_<fecha>`), y copiá su URL directa.
2. Restaurá en ella:

   ```bash
   scripts/restore.sh --identity ~/sryg-backup-key.txt --allow-remote \
     --target 'postgres://...neon.tech/sryg_restore_<fecha>?sslmode=require' sryg-<fecha>.dump.age
   ```

3. Verificá los datos (§5, paso 4).
4. En Render, cambiá `DATABASE_URL` (pooled) y `DATABASE_MIGRATION_URL` (directa) de `sryg-api` para que apunten a la
   base restaurada y redeployá (`docs/deploy.md`). El arranque aplica las migraciones que falten.
5. Actualizá el secret `DATABASE_URL` del repositorio con la nueva URL directa y lanzá un respaldo a demanda.
6. Conservá la base anterior hasta confirmar que no hace falta nada de ella.

## 5. Simulacro trimestral

Una vez por trimestre (enero, abril, julio y octubre), y siempre después de rotar la clave:

1. Descargá el respaldo más reciente (§4.2).
2. Restauralo en la base local (§4.3) o en una rama descartable de Neon (§4.4, pasos 1 y 2). Medí cuánto tarda.
3. Comprobá que la salida de `restore.sh` muestre la cantidad esperada de tablas y migraciones (las de
   `packages/db/migrations/meta/_journal.json`).
4. Comprobá los datos: la cantidad de filas de `personal_aeronautico`, `licencia`, `certificado_medico` y `auditoria`
   tiene que ser coherente con producción a la fecha del respaldo. Opcional: levantá la API contra la base restaurada
   (`DATABASE_URL=... pnpm --filter @sryg/api dev`) y entrá con un usuario.
5. Borrá la base restaurada y los archivos descargados (son datos personales).
6. Anotá el resultado en el registro de abajo.

### Registro de simulacros

| Fecha | Responsable | Respaldo | Destino | Duración | Resultado |
|---|---|---|---|---|---|
| 2026-10-14 | Verificación del cambio (W1-10) | Generado localmente con `scripts/backup.sh` sobre el seed ficticio (`pnpm db:seed`) | Postgres 17 de docker-compose, base `sryg_restore` | ~1 s | OK: 27 tablas y 3 migraciones; filas por tabla, constraints, índices, enums y triggers idénticos al origen. Falta el primer simulacro con un respaldo real de producción (§2.3). |

## 6. Rotación de la clave age

Cuando cambie un custodio o se sospeche que la clave privada se filtró:

1. Generá un par nuevo (§2.1) y reemplazá `BACKUP_AGE_RECIPIENT`.
2. Lanzá un respaldo a demanda y hacé un simulacro con él usando la clave nueva.
3. Conservá la clave privada anterior 30 días más: los respaldos previos siguen cifrados con ella hasta que expiran. Si
   se filtró, borrá esos artifacts (Actions → run → Artifacts → borrar) en lugar de esperar.

## 7. Pruebas de los scripts

```bash
scripts/backup-restore.test.sh                   # guardas, sin base de datos
pnpm db:up
BACKUP_TEST_ADMIN_URL=postgres://sryg:sryg@localhost:5432/postgres \
  PG_BIN=~/.local/pg17 scripts/backup-restore.test.sh   # + ciclo completo con datos ficticios
```

El ciclo completo crea y borra dos bases temporales `sryg_backup_src_<pid>` y `sryg_backup_dst_<pid>`. En CI corre en
el job `test-scripts` de `backup.yml` cuando un PR toca los scripts.
