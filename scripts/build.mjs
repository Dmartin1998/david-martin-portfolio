import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'dist');
if (output !== join(root, 'dist')) throw new Error('Directorio de salida no válido');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of await readdir(join(root, 'public'))) {
  await cp(join(root, 'public', file), join(output, file), { recursive: true });
}
if (!(await stat(join(output, 'index.html'))).isFile()) throw new Error('Falta index.html');
console.log('Portfolio construido en dist/');
