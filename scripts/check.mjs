import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const base = join(root, 'public');
const html = await readFile(join(base, 'index.html'), 'utf8');
const js = await readFile(join(base, 'app.js'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length, new Set(ids).size, 'IDs duplicados');
for (const match of html.matchAll(/href="#([^"]+)"/g)) assert(ids.includes(match[1]), `Ancla inexistente: ${match[1]}`);
for (const match of html.matchAll(/(?:src|href|data-image)="(\/[^"?#]+)"/g)) {
  assert((await stat(join(base, match[1]))).isFile(), `Falta recurso: ${match[1]}`);
}
assert.equal([...html.matchAll(/data-case="/g)].length, 6, 'Se esperan seis casos');
assert.equal([...html.matchAll(/data-image="/g) ].length, 11, 'Se esperan once imágenes ampliables');
assert(html.includes('mailto:davidezmartin@gmail.com'), 'Contacto público autorizado');
assert(html.includes('https://www.linkedin.com/in/david-ezequiel-martin/'), 'LinkedIn verificado');
assert(!/C:\\Users|C:\/Users|\.vercel-auth|Bearer\s|sk-[A-Za-z0-9]{20,}|PLACEHOLDER|TODO:|FIXME:/.test(html + js), 'Contenido interno o provisional');
assert(js.includes('extensión neta el 18/09/2026'), 'Debe documentarse la retirada de proyección neta');
assert(js.includes('neto informado'), 'Debe distinguirse el neto informado de Mercado Pago');
const disallowed = /auth\.json|config\.json|\.env|\.md$|\.py$|\.zip$/i;
async function checkDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!disallowed.test(entry.name), `Archivo no público: ${entry.name}`);
    if (entry.isDirectory()) await checkDirectory(join(directory, entry.name));
  }
}
// La cinta: misma verificacion de recursos y anclas que la portada.
const cinta = await readFile(join(base, 'cinta', 'index.html'), 'utf8');
const cintaJs = await readFile(join(base, 'cinta', 'cinta.js'), 'utf8');
const cintaIds = [...cinta.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
assert.equal(cintaIds.length, new Set(cintaIds).size, 'IDs duplicados en /cinta');
for (const match of cinta.matchAll(/href="#([^"]+)"/g)) assert(cintaIds.includes(match[1]), `Ancla inexistente en /cinta: ${match[1]}`);
// cleanUrls sirve /ruta desde /ruta/index.html, asi que una ruta puede ser
// un archivo o un directorio con index.html dentro.
async function existeRuta(ruta) {
  for (const candidato of [ruta, join(ruta, 'index.html'), ruta + '.html']) {
    try {
      if ((await stat(join(base, candidato))).isFile()) return true;
    } catch {}
  }
  return false;
}
for (const match of cinta.matchAll(/(?:src|href)="(\/[^"?#]*)"/g)) {
  assert(await existeRuta(match[1]), `Falta recurso en /cinta: ${match[1]}`);
}
// La CSP del sitio es style-src 'self' y script-src 'self': nada en linea.
assert(!/\sstyle="/.test(cinta), 'Estilo en linea en /cinta: lo bloquea la CSP');
assert(!/<style[\s>]|<script(?![^>]*\ssrc=)/.test(cinta), 'CSS o JS en linea en /cinta: lo bloquea la CSP');
// font-src 'self': las fuentes se auto-alojan, nunca Google Fonts.
assert(!/fonts\.(googleapis|gstatic)\.com/.test(cinta + cintaJs), 'Fuente externa en /cinta: la bloquea la CSP');
for (const match of (await readFile(join(base, 'cinta', 'cinta.css'), 'utf8')).matchAll(/url\('([^']+)'\)/g)) {
  assert((await stat(join(base, match[1]))).isFile(), `Falta fuente: ${match[1]}`);
}

await checkDirectory(base);
console.log('OK: anclas, recursos, seis casos, once imágenes, contactos y límites editoriales.');
