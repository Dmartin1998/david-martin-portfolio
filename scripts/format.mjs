// Devuelve legibilidad al fuente sin cambiar lo que el navegador renderiza.
//
//   npm run format          formatea public/index.html, design.css y revision.css
//   npm run format -- --check   falla si algun archivo no esta formateado (para CI)
//
// No toca app.js ni revision.js: no estan minificados, y app.js construye HTML
// con template literals donde los espacios SI son significativos.
//
// Sin dependencias, igual que el resto del proyecto.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const INDENT = '  ';

/* ----------------------------------------------------------------- HTML -- */

// Elementos sin cierre.
const VACIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

// Su contenido se emite tal cual (texto crudo o espacios significativos).
const LITERALES = new Set(['script', 'style', 'pre', 'textarea', 'svg']);

// Elementos en flujo de texto: romper linea alrededor de ellos cambiaria el
// render, porque el espacio en blanco entre elementos en linea SI se pinta.
const EN_LINEA = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'button', 'canvas',
  'cite', 'code', 'data', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map',
  'mark', 'meter', 'noscript', 'object', 'output', 'picture', 'progress', 'q',
  'ruby', 's', 'samp', 'select', 'small', 'span', 'strong', 'sub', 'sup', 'svg',
  'textarea', 'time', 'u', 'var', 'video', 'audio', 'wbr']);

// Contenedores flex/grid verificados en el CSS: ahi el navegador descarta los
// nodos de texto en blanco entre hijos, asi que podemos partirlos en lineas
// aunque sus hijos sean elementos en linea (<button>). Antes de sumar una
// clase a esta lista, confirmar su `display` y correr `npm run snapshot:diff`.
const CONTENEDORES_SIN_ESPACIO = new Set(['skills-tabs', 'pax-filter-row']);

function clasesDe(etiqueta) {
  const encontrado = etiqueta.match(/\sclass\s*=\s*"([^"]*)"/i);
  return encontrado ? encontrado[1].split(/\s+/) : [];
}

function parsearHtml(fuente) {
  const raiz = { tipo: 'raiz', hijos: [] };
  const pila = [raiz];
  let i = 0;

  const agregar = nodo => pila[pila.length - 1].hijos.push(nodo);

  while (i < fuente.length) {
    const apertura = fuente.indexOf('<', i);

    if (apertura === -1) {
      if (i < fuente.length) agregar({ tipo: 'texto', valor: fuente.slice(i) });
      break;
    }
    if (apertura > i) agregar({ tipo: 'texto', valor: fuente.slice(i, apertura) });

    // Comentario
    if (fuente.startsWith('<!--', apertura)) {
      const fin = fuente.indexOf('-->', apertura);
      const corte = fin === -1 ? fuente.length : fin + 3;
      agregar({ tipo: 'crudo', valor: fuente.slice(apertura, corte) });
      i = corte;
      continue;
    }

    // Doctype y similares
    if (fuente.startsWith('<!', apertura)) {
      const fin = fuente.indexOf('>', apertura);
      const corte = fin === -1 ? fuente.length : fin + 1;
      agregar({ tipo: 'crudo', valor: fuente.slice(apertura, corte) });
      i = corte;
      continue;
    }

    // Cierre
    if (fuente.startsWith('</', apertura)) {
      const fin = fuente.indexOf('>', apertura);
      const corte = fin === -1 ? fuente.length : fin + 1;
      const nombre = fuente.slice(apertura + 2, corte - 1).trim().toLowerCase();
      for (let p = pila.length - 1; p > 0; p--) {
        if (pila[p].nombre === nombre) { pila.length = p; break; }
      }
      i = corte;
      continue;
    }

    // Apertura: localizar el '>' que cierra la etiqueta respetando comillas.
    let j = apertura + 1;
    let comilla = null;
    while (j < fuente.length) {
      const c = fuente[j];
      if (comilla) {
        if (c === comilla) comilla = null;
      } else if (c === '"' || c === "'") {
        comilla = c;
      } else if (c === '>') {
        break;
      }
      j++;
    }
    const etiqueta = fuente.slice(apertura, j + 1);
    const nombre = (etiqueta.match(/^<\s*([a-zA-Z0-9:-]+)/) || [, ''])[1].toLowerCase();
    const autocerrada = /\/>$/.test(etiqueta) || VACIOS.has(nombre);
    i = j + 1;

    if (LITERALES.has(nombre) && !autocerrada) {
      // Contenido literal: copiarlo sin tocar hasta el cierre correspondiente.
      const cierre = new RegExp(`</\\s*${nombre}\\s*>`, 'i');
      const resto = fuente.slice(i);
      const encontrado = resto.match(cierre);
      const contenido = encontrado ? resto.slice(0, encontrado.index) : resto;
      const etiquetaCierre = encontrado ? encontrado[0] : '';
      agregar({ tipo: 'literal', nombre, etiqueta, contenido, etiquetaCierre });
      i += contenido.length + etiquetaCierre.length;
      continue;
    }

    const nodo = { tipo: 'elemento', nombre, etiqueta, hijos: [], autocerrada };
    agregar(nodo);
    if (!autocerrada) pila.push(nodo);
  }

  return raiz;
}

const esEnLinea = nodo =>
  nodo.tipo === 'texto' ||
  (nodo.tipo === 'literal' && EN_LINEA.has(nodo.nombre)) ||
  (nodo.tipo === 'elemento' && EN_LINEA.has(nodo.nombre));

function serializarEnLinea(nodo) {
  if (nodo.tipo === 'texto') return nodo.valor;
  if (nodo.tipo === 'crudo') return nodo.valor;
  if (nodo.tipo === 'literal') return nodo.etiqueta + nodo.contenido + nodo.etiquetaCierre;
  const interior = nodo.hijos.map(serializarEnLinea).join('');
  return nodo.etiqueta + interior + (nodo.autocerrada ? '' : `</${nodo.nombre}>`);
}

function serializar(nodo, nivel, salida) {
  const sangria = INDENT.repeat(nivel);

  if (nodo.tipo === 'crudo') { salida.push(sangria + nodo.valor); return; }

  if (nodo.tipo === 'literal') {
    // El contenido va tal cual; solo se sangra la etiqueta de apertura.
    salida.push(sangria + nodo.etiqueta + nodo.contenido + nodo.etiquetaCierre);
    return;
  }

  if (nodo.autocerrada) { salida.push(sangria + nodo.etiqueta); return; }

  // En un contenedor flex/grid conocido, cada hijo va en su propia linea.
  const sinEspacio = clasesDe(nodo.etiqueta).some(c => CONTENEDORES_SIN_ESPACIO.has(c));

  // Agrupar hijos: bloques sueltos, y corridas contiguas de contenido en linea.
  const grupos = [];
  for (const hijo of nodo.hijos) {
    if (sinEspacio && hijo.tipo !== 'texto') {
      grupos.push({ tipo: 'bloque', nodo: hijo });
    } else if (esEnLinea(hijo)) {
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.tipo === 'corrida') ultimo.nodos.push(hijo);
      else grupos.push({ tipo: 'corrida', nodos: [hijo] });
    } else {
      grupos.push({ tipo: 'bloque', nodo: hijo });
    }
  }

  const hayBloques = grupos.some(g => g.tipo === 'bloque');

  if (!hayBloques) {
    // Solo contenido en linea: una sola linea, con el interior intacto.
    const interior = nodo.hijos.map(serializarEnLinea).join('');
    salida.push(sangria + nodo.etiqueta + interior.trim() + `</${nodo.nombre}>`);
    return;
  }

  salida.push(sangria + nodo.etiqueta);
  for (const grupo of grupos) {
    if (grupo.tipo === 'bloque') {
      serializar(grupo.nodo, nivel + 1, salida);
    } else {
      const texto = grupo.nodos.map(serializarEnLinea).join('').trim();
      if (texto) salida.push(INDENT.repeat(nivel + 1) + texto);
    }
  }
  salida.push(sangria + `</${nodo.nombre}>`);
}

function formatearHtml(fuente) {
  const arbol = parsearHtml(fuente);
  const salida = [];
  for (const hijo of arbol.hijos) {
    if (hijo.tipo === 'texto' && !hijo.valor.trim()) continue;
    serializar(hijo, 0, salida);
  }
  return salida.join('\n') + '\n';
}

/* ------------------------------------------------------------------ CSS -- */

function formatearCss(fuente) {
  const salida = [];
  let linea = '';
  let nivel = 0;
  let parentesis = 0;
  let comilla = null;
  let i = 0;

  const volcar = () => {
    const texto = linea.trim();
    if (texto) salida.push(INDENT.repeat(nivel) + texto);
    linea = '';
  };

  while (i < fuente.length) {
    const c = fuente[i];

    if (comilla) {
      linea += c;
      if (c === comilla && fuente[i - 1] !== '\\') comilla = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { comilla = c; linea += c; i++; continue; }

    // Comentario: se conserva en su propia linea.
    if (c === '/' && fuente[i + 1] === '*') {
      const fin = fuente.indexOf('*/', i + 2);
      const corte = fin === -1 ? fuente.length : fin + 2;
      volcar();
      salida.push(INDENT.repeat(nivel) + fuente.slice(i, corte).trim());
      i = corte;
      continue;
    }

    if (c === '(') { parentesis++; linea += c; i++; continue; }
    if (c === ')') { parentesis = Math.max(0, parentesis - 1); linea += c; i++; continue; }

    if (c === '{' && parentesis === 0) {
      linea = linea.trim() + ' {';
      volcar();
      nivel++;
      i++;
      continue;
    }
    if (c === '}' && parentesis === 0) {
      volcar();
      nivel = Math.max(0, nivel - 1);
      salida.push(INDENT.repeat(nivel) + '}');
      i++;
      continue;
    }
    if (c === ';' && parentesis === 0) {
      linea = linea.trim() + ';';
      volcar();
      i++;
      continue;
    }
    // Lista de selectores: una linea por selector.
    if (c === ',' && parentesis === 0 && !linea.includes(':') && !linea.trim().startsWith('@')) {
      linea = linea.trim() + ',';
      volcar();
      i++;
      continue;
    }
    if (/\s/.test(c)) {
      if (linea && !/\s$/.test(linea)) linea += ' ';
      i++;
      continue;
    }

    linea += c;
    i++;
  }
  volcar();

  // Una linea en blanco antes de cada regla de nivel superior.
  const bonito = [];
  for (const texto of salida) {
    const esReglaRaiz = /\{$/.test(texto) && !/^\s/.test(texto);
    if (esReglaRaiz && bonito.length && bonito[bonito.length - 1] !== '') bonito.push('');
    bonito.push(texto);
  }
  return bonito.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* ----------------------------------------------------------------- main -- */

const raiz = resolve(import.meta.dirname, '..');
const objetivos = [
  { ruta: join(raiz, 'public', 'index.html'), formatear: formatearHtml },
  { ruta: join(raiz, 'public', 'design.css'), formatear: formatearCss },
  { ruta: join(raiz, 'public', 'revision.css'), formatear: formatearCss },
  { ruta: join(raiz, 'public', 'cinta', 'index.html'), formatear: formatearHtml },
  { ruta: join(raiz, 'public', 'cinta', 'cinta.css'), formatear: formatearCss },
];

const soloVerificar = process.argv.includes('--check');
let desformateados = 0;

for (const { ruta, formatear } of objetivos) {
  const original = await readFile(ruta, 'utf8');
  const resultado = formatear(original);
  const nombre = ruta.slice(raiz.length + 1).replace(/\\/g, '/');

  if (original === resultado) {
    console.log(`  sin cambios  ${nombre}`);
    continue;
  }
  if (soloVerificar) {
    console.log(`  SIN FORMATEAR ${nombre}`);
    desformateados++;
    continue;
  }
  await writeFile(ruta, resultado, 'utf8');
  const antes = original.split('\n');
  const despues = resultado.split('\n');
  const maximo = textos => Math.max(...textos.map(t => t.length));
  console.log(`  formateado   ${nombre}  ${antes.length} lineas (max ${maximo(antes)}) -> ${despues.length} lineas (max ${maximo(despues)})`);
}

if (soloVerificar && desformateados) {
  console.error(`\n${desformateados} archivo(s) sin formatear. Ejecuta: npm run format`);
  process.exit(1);
}
