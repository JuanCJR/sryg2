# Inventario de páginas de SRYG

SRYG necesita **15 páginas construidas sobre 6 templates**. Este documento indica qué página generar, sobre qué template, para qué roles, qué cambio del roadmap la implementa y qué decisión abierta la bloquea. El propósito, los datos, las acciones y los estados de cada página no se repiten aquí: están en [`design-brief-runbook.md` §6](design-brief-runbook.md#6-views).

Para generarlas con Impeccable, sigue [`impeccable-design-workflow.md`](impeccable-design-workflow.md).

## Progreso

Fuente de verdad: `sryg-frontend/openspec/changes/sryg-page-designs/tasks.md`. Si esta lista y `tasks.md` difieren, manda `tasks.md`.

- [ ] 1. Login — AuthTemplate
- [ ] 2. Dashboard / Alertas — DashboardTemplate
- [x] 3. Listado / búsqueda de personal — ListPageTemplate
- [x] 4. Expediente del personal — DetailPageTemplate
- [ ] 5. Registro / edición de personal — FormPageTemplate
- [x] 6. Emisión / renovación de licencia y habilitación — FormPageTemplate
- [ ] 7. Registro / renovación de certificado médico — FormPageTemplate
- [ ] 8. Registro y resolución de bloqueos — ListPageTemplate
- [ ] 9. Reportes — ListPageTemplate
- [ ] 10. Visor de auditoría — ListPageTemplate
- [ ] 11. Administración de usuarios y roles — ListPageTemplate
- [ ] 12. Configuración / parámetros — FormPageTemplate
- [ ] 13. Estado de respaldos — DashboardTemplate (condicional, Q1)
- [ ] 14. Perfil / cambio de contraseña — FormPageTemplate
- [ ] 15. Error / 403 / 404 — ErrorTemplate

## Páginas

Roles según la matriz propuesta en [`sryg-definitions-and-tasks.md` §4](sryg-definitions-and-tasks.md#4-roles-and-permission-matrix), pendiente de validación con INAC (OD-14). **A** = Administrador, **S** = Supervisor, **C** = Consulta; entre paréntesis, acceso de solo lectura.

| # | Página | Template | Roles | Feature | Tarea | Bloqueada por |
|---|---|---|---|---|---|---|
| 1 | Login | AuthTemplate | Todos | auth | AUTH-08 | OD-12 |
| 2 | Dashboard / Alertas | DashboardTemplate | A, S, C | alerts | ALR-03 | OD-04, OD-05 |
| 3 | Listado / búsqueda de personal | ListPageTemplate | A, S, C | personnel | PER-04 | OD-07 |
| 4 | Expediente del personal | DetailPageTemplate | A, S, (C) | personnel | PER-05 | OD-03, OD-07 |
| 5 | Registro / edición de personal | FormPageTemplate | A, S | personnel | PER-06 | OD-03 |
| 6 | Emisión / renovación de licencia y habilitación | FormPageTemplate ¹ | A, S | licenses | LIC-05 | OD-06, OD-07 |
| 7 | Registro / renovación de certificado médico | FormPageTemplate | A | medical-certificates | MED-05 | OD-06, OD-07 |
| 8 | Registro y resolución de bloqueos | ListPageTemplate ¹ | A, S | validation-blocking | VAL-03 | OD-07, OD-08 |
| 9 | Reportes | ListPageTemplate | A, S, (C limitado) | reports | REP-03 | OD-10 |
| 10 | Visor de auditoría | ListPageTemplate ¹ | A, S | audit | REP-04 | — |
| 11 | Administración de usuarios y roles | ListPageTemplate | A | users | AUTH-06 | OD-14 |
| 12 | Configuración / parámetros | FormPageTemplate | A | settings | ALR-05 ² | OD-04, OD-05, OD-06 |
| 13 | Estado de respaldos | DashboardTemplate | A | settings | OPS-04 | OD-02 ³ |
| 14 | Perfil / cambio de contraseña | FormPageTemplate | Todos | auth | AUTH-08 | OD-12 |
| 15 | Error / 403 / 404 | ErrorTemplate | Todos | shell | DS-04 ¹ | — |

¹ Inferido. El runbook §6 lista los componentes de la página pero no nombra su template.
² No tiene una tarea propia. Reúne los parámetros de ALR-05 (umbral), LIC-02 y MED-03 (vigencias) y ALR-04 (canal de notificación).
³ La página podría no existir: OPS-04 permite resolverlo con un runbook de operaciones.

La columna *Feature* sigue la estructura por features de `sryg-definitions-and-tasks.md` §9 y coincide con los módulos del backend.

**OD-07 afecta a casi todas las páginas.** El nombre canónico del estado bloqueado ("Bloqueada" o "Suspendida") aparece en el `StatusBadge` de 3, 4, 6, 7 y 8. DS-05 lo aísla en un solo token, así que puedes generar las páginas antes de resolverlo.

## Orden de generación

Genera los templates primero. Las 15 páginas son instancias de 6 templates; si una página se genera antes que su template, inventa su propia estructura y el sistema se fragmenta.

1. **App shell y templates** (DS-04): navegación por rol y los 6 templates.
2. **Una página de referencia por template.** Elige la más exigente, porque las demás heredan sus decisiones:

   | Template | Página de referencia | Por qué es la más exigente |
   |---|---|---|
   | DetailPageTemplate | 4. Expediente | Pestañas, banner de bloqueo persistente en todas las pestañas, layout de tablet |
   | ListPageTemplate | 3. Listado de personal | Pantalla principal de Consulta; tabla densa en escritorio, uso en campo desde el teléfono |
   | FormPageTemplate | 6. Emisión de licencia | Estado "bloqueado" como estado de primer nivel, no como error |
   | DashboardTemplate | 2. Dashboard | Contenido distinto según el rol |
   | AuthTemplate / ErrorTemplate | 1. Login | Primera impresión; ErrorTemplate reutiliza su estructura |

3. **El resto, siguiendo el roadmap** (`sryg-definitions-and-tasks.md` §11), para que cada página exista cuando su cambio la necesite:

   | Ola | Cambio | Páginas |
   |---|---|---|
   | 1 | `sryg-auth-rbac` | 14, 11, 15 |
   | 2 | `sryg-personnel-registry` | 5 |
   | 3 | `sryg-medical-certificates` | 7 |
   | 4 | `sryg-status-validation-blocking`, `sryg-alerts-dashboard` | 8, 12 |
   | 5 | `sryg-reports-audit`, `sryg-backups-ops` | 9, 10, 13 |

## Lo que no es una página

Estas piezas aparecen en las tareas pero van dentro de otra página. No generes una página aparte para ellas.

| Pieza | Tarea | Dónde va |
|---|---|---|
| Historial por licencia | LIC-06 | Pestaña *licencias* o *historial* del expediente (4) |
| Historial por certificado médico | MED-07 | Pestaña *certificados médicos* o *historial* del expediente (4) |
| Acción de imprimir / exportar credencial | OUT-05 | Acción en el expediente (4) |
| Reconocimiento de alertas | ALR-06 | Dashboard (2) |
| Registro de auditoría por persona | — | Pestaña *historial* del expediente (4), con `AuditLogTable` |

## Huecos a resolver antes de generar

| Hueco | Afecta a | Decisión necesaria |
|---|---|---|
| El Login tiene un enlace "olvidé mi contraseña", pero ninguna tarea define ese flujo. AUTH-06 solo contempla que un administrador restablezca la contraseña. | 1 | Quitar el enlace, o agregar una página de recuperación y su tarea en AUTH |
| OUT-03 define una plantilla de credencial imprimible que no figura en el runbook §6. | Posible página 16 | Decidir si la credencial tiene vista previa en pantalla o se genera directamente como PDF (OD-09) |
| El runbook no define si la configuración (12) agrupa todos los parámetros o si cada módulo expone los suyos. | 12 | Confirmar una sola página agrupada por categoría, como propone el runbook |
