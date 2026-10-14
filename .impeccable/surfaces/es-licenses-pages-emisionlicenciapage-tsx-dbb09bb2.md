---
version: 1
slug: "es-licenses-pages-emisionlicenciapage-tsx-dbb09bb2"
primary_target: "apps/web/src/features/licenses/pages/EmisionLicenciaPage.tsx"
related_targets: ["apps/web/src/app/templates/FormPageTemplate.tsx"]
---

# Surface brief: Emisión / renovación de licencia and FormPageTemplate

## Scope and mode

Operate. Page 6 (Emisión / renovación de licencia y habilitación) is the reference page for FormPageTemplate; Registro de personal (5), Certificado médico (7), Parámetros (12) and Perfil (14) extend it without a new direction round. Desktop 1440, tablet 820, phone 390. Synthetic data only, labelled as such.

## Audience, job, proof

Administrador and Supervisor, desk-based, repetitive issuance work, keyboard-heavy. One trámite issues or renews a license together with the ratings (habilitaciones) that depend on it. The proof is the automatic block check: it runs when the page opens, and an open block means the page names the impediment and offers no form at all.

## Constraints

es-VE copy. WCAG 2.2 AA in both modes. Labels programmatically associated; validation errors announced via aria-live. Status never by color alone. 44px touch targets on tablet and phone. Hue only on status lamps. Validity periods (OD-06) are configurable parameters: never hardcode or invent a validity length; any demo value is labelled synthetic. OD-07 blocked-state name behind one token. Consulta never reaches the page.

## Memorable moment

The summary rail states exactly what one click on Emitir will issue, credential by credential, before the operator commits.

## Unresolved

OD-06 validity periods, OD-07 name, OD-08 who resolves a block, OD-14 role mapping.

## Direction contract

THESIS: The trámite is one sectioned form with a fixed summary rail that states what will be issued. It refuses the multi-step wizard and the modal form; a block is a page state on arrival, never an error at submit.

OWN-WORLD: Same world as the Expediente and the Listado: one eleven-step neutral ramp, hue only in status lamps, B612 text, B612 Mono for figure columns, B612 with tabular-nums for inline IDs and dates, caps with tracking for section labels, 1px hairline section rules, corners 0 to 2px, no shadows.

STORY: The operator arrives from the Expediente; if a block is open, the page names it and what resolves it, and ends there. Otherwise they confirm the license section, include the ratings to renew, read the summary rail, and press Emitir; success returns them to the Expediente with the new credentials lit.

FIRST VIEWPORT: Desktop 1440 inside the shell: breadcrumb (Personal / person / Emisión); title "Emitir o renovar licencia"; a compact identity strip (cédula, nombre, overall lamp). Left 8 columns: stacked FormSections separated by hairlines, LICENCIA first (categoría, current state lamp, fechas), then HABILITACIONES as rows each with its lamp and an include control. Right 4 columns: a sticky summary rail titled "Se emitirá" listing each credential to issue with its new expiry, a count line, and the single inverted primary action Emitir; Cancelar as secondary below. Blocked: the warning-stack row naming the impediment spans the width, sections and rail are absent, the only action returns to the Expediente. Tablet: the rail moves below the sections as a sticky bottom bar with the count and Emitir. Phone: sections stack, the bottom bar keeps the count and Emitir.

FORM: Sectioned form with fixed summary rail, candidate 4 of 7 on the ordered list, seed key 0293047f. Signature interaction: including or excluding a rating updates the summary rail list and count in place, and the Emitir label states the count ("Emitir licencia + 2 habilitaciones").

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
