---
version: 1
slug: "src-features-auth-pages-loginpage-tsx"
primary_target: "apps/web/src/features/auth/pages/LoginPage.tsx"
related_targets: ["apps/web/src/app/templates/AuthTemplate.tsx", "apps/web/src/features/auth/components/AtcScope.tsx"]
---

# Surface brief: Ingreso and AuthTemplate

## Scope and mode

Operate. The login (Ingreso, `/ingreso`) is the reference screen for AuthTemplate; any later signed-out screen (recovery, first-run) extends it without a new direction round. Desktop 1440, phone 390; tablet follows the phone composition at 1024px and below.

## Audience, job, proof

All three roles, at the start of a shift: desk staff and supervisors on desktop, ramp inspectors on a phone or tablet. The job is to get in fast and know exactly why a try failed. The proof is the notice slot: one reserved-height line states idle, verifying, rejected, throttled or unreachable, so the form never reflows and never leaves the user guessing.

## Constraints

es-VE copy. WCAG 2.2 AA in both modes. Status never by color alone (2px border, icon and text for field errors). Invalid credentials read identically for a wrong password and an unknown email. No "forgot password" link. Motion is CSS and SVG only (transform, opacity, stroke-dashoffset, offset-path); `prefers-reduced-motion` renders the final composition still. The form is usable from the first frame.

## Memorable moment

The ATC radar entrance: rings and bearings draw in, a phosphor sweep makes two turns picking up three blips, and a plane flies a dotted track into the MARACAY marker (about 3.1s, once).

## Unresolved

Account recovery path (OD pending): the page deliberately offers none. Token lifetime handling (expiresIn) is not yet surfaced to the user.

## Direction contract

THESIS: The login is a controlled-airspace entrance, not a centered card on a gradient. It refuses the auth-page default: logo over a floating form card, stock illustration, social sign-in rows.

OWN-WORLD: Same world as the shell: one neutral ramp, hue only in status lamps (red for rejected credentials, amber for throttled and unreachable, unlit outline for idle and verifying). B612 text, B612 Mono for bearings and the countdown, caps with tracking for labels, 1px hairlines, corners 0 to 2px, no shadows. The brand panel is always night-toned; only the form column follows day or night.

STORY: The visitor sees the product mark and a radar resolving over INAC Maracay, reads one line of what the system holds, and signs in on the right. Failure stays in one inline slot.

FIRST VIEWPORT: Desktop 1440, "Puerta de acceso dividida": left panel about 55% (mark, radar, headline "Un expediente electrónico por persona.", support copy, three dash-ticked coverage lines); right column with a day/night toggle strip and a 400px form: title "Ingresar", notice slot, Correo, Contraseña with a "Mostrar" toggle, primary "Ingresar". Phone: the panel collapses to the mark header, the animation does not run, the form leads.

FORM: Split door, option C v3-a (approved mockup). Submitting shows a row of small monochrome airplanes marching left to right with edge fade, the label "VERIFICANDO…", fields disabled and the button "Ingresando…".

FINISH: Verified with Playwright screenshots at 1440 and 390 (idle, mid-entrance, submitting) against the mockup; `impeccable detect` clean on the new files.
