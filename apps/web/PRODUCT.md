# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

SRYG serves a small technical staff at INAC Maracay (Venezuela), 9 people in total per the thesis survey:

- **Taquilla Técnica de Licencias staff (4).** Desk-based, high daily volume. They register aeronautical personnel and issue or renew licenses, ratings, and medical certificates. Proposed system role: Administrador.
- **Gerencia de Seguridad Aeronáutica supervisors (2).** Office-based oversight, approvals, and reports for the directive. Proposed system role: Supervisor.
- **Ramp Safety Inspectors (3).** Consult personnel records during ramp checks, on tablets or phones, in the field. Read-only. Proposed system role: Consulta.

The persona-to-role mapping is inferred, not stated in the source. It must be confirmed with INAC before it drives access decisions (OD-14).

The Directiva (executive leadership) consumes statistical and compliance reports but is not a daily user.

## Product Purpose

SRYG is the credential-management system for aeronautical personnel at INAC Maracay. Today the office tracks licenses, ratings, and medical certificates in physical files and local spreadsheets. That produces slow lookups, typos, duplicate records, weak oversight during ramp inspections, and the risk that someone with an expired document or an undetected impediment performs a safety-critical function.

SRYG centralizes personnel, license/rating (RAV 60), and medical-certificate (RAV 67) records in one electronic file per person (the expediente). It validates credential status automatically at issue and renewal, and it blocks issuance while an administrative, medical, or regulatory impediment is registered, until the competent authority formally resolves it.

Success means: any staff member finds a person's full, current credential status in seconds; no credential is issued or renewed over an open impediment; near-expiry and expired credentials surface without anyone hunting for them; and every change is traceable in an immutable audit trail.

## Positioning

A government aviation-safety instrument, not a generic records app. Its defining mechanism is the automatic block check at issue and renewal: a registered impediment makes issuance impossible, and the interface names the specific impediment instead of failing with a generic error. It must read as precise and credible before it reads as friendly.

## Operating Context

- **Taquilla Técnica desk:** repetitive registration and issuance work on desktop, dense tables, keyboard-heavy data entry.
- **Supervisor office:** desktop review of alerts, blocks, audit history, and directive reports.
- **Ramp:** inspectors look up a person by name or cédula on a tablet or phone, outdoors, during an inspection. Tablet is a first-class target, not a shrunk desktop.
- **Regulatory frame:** RAV 60 (personnel licensing) and RAV 67 (medical certification). Source documents and regulations are in Spanish.
- **Deployment:** Maracay regional office only for the initial delivery; on-prem local network is the proposed hosting (OD-02).
- **Source of truth:** the engineering thesis (`../../docs/thesis.docx`), distilled in `../../docs/sryg-definitions-and-tasks.md` and `../../docs/design-brief-runbook.md`.

## Capabilities and Constraints

**Capabilities (in scope):** personnel registry and expediente; license and rating control (RAV 60); medical-certificate administration (RAV 67, administrative data only); status validation and automatic blocking at issue/renewal; expiry alerts and dashboard; reports and audit trail viewer; user and role administration; configurable system parameters; credential output (print/export); backups status.

**Out of scope:** clinical medical evaluation; other INAC areas (finance, materiel, HR hiring, training not tied to licensing).

**Hard constraints:**

- Medical certificates store only RAV 67 class (1/2/3), issue date, expiry date, and general operational restrictions. Never a diagnosis, clinical history, or free-text clinical field.
- No credential exists without a titular person (referential integrity).
- Every create/update/delete writes an audit entry (actor, action, entity, timestamp).
- Validity periods and the near-expiry threshold are configurable parameters, never hardcoded, and never invented.
- Access is restricted per role: Administrador, Supervisor, Consulta.
- Free/open-source software and open standards (Ley de Infogobierno, Art. 34).
- Query latency under 3 s; availability over 99% on the local network.

**Stack:** React + Vite + TypeScript frontend (planned as `apps/web` in a monorepo with a NestJS API, Drizzle ORM, and PostgreSQL). Frontend follows feature-first folders, atomic design, and the container-presentational split. JWT auth carrying a role claim.

**Terminology:** domain terms stay in Spanish (Licencia, Habilitación, Certificado Médico, Expediente, Personal Aeronáutico, Cédula, Taquilla Técnica, Vigente/Activa, Próxima a vencer, Vencida, Bloqueada).

**UI copy language:** Spanish (es-VE), pending INAC confirmation.

**Credential states:** Activa, Próxima a vencer, Vencida, Bloqueada/Suspendida.

**Open decisions (do not resolve by assumption):**

- OD-05 near-expiry threshold (days), from INAC.
- OD-06 validity periods per license category, rating, and medical class, from RAV text or INAC.
- OD-07 canonical blocked-state name: "Bloqueada" (recommended) vs "Suspendida". Keep it behind a single token.
- OD-08 which role lifts a block (proposed: Administrador + Supervisor).
- OD-09 credential output format (proposed: PDF first, QR later).
- OD-10 report catalog (v1: near-expiry/expired listing and real-time consolidated status).
- OD-12 password and account policy, from INAC.
- OD-14 permission matrix, proposed in `../../docs/sryg-definitions-and-tasks.md` §4, pending INAC.
- Whether backups status ships in the UI or only as an ops runbook.

## Brand Commitments

- **Name:** SRYG.
- **Mark:** a white ring pierced by a star/compass-needle shape on black (`../../docs/4cb0a814-0c95-4639-94c0-bfe204db3bb8.jpg`). Binding. Monochrome and high-contrast by nature.
- **Character:** institutional, precise, trustworthy. Credibility before friendliness.
- **Proposed, not binding:** dark-first monochrome base (near-black / near-white, with a light variant) and exactly one accent reserved for status semantics only, never decoration. INAC branding guidelines, if they exist, override this.

## Evidence on Hand

- Engineering thesis and its distilled definitions (`../../docs/`).
- The SRYG mark (`../../docs/4cb0a814-0c95-4639-94c0-bfe204db3bb8.jpg`).
- No real personnel data, license numbers, testimonials, or INAC branding guidelines are on hand. Never fabricate names, cédulas, license or certificate numbers, validity periods, thresholds, or regulation article numbers. Placeholder data must read as obviously synthetic.

## Product Principles

1. **Status is the product.** Every screen answers "is this person cleared to operate?" first, and the answer is never ambiguous.
2. **A block is a state, not an error.** When issuance is prevented, name the specific impediment and what resolves it.
3. **Never store or invent what the regulation does not allow.** No clinical data, no hardcoded or guessed regulatory numbers.
4. **Every action leaves a trace.** Changes show who and when, and link to the audit trail.
5. **Built for the real posture of each user.** Dense and fast at the desk; large, glanceable, and touch-safe on the ramp.

## Accessibility & Inclusion

- WCAG 2.2 AA across both dark and light variants.
- Status is never conveyed by color alone: every status indicator pairs color with an icon and a text label.
- Full keyboard operability, visible focus, skip-to-content on every template.
- Form labels programmatically associated; validation errors announced via `aria-live`.
- Touch targets at least 44×44 px, required for the ramp inspectors' tablet and phone use.
