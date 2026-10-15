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