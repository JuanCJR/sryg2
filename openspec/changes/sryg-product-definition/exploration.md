# Exploration: sryg-product-definition — INAC Maracay credential-management system

Source: `docs/thesis.docx` (engineering thesis, Spanish), converted to markdown with pandoc. Line numbers below refer to that conversion (`pandoc -t markdown docs/thesis.docx`, 3115 lines).
Logo: `docs/4cb0a814-0c95-4639-94c0-bfe204db3bb8.jpg` — white ring pierced by a star/compass-needle mark on black; minimal aeronautical/navigation motif; dark-first brand input.

## 1. Product summary and problem

INAC Maracay (regional office of Venezuela's Instituto Nacional de Aeronáutica Civil) tracks aeronautical personnel credentials (licenses, ratings, medical certificates) with physical files and local spreadsheets (303–315, 383–392). Consequences: slow queries, typos, duplicate records (307–310, 427–429); weak proactive oversight during ramp inspections/audits (309–311); risk that personnel with expired documents or undetected medical impediments perform critical functions (311–315, 397–400).

Root causes: no centralized platform; manual methods without real-time updates; no automated validation/notification of expirations or impediments (412–418). Risks if uncorrected: ICAO regulatory sanctions, operational incidents, loss of audit traceability (430–434); no consolidated real-time reports for the directive (435–439).

- General objective (479–481): develop an automated system to manage aeronautical-personnel credentials at INAC.
- Specific objectives (483–502): diagnose the current process; determine functional/non-functional requirements; design DB and UI; program modules; validate via user testing.
- In scope (577–658): personnel registry; license & rating control; medical-certificate administration; status validation at issue/renewal; reports & audit; security & access control.
- Out of scope (649–658): clinical medical evaluation (only administrative results are recorded); other INAC areas (finance, materiel, HR hiring, training not tied to license issuance/renewal).
- Delimitation (375–382): Maracay regional office only.

## 2. Actors and roles

System roles (636–639, 727–730, 914–916, 1169–1170, 2067–2070): **Administrador, Supervisor, Consulta**. Access is "restringido según el perfil" (639–640). **No explicit permission-per-module matrix exists** (open decision).

Design hint: abstract `Usuario` base class with `Administrador`, `Supervisor`, `Consulta` subclasses (1401–1407).

Tracked personnel (business actors, not necessarily users): pilots, cabin crew, maintenance technicians, air traffic controllers (294–295, 378–380, 584–587, 796–797; glossary 2072–2075). RAV 60 license categories: airline transport pilot, commercial pilot, private pilot, cabin crew, maintenance technician, ATC (794–797).

Authorized medical examiners perform clinical exams outside the system; authorized administrative staff enter only administrative results (603–613).

INAC directive: consumer of statistical/compliance reports (435–438, 627–630); not necessarily a distinct role.

UML illustrative actors (1324–1337): "funcionario de Taquilla Técnica", "Supervisor de Licencias", "Inspector de Seguridad Aeronáutica en Rampa" — job titles, not a second role taxonomy. To reconcile.

Real user population (2689–2711): Taquilla Técnica de Licencias staff (4), Supervisores de la Gerencia de Seguridad Aeronáutica (2), Inspectores de Seguridad Aeronáutica en Rampa (3) — 9 total. Mapping to system roles is inferred, not stated.

## 3. Domain entities

- **PersonalAeronautico**: personal, professional and contact data; photo; blood type; cédula; cargo(s); dependencia(s); institutional status (584–591); personnel category (794–797).
- **Licencia**: issue and expiry dates (594–601); RAV 60 category; participates in the credential state machine. `PersonalAeronautico` 1→N `Licencia` (1388–1392).
- **Habilitacion**: specific authorization attached to a license for particular functions or aircraft type (2050–2053); independently dated (1029–1034).
- **CertificadoMedico**: Class 1 (airline/commercial pilot), Class 2 (private pilot), Class 3 (ATC) (803–806, 604–605). Stored fields limited to: type, issue date, expiry date, general operational restrictions (606–608). **Clinical data, diagnoses and medical histories are excluded** (608–610). CRUD only by authorized administrative staff (611–613).
- **Usuario**: system account; base of the three roles (1401–1407).
- **Auditoria**: every operation/modification with actor and timestamp (627–633, 1360–1361, 2022–2025, 2108–2111).
- Tables named at design phase (1183–1186): Personal Aeronáutico, Licencia, Certificado Médico, Habilitación, Usuario, Auditoria, with referential integrity and indexes.
- No credential may exist without a titular (1660–1664). Backend components named: `GeneradorCredencialPDF` depends on `ValidadorVigenciaRAV60` (1372–1379).

## 4. Business rules

- **RAV 60** (792–800): license requirements, categories, ratings, validity per personnel type, renewal conditions, suspension/revocation causes. **No numeric validity periods in the source.**
- **RAV 67** (802–810): three medical classes; validity varies by age and function. **No numbers in the source.**
- **ICAO Annex 1** (785–788): international standards. **No numbers in the source.**
- **State machine** — inconsistent naming in source:
  - "vigente, próxima a vencer, vencida o bloqueada administrativamente" (1288–1291)
  - "Activa" → "Vencida" on RAV 60 expiry, or → "Suspendida" on RAV 67 medical sanction (1417–1426)
  - "Activa, Vencida o Bloqueada" (2635–2638)
- **Automatic blocking** (615–625): on any credential registration/renewal, the system verifies status; a registered administrative, medical or regulatory impediment fires a block alert and prevents issuance until "formalmente solventada y registrada en el sistema por la autoridad competente". The competent role is not specified.
- **Expiry alerts**: "alertas de vencimiento" (1167–1168); detect near-expiry and expired credentials (599–601). **No threshold stated.**
- **Medical data restriction**: administrative fields only (606–613).
- **Cross-credential coherence**: validate coherence between license, ratings and medical certificate (738–740).
- **Referential integrity** (1660–1664).
- **Alerta de bloqueo** glossary (2006–2009).

## 5. Functional modules

Scope (582–641):
1. Personnel registry and administration (584–591).
2. Licenses and technical ratings control, history, near-expiry/expired detection (594–601).
3. Medical certificate administration, admin-only data (603–613).
4. Personnel status validation with block alert (615–625).
5. Reports and audit (627–633).
6. Security and access control, backups (635–641).

Coding-phase regrouping (1198–1202): authentication/access control; personnel registry/query; credential issue/renewal; expiry alerts; reports; audit/traceability.

UML illustrative use cases (1339–1352): "Registrar Personal Técnico", "Validar Certificado Médico RAV 67", "Emitir Credencial Digital con Código QR Autenticado".

## 6. Non-functional requirements

- Availability > 99% on the local network (1171–1172, 2556–2557).
- Query/API latency < 3 s (1172–1173, 2557–2559).
- Multiple concurrent users; PostgreSQL MVCC (1173–1174, 1707–1710).
- ISO/IEC 27001-aligned: RBAC, immutable indexed audit trail (1768–1774); stateless JWT carrying role (1739–1749).
- ISO/IEC 25010 quality model, emphasis on functional suitability, reliability, maintainability (1788–1807).
- Ley de Infogobierno Art. 34: free/open-source software and open standards (1909–1921).
- Ley Especial Contra los Delitos Informáticos: access control, authentication, audit logging (1935–1945).
- ACID transactions for issue/renewal (1638–1652, 1693–1705).
- Backups: automated PostgreSQL backup/restore scripts (640–641, 2597–2600).
- Data encryption mentioned (2036–2039), mechanism unspecified.
- Survey indicators (2382–2420): centralized search, role restrictions, automated backup, automated expiry alerts, regulatory validation.
- Planned tests: unit, integration, UAT, concurrent load, security (1204–1215, 2584–2592).

## 7. Reports

- Statistical and compliance reports for the directive (627–630).
- Personnel with credentials near expiry or expired (740–742).
- Real-time consolidated status (435–439).
- **No concrete report catalog** (types, fields, filters, export formats).

## 8. Views/screens

Explicit (1189–1191): registration, query/lookup, issuance, reports, administration screens.

Inferred: login; personnel detail ("expediente electrónico", 2046–2048); block/impediment resolution; audit-trail viewer; dashboard with expiry alerts.

## 9. Stack, tooling, methodology

- TypeScript front and back, OOP (1591–1593, 2615–2620); Node.js (1728–1737, 2578–2582); PostgreSQL (1693–1723); VS Code (1612–1624); JWT (1739–1749).
- 9 UML diagrams (1274–1316, 2631–2638).
- Waterfall, 5 phases (1161–1224, 2537–2601).
- Census of 9 staff (2657–2715); observation + 10-item survey, KR-20 (2280–2292, 2450–2484).
- Schedule 17 weeks; coding weeks 3–10 (2717–2866).
- Line 2755 mentions "TypeScript y React" for the UI — the only concrete frontend framework mention; `openspec/config.yaml` treats frontend framework as an open decision.

## 10. Open decisions

1. ~~Frontend framework~~ — RESOLVED by user (2026-09-26): React + Vite.
2. ~~Backend framework~~ — RESOLVED by user (2026-09-26): NestJS.
3. ~~ORM / query builder~~ — RESOLVED by user (2026-09-26): Drizzle ORM, PostgreSQL database.
4. Migration tool — follows from Drizzle: drizzle-kit (to confirm in design).
5. Hosting topology (on-prem local server implied at 1550–1552, 2622–2624).
6. Photo storage (DB vs filesystem vs object storage).
7. Alert notification channel (in-app, email, SMS).
8. Near-expiry threshold (days).
9. Numeric validity periods per license category, rating, medical class (must come from RAV texts or INAC, ideally configurable).
10. Canonical blocked-state name (Bloqueada vs Suspendida).
11. Role that can lift a block ("autoridad competente").
12. Credential output: PDF, QR-authenticated digital credential, or both.
13. Report catalog detail.
14. Test runner.
15. Password/account policy (complexity, lockout, rotation).
16. Multi-office scope (single office confirmed for initial delivery).

## 11. Recommended OpenSpec decomposition

> Superseded by the 11-change roadmap in `proposal.md` (adds `sryg-design-system` and `sryg-credential-output`, renames alerts to `sryg-alerts-dashboard`). Kept as the original exploration output.

1. `sryg-project-scaffold` — workspace, tsconfig, lint/format, test runner, CI, PostgreSQL wiring. First.
2. `sryg-auth-rbac` — users, roles, JWT, RBAC middleware, audit write path. Depends on 1.
3. `sryg-personnel-registry` — PersonalAeronautico CRUD. Depends on 2.
4. `sryg-licenses-ratings` — Licencia, Habilitacion, RAV 60 rules, state machine. Depends on 3.
5. `sryg-medical-certificates` — CertificadoMedico, RAV 67, no clinical data. Depends on 3; parallel with 4.
6. `sryg-status-validation-blocking` — coherence check, block on issue/renewal, block lift. Depends on 4, 5.
7. `sryg-alerts-notifications` — expiry alerts, threshold, channel. Depends on 4, 5.
8. `sryg-reports-audit` — reports, audit viewer/export. Depends on 2–5.
9. `sryg-backups-ops` — backup/restore, deployment. Depends on 1; parallel.

The product-definition master file and the design-system views runbook requested for this change are the shared foundation these capabilities trace back to.
