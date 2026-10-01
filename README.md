# Portfolio de David Martín

Sitio independiente, en español, de marketing, proyectos con Odoo, once webs de Pax Media y docencia de desarrollo web con IA. No modifica otros sitios del Administrador de Webs.

## Uso local

Requiere Node.js 24. No usa dependencias de aplicación ni necesita instalar paquetes.

```text
npm run dev
npm run check
npm run build
```

El servidor local se abre en http://127.0.0.1:4317. La compilación copia únicamente `public/` a `dist/`.

## Edición

- `public/index.html`: estructura, textos principales, imágenes y contacto.
- `public/design.css`: diseño base y adaptación a pantallas pequeñas.
- `public/revision.css`: portada, habilidades visibles, casos resumidos y animaciones.
- `public/app.js`: seis casos, filtros, diálogos, galería y compartir.
- `public/revision.js`: panel de habilidades, flujo ilustrativo y controles de movimiento.
- `public/assets/`: imágenes originales de clase, vistas WebP y favicon propio.
- `vercel.json`: despliegue estático y cabeceras de seguridad.

No hay formularios que almacenen información, seguimiento de visitas ni acceso a Odoo. El contacto usa correo y LinkedIn autorizados.

## Confidencialidad

No copiar `.vercel-auth/`, `.vercel/`, archivos de investigación ni fuentes originales internas al sitio o a una entrega pública. Las credenciales aisladas se excluyen mediante `.gitignore` y `.vercelignore`; además, el build solo publica `public/`.

## Evidencias

Los diagramas son explicativos. Las tres imágenes ampliables son material docente original; no son pantallas del ERP. Los casos incluyen resultado documentado, atribución colaborativa y límites de evidencia. El registro de fuentes y correcciones editoriales se conserva en `SOURCES.md` (interno, no desplegado).

## Revisión de claridad

La portada explica el diseño, desarrollo y gestión de CRM y ERP sobre Odoo. Las cuatro habilidades y sus descripciones están visibles desde el inicio; la interacción amplía ejemplos. Se muestran tres casos principales y tres adicionales desplegables. Los detalles técnicos y de evidencia quedan dentro de cada caso.

El movimiento incluye un flujo ilustrativo de la operación, transiciones al seleccionar habilidades y entradas al recorrer el sitio. Puede pausarse y respeta la preferencia de movimiento reducido. La fotografía personal y la aclaración del término «composición» están pendientes de David; no se añadió un retrato ficticio.

## Publicación

URL: https://david-martin-portfolio.vercel.app
Proyecto Vercel: `david-martin-portfolio`, espacio personal de David.

## Flujo de trabajo

El fuente venía minificado en origen (una línea de 12.483 caracteres en
`index.html`). Desde octubre de 2026 está formateado y versionado con Git.

```text
npm run dev            servidor local en http://127.0.0.1:4317
npm run format         formatea public/index.html, design.css y revision.css
npm run verify         format:check + check.mjs (lo que debe pasar antes de publicar)
npm run snapshot <tag> captura la página completa a 1440, 390 y 320 px
npm run build          copia public/ a dist/
```

### Antes de publicar un cambio

1. `npm run snapshot antes` con el sitio sin tocar.
2. Hacer el cambio.
3. `npm run verify`.
4. `npm run snapshot despues` y comparar los PNG de `qa/snapshots/`.
   Si el cambio no debía alterar el render, los archivos tienen que ser
   idénticos byte a byte. Así se demostró que des-minificar no cambió nada.
5. `git commit` describiendo qué se verificó.

`scripts/snapshot.cjs` desactiva animaciones y espera a las fuentes, de modo
que dos corridas sobre el mismo HTML dan imágenes idénticas. Resuelve
Playwright probando varias rutas y usa el Chromium que esté descargado.

### Qué no formatear

`app.js` y `revision.js` no se formatean: no estaban minificados, y `app.js`
arma HTML con template literals donde los espacios en blanco sí son
significativos. `scripts/format.mjs` sólo toca HTML y CSS.

Al partir líneas de HTML hay que respetar la semántica del espacio en blanco:
entre elementos en línea el espacio se pinta. El formateador sólo parte
alrededor de elementos de bloque, salvo en los contenedores flex/grid
listados en `CONTENEDORES_SIN_ESPACIO`. Antes de sumar una clase a esa lista,
confirmar su `display` en el CSS y comparar capturas.

## Historial

El repositorio es local, sin remoto. `git log` tiene el detalle de cada
cambio y qué se verificó en cada uno. Para volver al sitio tal como estaba
publicado el 29/09/2026: `git checkout a8713d6`.
