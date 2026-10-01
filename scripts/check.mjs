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
await checkDirectory(base);
console.log('OK: anclas, recursos, seis casos, once imágenes, contactos y límites editoriales.');
