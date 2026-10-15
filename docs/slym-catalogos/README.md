# Catálogos de SLYM transcritos

Transcripción de cinco grabaciones de pantalla de SLYM (14/10/2026, sin audio) usada para el seed de
desarrollo (`apps/api/src/cli/seed/catalog-data.ts`). Los archivos `.tsv` guardan los valores **tal cual**
aparecen en SLYM, con su número de página, para poder auditar la limpieza.

| Video | Pantalla de SLYM | Archivo | Filas en SLYM | Filas en el seed |
| --- | --- | --- | --- | --- |
| 1 | Aeronaves (Aeronave + Tipo: MONOMOTOR / MULTIMOTOR) | `aeronaves.tsv` | 125 | 97 |
| 2 | Habilitación de Clase (+ Traducción) | `habilitaciones_clase.tsv` | 81 | 33 |
| 2 | Tipo de Licencias (+ Traducción, Aplica Vencimiento) | `tipos_licencia.tsv` | 42 | 42 |
| 3 | Habilitación de Tipo | `habilitaciones_tipo.tsv` | 336 | 281 |
| 4 | Observaciones (+ Tipo de Observación) | `observaciones.tsv` | 239 | 203 |
| 5 | Solicitante de Credenciales, Modificar foto/firma, Licencias, historial de accesos | — | — | — |

El video 5 no muestra catálogos sino el expediente de una persona real; no se transcribió (D25: el
seed solo usa personas ficticias). Sí confirma los campos del solicitante: nombres, apellidos, número
de identidad, tipo de documento, nacionalidad, fecha de nacimiento, correo, dirección y grupo
sanguíneo.

## Limpieza aplicada en el seed

- **Aeronaves**: se separaron las combinaciones (`C500/C550`, `PA31/PA34`, `BE10/BE20`), se pasó todo a
  mayúsculas y se eliminaron duplicados (`BE18`/`be18`, `GA-7`/`GA7`, `C402` ×2…). Se quitaron
  matrículas (`YV2619`, `yv2860`, `YV199E`), valores que no son aeronaves (`Fumigación`,
  `JT16L404QC`) y `6F-30` (error de tipeo de `GF-30`). El tipo monomotor/multimotor no se guarda
  porque el catálogo no tiene esa columna, y en SLYM es inconsistente (`M18` aparece con ambos tipos y
  `AC90` como monomotor).
- **Habilitaciones de tipo**: mayúsculas, espacios uniformes alrededor de `/` y sin duplicados
  (`A-109`/`A109`, `H-500`/`H500`, `F900EX EASY`/`F900EX Easy`…). Se quitaron filas vacías o basura
  (`-/-`, `..`, `Con`, `G`, `ffs`, `9.843.233`), observaciones cargadas en este catálogo por error
  (`Convalidación de…`) y `GLOBO AEROSTATICO LIBRE`, que es una habilitación de clase. Las
  combinaciones (`B732 / B734`) y los simuladores (`FFS (E190)`, `BATD`, `FSTD-B738`) se conservan
  porque SLYM las registra como una sola habilitación.
- **Habilitaciones de clase**: quedan las 33 clases reales. Se quitaron filas vacías, duplicados
  bilingües (`Aviónica I / Avionics I`), modelos de aeronave cargados aquí (`BE20`, `G164B`, `MI8`,
  `RV-10`, `PAY2`…) y observaciones (`Nivel 5 Competencia Lingüística`, `Válida solo para
  Entrenamiento`, `NO APLICA`). Se corrigieron dos erratas: `Der Mensajes` → `De Mensajes` y
  `heigher` → `higher`. El seed las agrupa (piloto, RPA, técnico, controlador, estación) para
  asignarlas con sentido; SLYM las tiene en una sola lista.
- **Tipos de licencia**: nombres, traducción y "Aplica Vencimiento" sin cambios. SLYM no guarda
  categoría RAV 60 ni clase médica por tipo; el seed las **asume** (ver comentario en
  `catalog-data.ts`) y hay que validarlas con INAC. Los casos menos obvios: despachador y operador
  de estación quedan en `controlador_transito_aereo` sin clase médica; mecánico abordo en
  `tecnico_mantenimiento` con clase 2; pilotos, instructores y examinadores RPA/UA con clase 3.
  `Instructor De Vuelo` (en inglés "Simulated Instrument Flight") parece truncado en SLYM y se dejó
  tal cual.
- **Observaciones**: se juntaron los dos tipos de SLYM (`OBSERVACIONES LICENCIAS` y `OBSERVACIÓN
  LICENCIAS - SECCIÓN HABILITACIÓN`) en el catálogo de observaciones de licencia, que no distingue
  sección. Se eliminaron duplicados que solo difieren en mayúsculas, tildes, comas o "por/de la"
  (`HELICOPTEROS DELCARIBE` y `DEL CARIBE` se mantienen porque así están). Se descartaron `con`,
  `h500`, una fila vacía, 4 filas cortadas en el video y 2 que no se alcanzan a ver (marcadas en el
  `.tsv`). La traducción al inglés, obligatoria en el catálogo, es nuestra salvo cuando SLYM ya la
  trae en el texto.
