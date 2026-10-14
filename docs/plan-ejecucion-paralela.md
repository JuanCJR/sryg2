# Plan de ejecución paralela de SRYG

Este documento define el trabajo pendiente para terminar SRYG, dividido en prompts para Claude Code en la nube que se pueden ejecutar en paralelo, uno por rama. Cada prompt lo toma como fuente de verdad: las decisiones de la §1 prevalecen sobre las propuestas y las preguntas abiertas de `docs/sryg-definitions-and-tasks.md`.

## 1. Decisiones tomadas (2026-10-13)

| ID | Decisión |
|---|---|
| D1 (OD-14) | Se aplica tal cual la matriz de permisos propuesta en `sryg-definitions-and-tasks.md` §4, ampliada con el área de D24. Se centraliza en `packages/types`, y la consumen la API (guard) y la web (navegación y acciones). |
| D2 (OD-08) | Registran y resuelven bloqueos el Administrador y el Supervisor. |
| D3 (OD-05/06) | El umbral de "próxima a vencer" y las vigencias son parámetros editables en la UI. El seed carga placeholders (umbral de 30 días, vigencias de 12 meses) marcados como `PENDIENTE INAC`, y la UI muestra esa marca hasta que el Administrador guarda un valor. |
| D4 (OD-12) | Contraseña de 10 caracteres como mínimo, sin reglas de composición ni rotación forzada. Tras un reset del Administrador, el cambio es obligatorio en el siguiente login (`must_change_password`). Se mantiene el throttle por IP. El JWT no tiene refresh: al expirar, o ante un 401, se vuelve a `/ingreso`. |
| D5 (OD-03) | La foto **y la firma del titular** se guardan en Postgres (`bytea` + MIME), comprimidas en el servidor a 200 KB como máximo. |
| D6 (OD-04) | Las alertas son solo in-app. Se recalculan con un job diario y también al pedir `/api/alerts` (Render free duerme el servicio). |
| D7 (OD-09) | Hay dos credenciales: la **licencia** y el **certificado médico**. Cada una es un PDF CR80 (85,6 × 54 mm) de frente y reverso, generado por la API. Ver la §4. |
| D8 (BR-05) | El certificado médico imprime el grupo sanguíneo (`personal_aeronautico.blood_type`) y las restricciones u observaciones médicas. No se guardan diagnósticos ni exámenes. |
| D9 | QR de verificación: `GET /api/public/verify/:token` y la página pública `/verificar/:token` muestran **solo** el tipo de credencial, el número, el estado (vigente, vencida o bloqueada) y el vencimiento. Si hay un bloqueo activo, la credencial no se emite (409). |
| D10 (OD-10) | Reportes v1: (1) vencidas y próximas a vencer, (2) estado consolidado por persona, (3) bloqueos activos. Todos tienen filtros (incluido el tipo de licencia) y exportación a CSV y PDF. El rol Consulta solo ve el 1. |
| D11 (Q1) | Respaldos: una GitHub Action diaria hace `pg_dump`, lo cifra con `age` y lo sube como artifact. Hay un script de restauración y un runbook en `docs/`. No hay página de respaldos. |
| D12 | Se elimina el modo demo (el selector `?rol=`, `useDemoResource` y `demoData.ts`). El rol sale de `/api/auth/me`. |
| D13 (BR-09) | Coherencia: cada **tipo de licencia** del catálogo indica qué clase médica RAV 67 exige (o ninguna). Para emitir o renovar una licencia hace falta un certificado médico vigente de esa clase. Una habilitación requiere una licencia vigente. Si alguna condición falla, la API responde 409 con un motivo legible. |
| D14 (Q3) | No hay "olvidé mi contraseña": el Administrador restablece la contraseña. |
| D15 (Q4) | Hay una sola página `/parametros` con las secciones Vigencias, Alertas y Credencial. Los catálogos tienen sus propias páginas (D19). |
| D16 (Q5) | `/` redirige a `/panel`. |
| D17 (OD-07) | El estado canónico es `bloqueada` / "Bloqueada". |
| D18 | El logo del INAC y la firma del Presidente se cargan como imágenes en Parámetros > Credencial. Mientras falten, el PDF muestra un placeholder. |
| D19 | **Catálogos mantenibles por el Admin** (como en SLYM), todos con texto en español y **traducción al inglés** para la credencial bilingüe: tipos de licencia (con categoría RAV 60, clase médica exigida, flag `aplica_vencimiento` y vigencia en meses), habilitaciones de tipo (modelo de aeronave), habilitaciones de clase, aeronaves, funciones (Capitán/PIC, Copiloto/SIC, No aplica), observaciones de licencia, observaciones médicas, tipos de documento, tipos de adjunto y nacionalidades. |
| D20 | Una licencia tiene un tipo (catálogo), una fecha de emisión, **N observaciones** (catálogo), **N habilitaciones de tipo** (aeronave + función + vencimiento) y **N habilitaciones de clase** (clase + lista de aeronaves + vencimiento). Si el tipo tiene `aplica_vencimiento = false`, la licencia no vence. |
| D21 | Ficha del administrado: nombres, apellidos, tipo y número de documento, nacionalidad, fecha de nacimiento, correo, dirección, grupo sanguíneo, foto, firma y **documentos adjuntos** (PDF o imagen de hasta 5 MB, tipo de catálogo, en `bytea`, con pestaña "Documentos" en el Expediente y auditados). |
| D22 | El número de licencia y el de certificado son, por defecto, el número de documento, como en SLYM y en las tarjetas reales. |
| D23 | La pantalla de inicio (`/panel`) muestra también los últimos accesos del usuario (fecha, hora, IP) y sus intentos fallidos de ingreso, como en SLYM. |
| D24 | **Rol + área**: cada usuario tiene un rol (Admin, Supervisor o Consulta) y un área (`licencias`, `medicina` o `ambas`). El Supervisor solo escribe en su área (Licencias: personal, licencias, habilitaciones y bloqueos; Medicina: personal, certificados médicos y bloqueos) y lee la otra. El Admin no tiene restricción de área. La regla de D1 "certificados médicos: solo Admin escribe" pasa a ser "Admin o Supervisor de Medicina". |
| D25 | **Sin migración de datos reales.** El seed de desarrollo y pruebas genera datos **ficticios** con la estructura de SLYM: catálogos completos de ejemplo (basados en los valores visibles en SLYM, por ejemplo "Piloto Comercial - Avión / Commercial Pilot - Airplane", "B737", "Monomotores Terrestres / Single Engine Land" o "No es válida para realizar vuelos internacionales por no poseer competencia lingüística"), unas 50 personas, licencias con habilitaciones de tipo y de clase, certificados médicos de las 3 clases, bloqueos y un usuario por rol y área. |

## 2. Estado actual

### 2.1 SRYG

- **API:** solo existen `/api/auth/login`, `/api/auth/me` y personal (list, get, create, update). No hay RBAC: `AllowAllWritePolicy` deja escribir a cualquier rol. Los demás módulos no existen (`apps/api/src/app.module.ts:8`).
- **DB:** 7 tablas. La categoría de licencia es un enum fijo de 6 valores, la habilitación es texto libre y la persona tiene un único `full_name`.
- **Web:** Listado, Expediente y Emisión de licencia ya tienen diseño, pero usan datos demo. El Login es real. `/panel`, `/reportes`, `/auditoria`, `/usuarios`, `/parametros`, `/respaldos` y `/perfil` son `PendingScreen`. No existe `DashboardTemplate`.

### 2.2 Comparación con SLYM (el sistema actual de INAC, revisado en video el 2026-10-13)

| SLYM | SRYG antes de esta revisión | Resolución |
|---|---|---|
| Catálogo de 42 tipos de licencia bilingües con "Aplica vencimiento" | Enum de 6 categorías | D19 y D20 (F0-A, W1-11) |
| Habilitaciones de tipo (336 modelos de aeronave) con función y vencimiento | `habilitacion.type` como texto | D20 (F0-A, W1-5) |
| Habilitaciones de clase (81) con lista de aeronaves (125) y vencimiento | No existía | D20 (F0-A, W1-5) |
| Observaciones de licencia (242) y registro de observaciones médicas | Solo `restrictions` como texto | D19 y D20 (W1-5, W1-6) |
| Mantenimiento de catálogos | No existía | W1-11 |
| Modificar foto/firma | Solo foto | D5 y D21 (W1-4) |
| Nombres y apellidos, tipo de documento, nacionalidad, adjuntos | `full_name`, sin adjuntos | D21 (F0-A, W1-4) |
| Áreas de Licencias y de Medicina | Solo roles | D24 (F0-A, W1-1) |
| Inicio con los últimos accesos y los intentos fallidos | No existía | D23 (W1-1 API, W2-1 UI) |
| Consulta de licencias por solicitante, número, tipo y vencimiento | Búsqueda por persona | W1-5 |
| Más de 15.000 administrados cargados | Base vacía | D25: seed ficticio, sin migración |

SRYG conserva lo que SLYM no tiene: bloqueos o impedimentos, validación de coherencia, alertas y dashboard, visor de auditoría, reportes con exportación, QR de verificación y parámetros de vigencia.

## 3. Oleadas y ramas

```
Ola 0 (secuencial)   F0-A feat/foundation-api ──► F0-B feat/foundation-web
Ola 1 (paralela)     W1-1 feat/users-auth           W1-7  feat/audit-viewer
                     W1-2 feat/settings             W1-8  feat/reports
                     W1-3 feat/blocking             W1-9  feat/alerts-api
                     W1-4 feat/personnel-form       W1-10 feat/backups
                     W1-5 feat/licenses             W1-11 feat/catalogs
                     W1-6 feat/medical-certificates
Gate de diseño       Dirección del Dashboard con Impeccable (humano)
Ola 2 (paralela)     W2-1 feat/dashboard            W2-2 feat/credentials-pdf
Ola 3 (secuencial)   W3-1 chore/integration-close
```

**Por qué hay una ola 0.** Hay archivos que comparten todas las ramas: el journal de migraciones de Drizzle, `app.module.ts`, `App.tsx`, `routes.ts`, `nav-items.ts`, `packages/types/src/index.ts`, `enums.ts` y `ExpedienteContainer.tsx`. Si cada rama los tocara, chocarían. La ola 0 los resuelve una sola vez:

- deja **todo el schema nuevo** en una migración;
- registra **cada módulo** como esqueleto;
- pre-registra **cada ruta y cada ítem de navegación**, apuntando a un archivo de página propio del feature;
- divide **el Expediente** en un componente por pestaña.

Así, cada rama de la ola 1 solo toca su feature.

**Reglas para todas las ramas de las olas 1 y 2:**

- No generar migraciones. Si falta schema, detenerse y reportarlo en el PR.
- No editar `docs/pages-inventory.md`, `openspec/changes/*/tasks.md`, `docs/sryg-definitions-and-tasks.md` ni este archivo. Los sincroniza la ola 3.
- No editar los archivos compartidos listados arriba, salvo la línea que el prompt autorice expresamente.
- No agregar dependencias no autorizadas en el prompt.

## 4. Layout de las credenciales (referencia para W2-2)

Se toma como referencia una foto de las tarjetas reales. Como contiene datos personales reales, **no se sube al repo**: este layout la reemplaza. Para tests y fixtures se usan datos ficticios.

**Licencia, frente:**
- **Encabezado:** escudo a la izquierda y logo del INAC a la derecha; "REPÚBLICA BOLIVARIANA DE VENEZUELA / BOLIVARIAN REPUBLIC OF VENEZUELA" y "VIII INSTITUTO NACIONAL DE AERONÁUTICA CIVIL".
- **Izquierda:** foto.
- **Derecha:**
  - "IX Capacitado para ejercer las atribuciones como: / Qualified to exercise the privileges as:", seguido del tipo de licencia en español y en inglés (por ejemplo, "Controlador De Tránsito Aéreo / Air Traffic Controller").
  - "IV Nombre (Name): <nombres apellidos>".
- **Pie:**
  - "V Dirección (Adress)"
  - "VI Nacionalidad (Nationality)"
  - "IVa Fecha Nac. (Date of Birth) dd/Mmm/aaaa"
  - "III Licencia # (License): <número>"
  - "X Fecha de Emisión (Date of issue): dd/Mmm/aaaa"
  - Firma del Presidente ("X Presidente INAC") y firma del titular ("VII Firma del Titular (Holders signature)").
- **Fondo:** marca de agua celeste con el emblema de la OACI.

**Licencia, reverso:**
- Habilitaciones de tipo: aeronave, función bilingüe y vencimiento.
- Habilitaciones de clase: clase bilingüe, aeronaves y vencimiento.
- Observaciones.
- QR de verificación.

**Certificado médico, frente:**
- Mismo encabezado que la licencia.
- En el lateral izquierdo, la clase en texto vertical rojo ("PRIMERA / SEGUNDA / TERCERA CLASE").
- Foto.
- "Certificado Médico Aeronáutico / Aeronautical Medical Certificate".
- "Nombre (Name)", "Número del certificado (Certificate number)", "Grupo sanguíneo y Rh (Blood type)" y "Fecha de vencimiento (Expiry date)".
- Firma del Presidente y firma del titular.

**Certificado médico, reverso:**
- "Restricciones / Observaciones: <observaciones médicas y restricciones>".
- "Este certificado médico es válido para el personal técnico aeronáutico que posean las licencias aeronáuticas siguientes:", seguido, en rojo, de los tipos de licencia cuya clase médica exigida coincide (D13).
- "Validez: Este certificado médico no es válido mientras su titular tenga una enfermedad o deficiencia (o aumento de una condición previamente declarada), que lo hagan incapaz de cumplir los requisitos exigidos en el mismo."
- "El presente certificado es válido para conducir los vehículos automotores. (Resolución MTC No. 137 de fecha 25-06-1977 gaceta oficial No 31.285 de fecha 28-07-1977)".
- QR de verificación a la derecha.

## 5. Gate de diseño

Las páginas nuevas heredan los templates que ya tienen comp aprobado:

| Template | Páginas |
|---|---|
| List | Usuarios, Bloqueos, Auditoría, Reportes, Catálogos |
| Form | Perfil, Parámetros, Registro de personal, Certificado médico |
| Auth | `/verificar` |

El **Dashboard** (`DashboardTemplate` + `/panel`) no tiene dirección visual. Antes de lanzar W2-1, una persona elige la dirección con Impeccable, siguiendo `docs/impeccable-design-workflow.md`. El surface brief resultante se commitea en `main` (`.impeccable/surfaces/`).

## 6. Preámbulo común (va al inicio de cada prompt)

```text
Repositorio: yokian1/sryg. Partí de `main` actualizado y trabajá en la rama `<RAMA>`.
Leé completos, antes de empezar: docs/plan-ejecucion-paralela.md (las decisiones de la
§1 mandan sobre cualquier propuesta u OD abierta), docs/sryg-definitions-and-tasks.md y
el README o los docs del módulo que toques.
Arquitectura:
- API: NestJS hexagonal (domain/application/http/infrastructure). Referencia:
  apps/api/src/personnel.
- Web: React 19 + Vite, diseño atómico, containers/presentational y CSS modules.
  Referencia: apps/web/src/features/personnel.
- Contratos zod en packages/types.
- Cada escritura sobre una entidad auditada escribe Auditoria en la misma transacción
  (UoW, BR-11).
- Permisos con can(role, area, module, action) de packages/types (D1, D24).
Tests: Vitest, en TDD (un test en rojo por regla antes de implementar). Los
*.int.test.ts necesitan Postgres (`pnpm db:up`). Testeá por la interfaz pública: HTTP
para la API, Testing Library para la web. Usá solo datos ficticios.
Respetá las reglas de la §3 de docs/plan-ejecucion-paralela.md: no generar migraciones,
no editar los docs de progreso ni los archivos compartidos fuera de lo autorizado y no
agregar dependencias no autorizadas.
Antes de abrir el PR, tienen que pasar: pnpm format:check, pnpm lint,
pnpm build:packages, pnpm typecheck, pnpm test y pnpm build.
Commits: Conventional Commits, sin atribución de IA. Cada unidad de trabajo, con sus
tests.
Al terminar, abrí un PR contra `main` y no lo mergees. Incluí: un resumen, las
decisiones de la §1 que aplicaste, los checks ejecutados con su resultado y los huecos
o desvíos.
Si una regla no está definida ni en el plan ni en las specs, no la inventes:
documentala en el PR y seguí con lo demás.
```

## 7. Prompts

### F0-A — `feat/foundation-api` (ola 0, primero)

```text
<PREÁMBULO con RAMA=feat/foundation-api>
Esta rama SÍ genera la única migración de esta tanda y SÍ edita los archivos compartidos.
Objetivo: dejar listos el schema, el RBAC, el seed y los esqueletos, para que 11 ramas
trabajen en paralelo sin conflictos.

1. Schema (una sola migración con drizzle-kit):
   - personal_aeronautico: reemplazar full_name por first_names y last_names;
     document_type_id, nationality_id, birth_date, address; reemplazar photo_ref por
     photo/photo_mime y signature/signature_mime (bytea). Actualizar el módulo
     personnel existente (contratos, API y tests) a los campos nuevos.
   - personal_adjunto: personal_id, attachment_type_id, filename, mime, data bytea,
     size, created_by.
   - usuario: must_change_password (boolean), area (enum licencias|medicina|ambas).
   - Catálogos (D19), todos con name_es, name_en (cuando aplique) y active:
     catalog_license_type (rav60_category, required_medical_class nullable,
     applies_expiry, validity_months, validity_is_placeholder),
     catalog_type_rating (modelo de aeronave), catalog_class_rating,
     catalog_aircraft, catalog_function, catalog_license_observation,
     catalog_medical_observation, catalog_document_type, catalog_attachment_type,
     catalog_nationality.
   - licencia: license_type_id (reemplaza rav60_category), number,
     expiry_date nullable (D20), verification_token uuid único.
     licencia_observacion (N:M).
   - Reemplazar habilitacion por: habilitacion_tipo (licencia_id, type_rating_id,
     function_id, expiry_date) y habilitacion_clase (licencia_id, class_rating_id,
     expiry_date) + habilitacion_clase_aeronave (N:M).
   - certificado_medico: number, verification_token; certificado_observacion (N:M).
   - parametro_sistema (key, value jsonb, is_placeholder): umbral de alertas y vigencia
     por clase médica RAV 67.
   - recurso_grafico (kind logo_inac|firma_presidente, data bytea, mime).
   - alerta (personal_id, credential_kind, credential_id, kind vencida|proxima,
     due_date, acknowledged_by/at; único (credential_id, kind)).
   - acceso_usuario (usuario_id nullable, identifier, ip, success, created_at): lo
     escribe el login, para D23.
   - AUDIT_ACTIONS: + emitir, renovar, bloquear, resolver, reconocer, exportar,
     restablecer_contrasena, adjuntar.
2. Seed (D3, D25): placeholders con is_placeholder=true; catálogos ficticios inspirados
   en SLYM (unos 40 tipos de licencia, 60 modelos de aeronave, 30 clases, 40
   observaciones, todos bilingües); unas 50 personas ficticias con licencias,
   habilitaciones de tipo y de clase, certificados de las 3 clases (algunos vencidos y
   otros próximos a vencer) y bloqueos; un usuario por cada combinación de rol y área.
   El seed debe ser determinista (semilla fija) y correr con `pnpm db:seed`.
3. RBAC (AUTH-04, D1, D24): la matriz como datos en packages/types/src/permissions.ts y
   can(role, area, module, action). En la API, un decorador
   @RequirePermission(module, action) y un guard global que responde 403. Reemplazar
   AllowAllWritePolicy. Tests: Consulta recibe 403 al escribir personal; un Supervisor
   de Licencias recibe 403 al escribir un certificado médico.
4. Login: registrar cada intento en acceso_usuario.
   Catálogos (solo lectura): GET /api/catalogs/:catalog/options?q=&limit= para todos
   los catálogos de D19 (solo ítems activos; devuelve id, name_es y name_en). Lo usan
   en paralelo W1-4, W1-5 y W1-6; el CRUD lo hace W1-11.
5. Núcleo compartido en apps/api/src/shared/credentials/:
   - puerto + adapter ValidityParametersReader (vigencia por tipo de licencia y por
     clase médica, umbral);
   - puerto + adapter ActiveBlockQuery;
   - deriveCredentialStatus(expiryDate|null, today, thresholdDays, hasActiveBlock) en
     packages/types: vigente | proxima_a_vencer | vencida | bloqueada.
6. Esqueletos registrados en app.module.ts: users, settings, catalogs,
   validation-blocking, licenses, medical-certificates, audit, reports, alerts,
   credentials, public-verify. Cada uno con su carpeta hexagonal y un README de una
   línea. En packages/types, un archivo de contratos por feature, exportado desde
   index.ts.
7. Docs: marcar el Login como hecho en docs/pages-inventory.md y en
   openspec/changes/sryg-page-designs/tasks.md (fase 7); actualizar
   openspec/config.yaml (Vitest, strict_tdd: true).
Fuera de alcance: endpoints de negocio de los módulos nuevos y la web.
```

### F0-B — `feat/foundation-web` (ola 0, después de mergear F0-A)

```text
<PREÁMBULO con RAMA=feat/foundation-web>
Esta rama SÍ edita los archivos compartidos de la web.
1. Sesión real (D4, D12):
   - /api/auth/me al arrancar; RoleProvider expone el rol y el área.
   - fetchJson envía el Bearer. Ante un 401, limpia la sesión y va a /ingreso?next=.
   - Si must_change_password está activo, redirige a /perfil.
   - Logout en el shell.
2. Eliminar el modo demo: ?rol=, useDemoResource, demo/roster.ts y el demoData de
   personnel. La UI usa can() de packages/types. Excepción: features/licenses conserva
   su demoData hasta W1-5.
3. Conectar el Listado y el Expediente a la API real (con los campos nuevos de F0-A),
   con los estados de carga, vacío y error de sus templates.
4. Dividir ExpedienteContainer en un componente por pestaña
   (features/<feature>/expediente/<Tab>Tab.tsx: datos, documentos, medico,
   licencias, bloqueos, historial) y slots de acciones de cabecera por feature
   (features/<feature>/expediente/<Feature>Actions.tsx). Lo no implementado se muestra
   deshabilitado con "Próximamente". El diseño visual no cambia.
5. Pre-registrar en App.tsx, routes.ts, nav-items.ts y permissions todas las rutas,
   cada una apuntando a features/<feature>/pages/<X>Page.tsx con un placeholder:
   - /panel, /bloqueos, /reportes, /auditoria, /usuarios, /parametros, /perfil
   - /catalogos y /catalogos/:catalogo
   - /licencias (consulta de licencias)
   - /personal/nuevo, /personal/:id/editar, /personal/:id/certificado-medico
   - /verificar/:token (pública, sin shell)
   Además: páginas 403 y 404 con ErrorTemplate, `/` redirige a /panel y se quita
   /respaldos. La navegación agrupa por área ("Licencias", "Medicina",
   "Administración"), como en SLYM.
6. features/catalogs/CatalogSelect.tsx: selector con búsqueda sobre
   /api/catalogs/:catalog/options, exportado para que lo usen los formularios de la
   ola 1.
7. Tests de componentes con Testing Library: login → /me → navegación según rol y área,
   y CatalogSelect.
```

### W1-1 — `feat/users-auth`

```text
<PREÁMBULO con RAMA=feat/users-auth>
Alcance: AUTH-06 y AUTH-08 (páginas 11 y 14), más D23 en la API. Aplica D1, D4, D14 y D24.
API:
- POST /api/auth/change-password: contraseña actual + nueva (mínimo 10 caracteres);
  limpia must_change_password.
- GET /api/auth/me/access-log: últimos 5 accesos exitosos y últimos 5 fallidos del
  usuario actual (desde acceso_usuario).
- /api/users, solo Admin: listar, crear, editar nombre/rol/área, activar o desactivar,
  POST /:id/reset-password (contraseña temporal que se muestra una sola vez y activa
  must_change_password). No se puede desactivar ni degradar al último Admin activo.
  Todo queda auditado.
Web: /usuarios (ListPageTemplate + diálogo con el formulario) y /perfil
(FormPageTemplate), donde también se ve el registro de accesos. Solo editar
features/users/** y features/auth/**.
```

### W1-2 — `feat/settings`

```text
<PREÁMBULO con RAMA=feat/settings>
Alcance: página 12 (D3, D15, D18). Solo Admin.
API (settings):
- GET y PUT del umbral de alertas y de la vigencia por clase médica; guardar pone
  is_placeholder=false.
- GET y PUT de recurso_grafico (logo_inac, firma_presidente): PNG/JPEG de hasta 500 KB.
- Todo queda auditado.
La vigencia por tipo de licencia se edita en el catálogo (W1-11), no acá.
Web: /parametros (FormPageTemplate) con las secciones Vigencias (clases médicas),
Alertas y Credencial. Todo placeholder se marca "PENDIENTE INAC". Solo editar
features/settings/**.
```

### W1-3 — `feat/blocking`

```text
<PREÁMBULO con RAMA=feat/blocking>
Alcance: VAL-01..06 (página 8). Aplica D2, D17, D24 y BR-07/BR-08.
API (validation-blocking):
- Registrar un bloqueo (type, reason) y resolverlo (resolutionNote obligatoria).
- Listar con filtros: estado, tipo y persona.
- Pueden escribir el Admin y el Supervisor de cualquier área; Consulta solo lee.
- Se audita con las acciones bloquear y resolver.
Web: /bloqueos (ListPageTemplate). En el Expediente, la pestaña y la acción de bloqueos
(features/blocking/expediente/**) y un banner persistente mientras haya un bloqueo
activo. Solo editar features/blocking/**.
```

### W1-4 — `feat/personnel-form`

```text
<PREÁMBULO con RAMA=feat/personnel-form>
Alcance: PER-03, PER-06, PER-07, D21 y los follow-ups del Listado (tasks.md 3.11).
API:
- PUT y GET /api/personnel/:id/photo y /signature (D5). Se comprimen en el servidor.
  Dependencia autorizada: sharp.
- /api/personnel/:id/attachments: listar, subir (PDF o imagen de hasta 5 MB, tipo de
  catálogo), descargar y borrar. Auditado con la acción adjuntar.
- DELETE /api/personnel/:id: responde 409 si la persona tiene credenciales (BR-10).
- Validar los campos de D21 en create y update.
Web:
- /personal/nuevo y /personal/:id/editar (FormPageTemplate): nombres, apellidos, tipo
  de documento y nacionalidad desde catálogo, foto y firma con vista previa.
- Pestaña "Documentos" del Expediente (features/personnel/expediente/**) y la acción
  "Editar datos".
- Follow-ups del Listado: hover de la tecla del anunciador y Categoría en móvil.
Solo editar features/personnel/**.
```

### W1-5 — `feat/licenses`

```text
<PREÁMBULO con RAMA=feat/licenses>
Alcance: LIC-01..08. Aplica D3, D13, D20, D22, D24 y BR-07/BR-09.
API (licenses):
- Emitir y renovar una licencia: tipo de catálogo, número (por defecto el documento,
  D22), fecha de emisión y observaciones (N, de catálogo).
- Vencimiento: se calcula con validity_months del tipo; es null si applies_expiry es
  false.
- Agregar, renovar y quitar habilitaciones de tipo (aeronave + función + vencimiento)
  y de clase (clase + aeronaves + vencimiento).
- Antes de emitir: ActiveBlockQuery (409 si hay bloqueo) y la coherencia de D13 (409
  con el motivo).
- Historial y transacción con auditoría (emitir/renovar).
- Consulta GET /api/licenses con filtros por solicitante, número, tipo y rango de
  vencimiento, como en SLYM.
Web:
- Conectar /personal/:id/licencia (diseño existente) a la API, sumando las secciones
  de habilitaciones de tipo y de clase y las observaciones, siguiendo el comp del
  formulario. Borrar el demoData de licenses.
- /licencias (ListPageTemplate) para la consulta.
- Pestaña Licencias del Expediente (features/licenses/expediente/**).
- El 409 se muestra como estado "bloqueado" de primer nivel.
Solo editar features/licenses/**.
```

### W1-6 — `feat/medical-certificates`

```text
<PREÁMBULO con RAMA=feat/medical-certificates>
Alcance: MED-01..07 (página 7). Aplica BR-03/BR-05, D3, D8, D22 y D24.
API:
- Registrar y renovar un certificado médico: clase RAV 67, número (por defecto el
  documento), fecha de emisión, vencimiento según la vigencia de la clase,
  observaciones médicas (N, de catálogo) y restrictions en texto libre.
- Escriben el Admin y el Supervisor de Medicina.
- Historial y chequeo de bloqueo (409).
- Ningún dato clínico.
Web: /personal/:id/certificado-medico (FormPageTemplate), con el aviso "Este sistema no
almacena datos clínicos", y la pestaña Médico del Expediente
(features/medical-certificates/expediente/**). Solo editar
features/medical-certificates/**.
```

### W1-7 — `feat/audit-viewer`

```text
<PREÁMBULO con RAMA=feat/audit-viewer>
Alcance: REP-04/REP-05 (página 10). Acceso: Admin y Supervisor.
API: GET /api/audit con filtros (actor, acción, entidad, entityId, rango de fechas),
paginación y exportación a CSV. Solo lectura.
Web: /auditoria (ListPageTemplate) y, en el Expediente, la pestaña Historial filtrada
por persona (features/audit/expediente/**). Solo editar features/audit/**.
```

### W1-8 — `feat/reports`

```text
<PREÁMBULO con RAMA=feat/reports>
Alcance: REP-01..03 y REP-06 (página 9). Aplica D10.
API:
- Los 3 reportes de D10, con el estado calculado por deriveCredentialStatus y
  ValidityParametersReader.
- Filtros por tipo de licencia, categoría RAV 60, estado y rango de fechas.
- Exportación a CSV y PDF (dependencia autorizada: pdfkit). El export se audita.
- Consulta solo accede al reporte 1.
Web: /reportes (ListPageTemplate). Solo editar features/reports/**.
Usá fixtures propios en las tablas; no dependas de que otras ramas de la ola 1 estén
mergeadas.
```

### W1-9 — `feat/alerts-api`

```text
<PREÁMBULO con RAMA=feat/alerts-api>
Alcance: ALR-01, ALR-02, ALR-04 y ALR-06; solo API. El Dashboard es W2-1. Aplica D6.
API:
- Recálculo idempotente de la tabla alerta a partir de licencias, habilitaciones de
  tipo y de clase y certificados médicos. Las licencias con expiry_date null no
  generan alertas.
- Se ejecuta a diario con @nestjs/schedule (dependencia autorizada) y también en
  GET /api/alerts (filtros por kind, acknowledged y área).
- POST /api/alerts/:id/acknowledge, auditado como reconocer.
- GET /api/alerts/summary, con conteos por estado, tipo de credencial y área.
Usá fixtures propios en las tablas.
```

### W1-10 — `feat/backups`

```text
<PREÁMBULO con RAMA=feat/backups>
Alcance: OPS-01, OPS-02 y OPS-05, sin página (D11).
- .github/workflows/backup.yml: cron diario + workflow_dispatch. Hace pg_dump de
  DATABASE_URL (secret), lo cifra con age (secret BACKUP_AGE_RECIPIENT) y lo sube como
  artifact con 30 días de retención.
- scripts/restore.sh: descifra y restaura en una base de destino. Nunca restaura en
  producción por defecto.
- docs/respaldos.md: runbook de backup y restore, simulacro trimestral y alta de los
  secrets.
Probalo localmente contra el Postgres de docker-compose.
```

### W1-11 — `feat/catalogs`

```text
<PREÁMBULO con RAMA=feat/catalogs>
Alcance: D19. Es el equivalente de las pantallas de mantenimiento de SLYM.
- Escribe solo el Admin; leen todos.
API (catalogs):
- CRUD genérico para los catálogos de D19: listar con búsqueda y paginación, crear,
  editar y activar o desactivar.
- No se borra físicamente un ítem en uso: se desactiva y queda la referencia.
- En tipos de licencia se editan además rav60_category, required_medical_class,
  applies_expiry y validity_months (guardar pone validity_is_placeholder=false).
- Todo queda auditado.
- El endpoint de opciones y CatalogSelect ya existen desde la ola 0: no los cambies.
Web:
- /catalogos: índice de catálogos.
- /catalogos/:catalogo (ListPageTemplate + diálogo con el formulario), con los campos
  español/inglés.
Solo editar features/catalogs/** (excepto features/catalogs/CatalogSelect*).
```

### W2-1 — `feat/dashboard` (después del gate de diseño y de W1-1 y W1-9)

```text
<PREÁMBULO con RAMA=feat/dashboard>
Alcance: ALR-03 (página 2), DS-04 DashboardTemplate y D23.
Implementá exactamente la dirección aprobada en .impeccable/surfaces/<dashboard>. No
inventes una dirección visual; documentá en el PR lo que el brief no cubra.
- DashboardTemplate en el design system (autorizado editar design-system/index.ts para
  exportarlo).
- /panel: consume /api/alerts, /api/alerts/summary y /api/auth/me/access-log.
- Acuse de alertas.
- Contenido según rol y área (D1, D24).
Solo editar features/alerts/** y design-system/templates/DashboardTemplate/**.
```

### W2-2 — `feat/credentials-pdf` (después de W1-2, W1-3, W1-4, W1-5, W1-6 y W1-11)

```text
<PREÁMBULO con RAMA=feat/credentials-pdf>
Alcance: OUT-01..05. Aplica D7, D9, D18 y D22. El layout exacto está en la §4.
API (credentials):
- GET /api/personnel/:id/credentials/license/:licenseId.pdf y
  GET /api/personnel/:id/credentials/medical/:certId.pdf.
- Formato CR80, frente y reverso, con foto, firma del titular, recursos gráficos
  (placeholder si faltan), textos bilingües de los catálogos y QR. Dependencias
  autorizadas: pdfkit y qrcode.
- Responde 409 si hay un bloqueo activo o si la credencial no está vigente.
- Auditado como emitir. Acceso: Admin y Supervisor del área correspondiente.
public-verify:
- GET /api/public/verify/:token, sin autenticación y con throttle.
- Devuelve solo los campos de D9.
Web:
- Acción "Imprimir credencial" en el Expediente (features/credentials/expediente/**),
  con elección de licencia o certificado.
- /verificar/:token (AuthTemplate).
Test: snapshot del texto del PDF (pdf-parse) con datos ficticios.
```

### W3-1 — `chore/integration-close` (al final)

```text
<PREÁMBULO con RAMA=chore/integration-close>
Esta rama SÍ edita los docs de progreso.
1. Borrar PendingScreen y los placeholders que queden.
2. Smoke E2E con Playwright (dependencia autorizada), sumado al CI. Flujo:
   - el Admin carga catálogos y da de alta una persona con foto, firma y un adjunto;
   - un Supervisor de Medicina registra el certificado;
   - un Supervisor de Licencias emite la licencia con habilitaciones de tipo y de clase;
   - un bloqueo impide renovar; se resuelve;
   - se imprime la credencial;
   - se hace la verificación pública.
3. Sincronizar docs/pages-inventory.md, openspec/changes/*/tasks.md y los checklists §12
   de docs/sryg-definitions-and-tasks.md con lo entregado. Registrar D1–D25 en las OD
   correspondientes y actualizar BR-03, BR-05 y BR-09 y la matriz §4 (área).
4. Revisar render.yaml y docs/deploy.md: variables nuevas y secrets de backup.
```
