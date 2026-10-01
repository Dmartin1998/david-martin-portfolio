// Captura visual reproducible del sitio para comparar antes/despues de un cambio.
//
//   node scripts/snapshot.cjs <etiqueta> [url]
//
// Guarda PNG de pagina completa en qa/snapshots/<etiqueta>/ a 1440, 390 y 320 px.
// Desactiva animaciones y espera a las fuentes, de modo que dos corridas sobre
// el mismo HTML produzcan imagenes identicas byte a byte. Eso permite demostrar
// que un refactor no cambio el render.

const fs = require('node:fs');
const path = require('node:path');

// Playwright no es dependencia del proyecto: se resuelve desde donde este.
// (Antes estaba cableado a una ruta interna del runtime de Codex.)
const CANDIDATOS = [
  'playwright',
  path.join(process.env.LOCALAPPDATA || '', 'ms-playwright-node', 'playwright'),
  'C:/Users/David/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
];

function cargarPlaywright() {
  const fallos = [];
  for (const candidato of CANDIDATOS) {
    try {
      return require(candidato);
    } catch (error) {
      fallos.push(`  ${candidato}\n    ${error.code || error.message}`);
    }
  }
  throw new Error(
    'No se encontro Playwright. Rutas probadas:\n' + fallos.join('\n') +
    '\nInstalalo con: npm i -D playwright && npx playwright install chromium'
  );
}

// La version de Playwright disponible puede pedir un build de Chromium que no
// esta descargado. Si encontramos uno instalado, lo usamos directamente en vez
// de fallar pidiendo "npx playwright install".
function chromiumInstalado() {
  const raiz = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(raiz)) return undefined;
  const builds = fs.readdirSync(raiz)
    .filter(nombre => /^chromium-\d+$/.test(nombre))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const build of builds) {
    const ejecutable = path.join(raiz, build, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(ejecutable)) return ejecutable;
  }
  return undefined;
}

const VIEWPORTS = [
  { nombre: '1440', width: 1440, height: 900 },
  { nombre: '390', width: 390, height: 844 },
  { nombre: '320', width: 320, height: 800 },
];

async function main() {
  const etiqueta = process.argv[2];
  const url = process.argv[3] || 'http://127.0.0.1:4317';
  if (!etiqueta || !/^[\w.-]+$/.test(etiqueta)) {
    throw new Error('Uso: node scripts/snapshot.cjs <etiqueta> [url]');
  }

  const { chromium } = cargarPlaywright();
  const destino = path.resolve(__dirname, '..', 'qa', 'snapshots', etiqueta);
  fs.rmSync(destino, { recursive: true, force: true });
  fs.mkdirSync(destino, { recursive: true });

  const ejecutable = chromiumInstalado();
  if (ejecutable) console.log('Chromium:', ejecutable);
  const navegador = await chromium.launch(ejecutable ? { executablePath: ejecutable } : {});
  const errores = [];

  for (const viewport of VIEWPORTS) {
    const contexto = await navegador.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    const pagina = await contexto.newPage();

    pagina.on('console', mensaje => {
      if (mensaje.type() === 'error') errores.push(`[${viewport.nombre}] consola: ${mensaje.text()}`);
    });
    pagina.on('pageerror', error => errores.push(`[${viewport.nombre}] pagina: ${error.message}`));

    await pagina.goto(url, { waitUntil: 'networkidle' });
    await pagina.addStyleTag({
      content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}',
    });
    await pagina.evaluate(() => document.fonts.ready);
    await pagina.evaluate(() => window.scrollTo(0, 0));

    const desborde = await pagina.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    if (desborde > 0) errores.push(`[${viewport.nombre}] desborde horizontal de ${desborde}px`);

    await pagina.screenshot({ path: path.join(destino, `${viewport.nombre}.png`), fullPage: true });
    await contexto.close();
  }

  await navegador.close();

  fs.writeFileSync(
    path.join(destino, 'errores.json'),
    JSON.stringify({ url, etiqueta, errores, fecha: new Date().toISOString() }, null, 2)
  );

  console.log(`Capturas en qa/snapshots/${etiqueta}/`);
  if (errores.length) {
    console.log('Incidencias:');
    for (const error of errores) console.log('  ' + error);
    process.exitCode = 1;
  } else {
    console.log('Sin errores de consola ni desborde horizontal.');
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
