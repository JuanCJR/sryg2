# Flujo de sistema de diseño con Impeccable

Usa la skill `impeccable` durante todo el ciclo de vida del sistema de diseño en `sryg-frontend`: crearlo desde el brief, evaluarlo, reemplazar su dirección y refinar componentes individuales. Impeccable decide el mundo visual; Chakra UI v3 lo implementa. Mantén esa separación: las decisiones de diseño viven en `PRODUCT.md` y `DESIGN.md`, y la implementación vive en el tema de Chakra.

| Quiero… | Ir a |
|---|---|
| Construir el sistema de diseño desde el brief | [1. Crear](#1-crear-el-sistema-de-diseño-desde-el-brief) |
| Agregar una página o vista nueva | [2. Crear una página](#2-crear-una-página-nueva) |
| Encontrar y corregir lo que está mal | [3. Evaluar y mejorar](#3-evaluar-y-mejorar-un-sistema-existente) |
| Descartar la dirección y elegir otra | [4. Cambiar de dirección](#4-cambiar-la-dirección-visual) |
| Cambiar un solo componente | [5. Refinar un componente](#5-refinar-un-componente) |

Ejecuta todos los comandos desde `sryg-frontend/`.

## 1. Crear el sistema de diseño desde el brief

Entrada: [`design-brief-runbook.md`](design-brief-runbook.md) y [`sryg-definitions-and-tasks.md`](sryg-definitions-and-tasks.md).

1. Instala Chakra UI v3 y sus snippets de provider:
   ```bash
   npm i @chakra-ui/react @emotion/react
   npx @chakra-ui/cli snippet add
   ```
2. Captura el contexto del producto. Pasa ambos documentos; esto genera `PRODUCT.md`.
   ```
   /impeccable init
   ```
3. Elige la dirección visual. Usa la §11 del brief como prompt; esto genera `DESIGN.md`.
   ```
   /impeccable shape
   ```
4. Traduce `DESIGN.md` a `src/theme/` con `createSystem(defaultConfig, defineConfig({...}))`:
   - `tokens`: valores base (escala monocromática, tipografía, espaciado, radios).
   - `semanticTokens`: `bg`, `fg`, `border` con valores `_dark`, más `status.*` para los cuatro estados de credencial.
   - `recipes` / `slotRecipes`: `Button`, `StatusBadge`, `AlertBanner`, `DataTable` (filas densas).
   - Sobrescribe la paleta por defecto de Chakra. Cualquier valor por defecto que quede disponible terminará usándose.
5. Genera los tipos:
   ```bash
   npx @chakra-ui/cli typegen src/theme/index.ts
   ```
6. Construye los componentes por nivel atómico (§8 del brief) y luego verifica:
   ```
   /impeccable audit src/
   ```

**Decide antes del paso 4:** la §2 del brief pide exactamente un acento para estados, pero la §7 define cuatro estados. Con un solo tono, el color solo indica "esto es un estado" y la diferencia la llevan el ícono y la etiqueta. La alternativa es un tono por nivel de gravedad. Esta decisión cambia todos los tokens `status.*`.

No uses `/impeccable document` aquí: genera `DESIGN.md` a partir de código existente, y todavía no lo hay.

## 2. Crear una página nueva

Requisito: `PRODUCT.md` y `DESIGN.md` ya existen (sección 1). La página hereda el sistema visual; no crea uno propio ni modifica `DESIGN.md`.

No hay un comando dedicado (`craft` está obsoleto). Describe la página y su tarea:

```
/impeccable crear la página <vista de la §6 del brief>: <qué hace el usuario en ella>
```

Antes de pedirla, decide qué template usa. En SRYG cada página es una instancia de uno de los seis templates de la §8 (`ListPageTemplate`, `DetailPageTemplate`, `FormPageTemplate`, `DashboardTemplate`, `AuthTemplate`, `ErrorTemplate`), y eso cambia el camino:

| Caso | Qué hace Impeccable |
|---|---|
| Usa un template existente | La trata como una extensión: hereda composición y componentes, y solo resuelve contenido, jerarquía y estados. No propone estructuras |
| Necesita un template nuevo | Propone tres estructuras distintas en una página de decisión; eliges una (con steer o re-roll si ninguna sirve) |

En ambos casos:

1. Responde las 2–3 preguntas iniciales: tarea, información que se muestra, estados importantes, frecuencia de uso y restricciones. Nombra el template y la vista de la §6 para no repetir lo que el brief ya dice.
2. Impeccable registra la dirección de la página en su surface brief y luego la construye.
3. Cubre los estados que el brief exige (vacío, error, bloqueo, sin permisos) y verifica:
   ```
   /impeccable harden <ruta de la página>
   /impeccable audit <ruta de la página>
   ```

**Compón, no estilices.** La página debe armarse con los templates, organismos y recipes del tema. Si falta un componente, créalo en su nivel atómico con su recipe; no lo resuelvas con props de estilo dentro de la página.

## 3. Evaluar y mejorar un sistema existente

Primero diagnostica y después ejecuta solo lo que el diagnóstico indique. `audit` y `critique` devuelven los comandos de corrección ordenados de P0 a P2.

1. Establece una línea base. Omite este paso si `DESIGN.md` ya existe y coincide con el código.
   ```
   /impeccable document
   ```
2. Diagnostica:
   ```
   /impeccable audit src/       # accesibilidad, rendimiento, responsive
   /impeccable critique src/    # heurísticas de UX y si la UI es propia de SRYG
   ```
3. Ejecuta los comandos recomendados en orden de prioridad. Ver [Referencia de comandos](#referencia-de-comandos).
4. Termina con `/impeccable polish` y vuelve a ejecutar `/impeccable audit` para confirmar que el puntaje subió.

Impeccable evalúa la interfaz renderizada, no el archivo del tema. Para evaluar el tema necesitas al menos algunos componentes o pantallas que lo usen.

En SRYG, evita `colorize` y `bolder` salvo que `critique` indique que la UI quedó demasiado plana. Ambos empujan en contra de la dirección del brief: monocromo con un solo acento.

## 4. Cambiar la dirección visual

No existe un comando `redesign`. La forma de cambiar depende de si la dirección ya está comprometida.

**Todavía eligiendo** (las tarjetas de dirección siguen abiertas):

| Acción | Efecto |
|---|---|
| Re-roll `plain` | Nuevo juego de direcciones, mismo rango. Las ya mostradas no vuelven |
| Re-roll `safer` / `bolder` | Juego más convencional / más arriesgado |
| Steer | Una línea que guía el siguiente juego, p. ej. "institucional, como documentación técnica aeronáutica" |
| Canon | El estándar de la categoría, bien ejecutado. Pide 2–3 productos de referencia como vara de calidad |

**Ya comprometida** en `DESIGN.md`:

```
/impeccable shape rediseñar el sistema visual: <qué no te gusta y por qué>
```

Esto conserva `PRODUCT.md` (usuarios, contenido, restricciones) y reemplaza `DESIGN.md`. El aspecto anterior pasa a ser referencia de lo que hay que evitar.

- Di qué no te gusta ("muy frío", "parece un dashboard cripto"). Sin eso, la siguiente dirección puede caer en el mismo lugar.
- No uses `bolder` ni `quieter` para cambiar de dirección. Ajustan el mundo actual en lugar de reemplazarlo.

## 5. Refinar un componente

Pasa la ruta del componente como target. Impeccable lo trata como un refinamiento: conserva la identidad del sistema y solo modifica ese componente.

| Situación | Comando |
|---|---|
| Sabes qué cambiar | Comando del aspecto + ruta, p. ej. `/impeccable typeset src/components/atoms/StatusBadge.tsx`, o descríbelo: `/impeccable ajustar StatusBadge: el ícono compite con la etiqueta` |
| Quieres opciones para comparar | `/impeccable generate 3 variants StatusBadge` |
| Quieres seleccionar el elemento en el navegador e iterar | `/impeccable live` |
| No sabes qué está mal | `/impeccable critique <ruta>` y sigue su recomendación |

**Mantén la apariencia base en el tema.** Si el cambio afecta color, radio o densidad, pide que se haga en el recipe o slot recipe del componente, no como props en el JSX. De lo contrario, el componente se aparta del sistema y el siguiente `audit` o `extract` lo marca.

## Referencia de comandos

Todos los comandos aceptan una ruta `[target]` opcional.

| Comando | Úsalo para |
|---|---|
| `init` | Generar `PRODUCT.md` (contexto del producto) |
| `shape` | Elegir o reemplazar la dirección visual; genera `DESIGN.md` |
| `document` | Generar `DESIGN.md` a partir del código existente |
| `extract` | Mover tokens y componentes repetidos al sistema |
| `audit` | Revisar accesibilidad, rendimiento y responsive |
| `critique` | Puntuar la UX y qué tan propio del producto es el diseño |
| `doctor` | Detectar desfases entre `PRODUCT.md`, `DESIGN.md` y el código |
| `harden` | Cubrir estados de error, vacío y bloqueo, casos límite, i18n |
| `adapt` | Ajustar el layout a otros dispositivos (tablet para inspectores de rampa) |
| `clarify` | Mejorar textos de la UI, etiquetas y mensajes de error |
| `typeset` / `layout` | Corregir jerarquía tipográfica / espaciado y densidad |
| `quieter` / `bolder` / `distill` | Atenuar / intensificar / simplificar la dirección actual |
| `colorize` | Añadir color a una UI monocromática |
| `polish` | Pasada final antes de publicar |
| `live` / `generate` | Iterar elementos visualmente en el navegador |
