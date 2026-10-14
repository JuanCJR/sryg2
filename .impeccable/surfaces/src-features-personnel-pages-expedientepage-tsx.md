---
version: 1
slug: "src-features-personnel-pages-expedientepage-tsx"
primary_target: "apps/web/src/features/personnel/pages/ExpedientePage.tsx"
related_targets: ["apps/web/src/catalog/CatalogPage.tsx"]
---

# Surface brief: Expediente (personnel detail) and the SRYG design system

## Scope and mode

Operate. The design system (DS-01..DS-06: tokens for day and night, atoms, molecules, role-gated app shell, StatusBadge, dev-only catalog) proven on the Expediente at desktop (1440), tablet (820), and phone (390). Synthetic data only, labelled as such.

## Audience, job, proof

Desk staff (dense, keyboard), supervisors (oversight), ramp inspectors (tablet or phone in full sun, read-only). The job: know within one glance whether this person's credentials are in order and why not. The proof is the block check: an open block is named, pinned above every tab, and visibly stops the specific credentials it affects.

## Constraints

es-VE copy. WCAG 2.2 AA in both modes. Status never by color alone (lamp + icon + label). 44px touch targets on tablet and phone. Hue only on status. No clinical data in the medical tab. OD-07 blocked-state name behind one token. OD-05 threshold is a parameter; show days remaining, never assume the cutoff.

## Memorable moment

Selecting a warning in the stack jumps to the page it concerns and draws the link to every credential it stops.

## Unresolved

OD-07 name, OD-05 threshold, OD-08 who resolves a block, role mapping (OD-14). Real INAC data and branding guidelines.

## Direction contract

THESIS: The expediente is an ECAM system page. An open problem is a warning message that never leaves the top of the screen, sorted by priority, and each credential is a condition line. It refuses the category default: sidebar, KPI cards, a tabbed card layout with colored pills.

OWN-WORLD: One strict eleven-step cool-neutral ramp (n-0 to n-10) supplies every tone in day and night. Hue exists only in status lamps: red for not in order (Vencida; Bloqueada adds a diagonal hatch and a lock), amber for attention (Próxima a vencer); Activa is an unlit outlined lamp with a check. B612 for text, B612 Mono for figures and IDs, caps with light tracking for labels and page keys. Hairline 1px vector rules, square corners (radius 0 to 2px), no shadows except dialogs, no glow, no gradients.

STORY: The visitor reads the warning stack first, understands what is wrong and what it stops, selects a warning to see the affected credentials, and acts (issue, register or resolve a block) only if their role allows.

FIRST VIEWPORT: Desktop 1440: 36px top strip (mark, SRYG · INAC MARACAY, DATOS DE DEMOSTRACIÓN tag, local and UTC clock, DÍA/NOCHE key). 232px nav rail. Main: breadcrumb, then the sticky warning stack full width (up to four 44px message lines, lamp cell leading, count on the right). Identity block: 96px photo, cédula as the only headline in B612 Mono at about 40px, name beneath at 20px, category, overall state lamp, audit line; actions right-aligned with the primary inverted. Page key row (DATOS, LICENCIAS, HABILITACIONES, MÉDICO, BLOQUEOS, HISTORIAL), keys with a problem carry a mini lamp. The page opens on the key of the highest-priority warning (ECAM auto-display).

FORM: ECAM/EICAS crew alerting with EFB day/night modes, candidate 4 of 7 on the ordered list, seed key e177196d. Signature interaction: selecting a warning switches page key and sweeps a highlight across each linked credential row (exponential ease-out, reduced-motion safe). Raises: single neutral ramp plus hatch (Exposure Record), achromatic message text (Cloud Edge), linked propagation (Miura Sheet), days remaining flush right in tabular figures (J-Card), one identity headline (Catalog Sleeve).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
