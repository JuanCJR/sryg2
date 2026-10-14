---
version: 1
slug: "src-features-personnel-pages-listadopage-tsx"
primary_target: "apps/web/src/features/personnel/pages/ListadoPage.tsx"
related_targets: ["apps/web/src/app/templates/ListPageTemplate.tsx"]
---

# Surface brief: Listado de personal and ListPageTemplate

## Scope and mode

Operate. Page 3 (Listado de personal) is the reference page for ListPageTemplate; Bloqueos (8), Reportes (9), Auditoría (10) and Usuarios (11) extend it without a new direction round. Desktop 1440, tablet 820, phone 390. Synthetic data only, labelled as such.

## Audience, job, proof

All three roles. Lookup and status triage weigh equally: a ramp inspector types a name or cédula and opens the expediente in seconds; desk staff and supervisors sweep by status to find who is blocked, expired or near expiry. The registry holds thousands of people, so nobody browses it whole; query and status filters are the only ways in. The proof is the annunciator: the page states how many people sit in each credential state before anyone searches.

## Constraints

es-VE copy. WCAG 2.2 AA in both modes. Status never by color alone. 44px touch targets on tablet and phone. Hue only on status lamps. Consulta sees no create action. OD-05 threshold is a parameter; show days remaining, never assume the cutoff. OD-07 blocked-state name behind one token.

## Memorable moment

Pressing a lamp on the annunciator turns the console into that state's queue, most urgent first.

## Unresolved

OD-05, OD-07, OD-14 role mapping. Real registry size from INAC.

## Direction contract

THESIS: The list is an ECAM lookup console with an annunciator panel, not a table page with a filter sidebar. It refuses the admin-list default: faceted rail, full unfiltered grid on arrival, colored pills.

OWN-WORLD: Same world as the Expediente: one eleven-step neutral ramp, hue only in status lamps (red Vencida, red plus hatch and lock Bloqueada, amber Próxima a vencer, unlit outline with check Activa). B612 text, B612 Mono for cédula and figure columns, caps with tracking for labels and keys, 1px hairlines, corners 0 to 2px, no shadows.

STORY: The visitor reads the annunciator totals, then either types a name or cédula or presses a lamp; results replace the lower console; they open a person's expediente, or create a new record if their role allows.

FIRST VIEWPORT: Desktop 1440 inside the shell: breadcrumb; page title with the primary action "Nuevo personal" right-aligned (inverted, Administrador and Supervisor only). A full-width query field about 56px tall, focus with "/", placeholder naming nombre or cédula. Below it the annunciator: four equal square-cornered lamp keys, BLOQUEADA, VENCIDA, PRÓXIMA A VENCER, ACTIVA (the same state words the rows use), each with its lamp, label and a large tabular total; a selected key takes the inverted fill. Below that, the results region: an idle hint before any query, then a dense table (lamp, cédula, nombre, categoría, credencial más crítica, días restantes flush right) with pagination. Tablet: annunciator becomes a 2x2 grid; the table drops categoría and credencial más crítica but keeps días restantes, because it is the triage figure the lamp queue sorts on. Phone: query field and annunciator stack, rows become stacked phone rows.

FORM: Lookup console with annunciator panel, candidate 5 of 7 on the ordered list, seed key 2499bd40. Signature interaction: pressing a lamp key filters to that state and sorts rows by days remaining, most urgent first; pressing it again clears the filter. Raise: rows ordered by days remaining like a departure board (boarding pass and gate board).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
