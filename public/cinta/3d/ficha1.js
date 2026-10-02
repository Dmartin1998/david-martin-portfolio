// Ficha 01 en 3D: la claqueta entra girando desde fuera de cuadro, se posa
// junto al personaje, y al tocarla el palo golpea y la pizarra se reescribe
// con las habilidades, de frente y ocupando casi todo el lienzo.
//
// El personaje es david.glb, un modelo esculpido. Viene con la iluminacion
// horneada en la textura (KHR_materials_unlit), asi que no reacciona a las
// luces de la escena: se ve igual en cualquier maquina, que es justo lo que se
// quiere de un retrato. Tiene las manos en los bolsillos y no trae esqueleto,
// de modo que la pose es la que es: la claqueta no se sostiene, se posa al
// lado y flota. Las luces que hay son para la claqueta, que si las usa.
//
// El modelo original pesaba 13 MB. Quedo en 1,1: la textura paso a WebP de
// 1280, la malla se simplifico al 45 % con los bordes bloqueados y todo va
// comprimido con meshopt. Se carga en diferido, recien cuando la ficha
// aparece en pantalla.
//
// Las habilidades van dibujadas DENTRO de la pizarra, no debajo. Se dibujan en
// el mismo lienzo que el resto del rotulo, asi que acompanan a la claqueta
// aunque este girando o a medio escalar, sin tener que sincronizar una capa de
// HTML con la camara. La lista de verdad sigue en el HTML, escondida a la
// vista pero intacta para un lector de pantalla.
//
// Aca no hay pase de post-proceso: la pagina entera ya vive dentro del tubo,
// asi que el lienzo se dibuja transparente y hereda el tratamiento del sitio.

import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';
import { MeshoptDecoder } from './meshopt_decoder.module.js';

const RUTA = '/cinta/3d/david.glb';

const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;
const frenar = (t) => 1 - Math.pow(1 - t, 3);
const tope = (v, a, b) => Math.max(a, Math.min(b, v));

function mate(color, aspereza) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: aspereza == null ? 0.82 : aspereza,
    metalness: 0
  });
}

/* -------------------------------------------------------------- pizarra -- */

const PZ = { w: 1280, h: 1016, m: 46 };
const TIZA = '#eceadf';
const APAGADO = '#8e8a7e';

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function aTextura(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Tiza: el trazo nunca es una linea perfecta. Tres pasadas con un temblor
// minimo, que es lo que separa un rotulo escrito de uno impreso.
function trazo(g, puntos, grosor, color, alfa) {
  g.strokeStyle = color || TIZA;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let k = 0; k < 3; k++) {
    g.globalAlpha = (alfa == null ? 1 : alfa) * (0.34 + k * 0.1);
    g.lineWidth = grosor * (1 - k * 0.14);
    g.beginPath();
    for (let i = 0; i < puntos.length; i++) {
      const x = puntos[i][0] + (Math.random() - 0.5) * 2.2;
      const y = puntos[i][1] + (Math.random() - 0.5) * 2.2;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}

function raya(g, x0, y0, x1, y1, grosor, color) {
  const n = [];
  for (let i = 0; i <= 7; i++) n.push([mezcla(x0, x1, i / 7), mezcla(y0, y1, i / 7)]);
  trazo(g, n, grosor, color);
}

function escribir(g, s, x, y, tam, color, alinear) {
  g.font = '700 ' + tam + 'px ui-monospace, "Courier New", monospace';
  g.textAlign = alinear || 'left';
  g.textBaseline = 'middle';
  g.save();
  g.translate(x, y);
  g.rotate((Math.random() - 0.5) * 0.012);
  g.globalAlpha = 0.26;
  g.fillStyle = color || TIZA;
  g.fillText(s, 2, 2);
  g.globalAlpha = 1;
  g.fillText(s, 0, 0);
  g.restore();
}

function fondoPizarra(g) {
  g.fillStyle = '#16171c';
  g.fillRect(0, 0, PZ.w, PZ.h);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.016 + ')';
    g.fillRect(Math.random() * PZ.w, Math.random() * PZ.h, Math.random() * 90 + 10, 1);
  }
  const M = PZ.m;
  raya(g, M, M, PZ.w - M, M, 7);
  raya(g, PZ.w - M, M, PZ.w - M, PZ.h - M, 7);
  raya(g, PZ.w - M, PZ.h - M, M, PZ.h - M, 7);
  raya(g, M, PZ.h - M, M, M, 7);
}

function polvo(g) {
  g.globalAlpha = 0.05;
  for (let i = 0; i < 22; i++) {
    g.strokeStyle = TIZA;
    g.lineWidth = Math.random() * 2 + 0.5;
    g.beginPath();
    const x0 = Math.random() * PZ.w, y0 = Math.random() * PZ.h;
    g.moveTo(x0, y0);
    g.lineTo(x0 + (Math.random() - 0.5) * 220, y0 + (Math.random() - 0.5) * 60);
    g.stroke();
  }
  for (let i = 0; i < 50; i++) {
    g.fillStyle = TIZA;
    g.globalAlpha = Math.random() * 0.06;
    g.beginPath();
    g.arc(Math.random() * PZ.w, Math.random() * PZ.h, Math.random() * 26 + 4, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
}

// Cara A: los datos de rodaje.
function pizarraDatos() {
  const [c, g] = lienzo(PZ.w, PZ.h);
  fondoPizarra(g);
  const M = PZ.m, W = PZ.w;
  const F1 = 232, F2 = 418, F3 = 678, F4 = 846;
  [F1, F2, F3, F4].forEach(function (y) { raya(g, M, y, W - M, y, 4, APAGADO); });

  escribir(g, 'PROD.', M + 38, 140, 54, APAGADO);
  escribir(g, 'ISCAA', W - M - 38, 140, 68, TIZA, 'right');
  escribir(g, 'DIR.', M + 38, 326, 54, APAGADO);
  escribir(g, 'D. MARTÍN', W - M - 38, 326, 68, TIZA, 'right');

  const c1 = M + (W - 2 * M) / 3, c2 = M + ((W - 2 * M) / 3) * 2;
  raya(g, c1, F2, c1, F3, 4, APAGADO);
  raya(g, c2, F2, c2, F3, 4, APAGADO);
  [['ESCENA', '01', M, c1], ['TOMA', '01', c1, c2], ['ROLLO', 'A', c2, W - M]].forEach(function (b) {
    const cx = (b[2] + b[3]) / 2;
    escribir(g, b[0], cx, 484, 42, APAGADO, 'center');
    escribir(g, b[1], cx, 596, 112, TIZA, 'center');
  });

  escribir(g, 'FECHA', M + 38, 762, 54, APAGADO);
  escribir(g, '2020', W - M - 38, 762, 68, TIZA, 'right');
  escribir(g, 'REALIZACIÓN INTEGRAL DE CINE, TV Y VIDEO', W / 2, 932, 42, APAGADO, 'center');

  polvo(g);
  return aTextura(c);
}

/* ---- los iconos, con el mismo pulso que el resto del rotulo ---- */

const ICONOS = {
  camara: function (g, col) {
    trazo(g, [[-30, -12], [12, -12], [12, 18], [-30, 18], [-30, -12]], 4, col);
    trazo(g, [[12, -2], [30, -12], [30, 20], [12, 10], [12, -2]], 4, col);
    g.strokeStyle = col; g.lineWidth = 3.4; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(-16, -24, 11, 0, 7); g.stroke();
    g.beginPath(); g.arc(4, -24, 11, 0, 7); g.stroke();
    g.beginPath(); g.arc(-9, 3, 7, 0, 7); g.stroke();
    g.globalAlpha = 1;
  },
  edicion: function (g, col) {
    trazo(g, [[-24, -26], [10, 14]], 4, col);
    trazo(g, [[24, -26], [-10, 14]], 4, col);
    g.strokeStyle = col; g.lineWidth = 3.4; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(-15, 22, 9, 0, 7); g.stroke();
    g.beginPath(); g.arc(15, 22, 9, 0, 7); g.stroke();
    g.globalAlpha = 1;
  },
  iluminacion: function (g, col) {
    trazo(g, [[-18, -16], [18, -16], [26, 16], [-26, 16], [-18, -16]], 4, col);
    trazo(g, [[-18, -16], [-30, -30]], 4, col);
    trazo(g, [[18, -16], [30, -30]], 4, col);
    trazo(g, [[-10, 16], [-10, 28]], 4, col);
    trazo(g, [[10, 16], [10, 28]], 4, col);
  },
  color: function (g, col) {
    g.strokeStyle = col; g.lineWidth = 3.6; g.globalAlpha = 0.9;
    [[0, -12], [-13, 10], [13, 10]].forEach(function (p) {
      g.beginPath(); g.arc(p[0], p[1], 15, 0, 7); g.stroke();
    });
    g.globalAlpha = 1;
  },
  sonido: function (g, col) {
    [8, 20, 30, 14, 26, 10, 18].forEach(function (h, i) {
      const x = -30 + i * 10;
      trazo(g, [[x, -h], [x, h]], 4.2, col);
    });
  },
  guion: function (g, col) {
    trazo(g, [[-26, 20], [12, -18]], 4.4, col);
    trazo(g, [[12, -18], [22, -28], [30, -20], [20, -10]], 4, col);
    trazo(g, [[12, -18], [20, -10]], 3.4, col);
    trazo(g, [[-26, 20], [-30, 30], [-20, 26]], 4, col);
    trazo(g, [[-30, 38], [30, 38]], 3.4, col);
  }
};

const HABILIDADES = [
  { icono: 'camara', nombre: 'CÁMARA', n: 9, color: '#7fe07f' },
  { icono: 'edicion', nombre: 'EDICIÓN', n: 9, color: '#7fe07f' },
  { icono: 'iluminacion', nombre: 'ILUMINACIÓN', n: 8, color: '#b9dd5e' },
  { icono: 'color', nombre: 'COLOR', n: 6, color: '#e8bd52' },
  { icono: 'sonido', nombre: 'SONIDO', n: 6, color: '#e8bd52' },
  { icono: 'guion', nombre: 'GUION', n: 4, color: '#e0864e' }
];

const BARRA = { x0: 606, ancho: 476, ranuras: 10 };

// Cara B: las habilidades. El fondo se dibuja una sola vez y despues cada
// fotograma solo repinta los segmentos encendidos: redibujar la pizarra entera
// sesenta veces por segundo seria tirar la GPU por la ventana.
function pizarraHabilidades() {
  const [fondo, gf] = lienzo(PZ.w, PZ.h);
  fondoPizarra(gf);

  const M = PZ.m;
  escribir(gf, 'ESCENA 01', M + 38, 126, 44, APAGADO);
  escribir(gf, 'HABILIDADES', PZ.w - M - 38, 126, 64, TIZA, 'right');
  raya(gf, M + 24, 182, PZ.w - M - 24, 182, 4, APAGADO);

  const Y0 = 262, PASO = 128;

  HABILIDADES.forEach(function (h, i) {
    const y = Y0 + i * PASO;
    gf.save();
    gf.translate(M + 78, y);
    ICONOS[h.icono](gf, h.color);
    gf.restore();

    escribir(gf, h.nombre, M + 140, y, 46, TIZA);
    escribir(gf, h.n * 10 + '%', PZ.w - M - 38, y, 48, h.color, 'right');

    const paso = BARRA.ancho / BARRA.ranuras;
    for (let k = 0; k < BARRA.ranuras; k++) {
      gf.globalAlpha = 0.34;
      gf.strokeStyle = APAGADO;
      gf.lineWidth = 2.6;
      gf.strokeRect(BARRA.x0 + k * paso, y - 17, paso * 0.74, 34);
      gf.globalAlpha = 1;
    }
  });

  polvo(gf);

  const [c, g] = lienzo(PZ.w, PZ.h);
  const tex = aTextura(c);

  function dibujar(avance) {
    g.clearRect(0, 0, PZ.w, PZ.h);
    g.drawImage(fondo, 0, 0);
    const paso = BARRA.ancho / BARRA.ranuras;
    HABILIDADES.forEach(function (h, i) {
      const y = Y0 + i * PASO;
      // Cada fila arranca un pelin despues que la anterior.
      const p = tope((avance - i * 0.06) / 0.72, 0, 1);
      const encendidos = Math.round(h.n * p);
      g.fillStyle = h.color;
      g.globalAlpha = 0.9;
      for (let k = 0; k < encendidos; k++) {
        g.fillRect(BARRA.x0 + k * paso + 1.5, y - 15.5, paso * 0.74 - 3, 31);
      }
      g.globalAlpha = 1;
    });
    tex.needsUpdate = true;
  }

  dibujar(0);
  return { tex: tex, dibujar: dibujar };
}

function texturaPalo() {
  const [c, g] = lienzo(1200, 150);
  g.fillStyle = '#17161b';
  g.fillRect(0, 0, 1200, 150);
  g.fillStyle = '#e9e6dc';
  for (let i = -1; i < 16; i++) {
    g.beginPath();
    g.moveTo(i * 80 + 44, 0);
    g.lineTo(i * 80 + 84, 0);
    g.lineTo(i * 80 + 40, 150);
    g.lineTo(i * 80, 150);
    g.closePath();
    g.fill();
  }
  for (let i = 0; i < 180; i++) {
    g.globalAlpha = Math.random() * 0.3;
    g.fillStyle = Math.random() > 0.5 ? '#17161b' : '#e9e6dc';
    g.fillRect(Math.random() * 1200, Math.random() * 150, Math.random() * 16 + 2, Math.random() * 7 + 1);
  }
  g.globalAlpha = 1;
  return aTextura(c);
}

/* ---------------------------------------------------------------- placa -- */
// Ojo: el bisel agranda la pieza BISEL en cada lado, asi que el alto real es
// el nominal mas dos biseles. No tenerlo en cuenta dejaba un hueco entre el
// palo y la banda y hacia que la claqueta se saliera del lienzo por arriba.

const BISEL = 0.006;

function placa(ancho, alto, radio, fondo) {
  const f = new THREE.Shape();
  const x = -ancho / 2, y = -alto / 2, r = Math.min(radio, ancho / 2, alto / 2);
  f.moveTo(x + r, y);
  f.lineTo(x + ancho - r, y);
  f.quadraticCurveTo(x + ancho, y, x + ancho, y + r);
  f.lineTo(x + ancho, y + alto - r);
  f.quadraticCurveTo(x + ancho, y + alto, x + ancho - r, y + alto);
  f.lineTo(x + r, y + alto);
  f.quadraticCurveTo(x, y + alto, x, y + alto - r);
  f.lineTo(x, y + r);
  f.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(f, {
    depth: fondo, bevelEnabled: true, bevelThickness: BISEL,
    bevelSize: BISEL, bevelSegments: 3, curveSegments: 8
  });
  g.translate(0, 0, -fondo / 2);
  return g;
}

const caraZ = (fondo) => fondo / 2 + BISEL + 0.0025;

/* ------------------------------------------------------------- claqueta -- */

const ANCHO_CL = 0.58;
const ALTO_CL = 0.46;
const ALTO_BANDA = 0.058;
const ALTO_PALO = 0.07;
const FONDO_CL = 0.026;

function armarClaqueta(texPizarra) {
  const claqueta = new THREE.Group();

  const marco = mate(0x24262c, 0.52);
  const cara = new THREE.MeshStandardMaterial({ map: texPizarra, roughness: 0.46 });
  const rayas = new THREE.MeshStandardMaterial({ map: texturaPalo(), roughness: 0.5 });
  const canto = mate(0x1a1c21, 0.6);
  const tornillo = new THREE.MeshStandardMaterial({ color: 0xb9ac92, roughness: 0.3, metalness: 0.9 });

  const pizarra = new THREE.Mesh(placa(ANCHO_CL, ALTO_CL, 0.022, FONDO_CL), marco);
  pizarra.position.y = -ALTO_CL / 2;
  claqueta.add(pizarra);

  const frente = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL - 0.018, ALTO_CL - 0.018), cara);
  frente.position.set(0, -ALTO_CL / 2, caraZ(FONDO_CL));
  claqueta.add(frente);

  const banda = new THREE.Mesh(placa(ANCHO_CL, ALTO_BANDA, 0.012, 0.03), canto);
  banda.position.y = ALTO_BANDA / 2 + BISEL;
  claqueta.add(banda);

  const bandaCara = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL, ALTO_BANDA + BISEL), rayas);
  bandaCara.position.set(0, banda.position.y, caraZ(0.03));
  claqueta.add(bandaCara);

  const topeBanda = banda.position.y + ALTO_BANDA / 2 + BISEL;
  const bisagra = new THREE.Group();
  bisagra.position.set(-ANCHO_CL / 2 + 0.022, topeBanda, 0);

  const palo = new THREE.Mesh(placa(ANCHO_CL, ALTO_PALO, 0.014, 0.034), canto);
  palo.position.set(ANCHO_CL / 2 - 0.022, ALTO_PALO / 2 + BISEL, 0);
  bisagra.add(palo);

  const paloCara = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL, ALTO_PALO + BISEL), rayas);
  paloCara.position.set(palo.position.x, palo.position.y, caraZ(0.034));
  bisagra.add(paloCara);

  const eje = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 14), tornillo);
  eje.rotation.x = Math.PI / 2;
  eje.position.y = ALTO_PALO / 2;
  bisagra.add(eje);

  [0.021, -0.021].forEach(function (z) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.006, 14), tornillo);
    t.rotation.x = Math.PI / 2;
    t.position.set(0, ALTO_PALO / 2, z);
    bisagra.add(t);
  });

  claqueta.add(bisagra);

  const alto = ALTO_CL + ALTO_BANDA + ALTO_PALO + 6 * BISEL;
  const arriba = topeBanda + ALTO_PALO + 2 * BISEL;
  const abajo = -ALTO_CL - BISEL;

  return {
    claqueta: claqueta, bisagra: bisagra, cara: cara,
    alto: alto, centro: (arriba + abajo) / 2
  };
}

/* --------------------------------------------------------------- montar -- */

export function montar(lienzoGL, opciones) {
  const op = opciones || {};
  const quieto = !!op.quieto;

  const ancho = () => lienzoGL.clientWidth || 1;
  const alto = () => lienzoGL.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ canvas: lienzoGL, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.05, 40);

  // Las luces son para la claqueta. El personaje trae la suya horneada.
  escena.add(new THREE.HemisphereLight(0x93a6c4, 0x241f1b, 1.5));
  const clave = new THREE.DirectionalLight(0xfff3e2, 2.4);
  clave.position.set(-2.1, 3.2, 2.9);
  escena.add(clave);
  const relleno = new THREE.DirectionalLight(0x9db9d8, 0.9);
  relleno.position.set(2.6, 1.1, 1.8);
  escena.add(relleno);
  const contra = new THREE.DirectionalLight(0xc6daf5, 1.6);
  contra.position.set(1.4, 2.1, -2.8);
  escena.add(contra);

  const texDatos = pizarraDatos();
  const habilidades = pizarraHabilidades();
  const cl = armarClaqueta(texDatos);
  const claqueta = cl.claqueta, bisagra = cl.bisagra;
  escena.add(claqueta);

  // El personaje llega despues: son 1,1 MB y no tienen por que frenar a la
  // claqueta, que ya se puede tocar.
  const persona = new THREE.Group();
  persona.visible = false;
  escena.add(persona);

  const PERSONA_X = 0.42;
  persona.position.set(PERSONA_X, -1.28, 0);
  persona.rotation.y = -0.2;

  const cargador = new GLTFLoader();
  cargador.setMeshoptDecoder(MeshoptDecoder);
  let llegada = 0;
  cargador.load(RUTA, function (g) {
    persona.add(g.scene);
    persona.visible = true;
    llegada = performance.now();
    arrancar();
  }, undefined, function () {
    // Si el modelo no llega, la ficha funciona igual: queda la claqueta sola.
  });

  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(0.37, 0.008, 6, 44),
    new THREE.MeshBasicMaterial({ color: 0x7fe07f, transparent: true, opacity: 0 })
  );
  escena.add(aro);

  /* ---- encuadre ---- */
  // Retrato de tres cuartos: desde debajo de la rodilla hasta arriba de la
  // cabeza, con la claqueta a la izquierda.
  const MIRA = new THREE.Vector3(0.02, 0.02, 0);
  let angosto = false;

  function medir() {
    const w = ancho(), h = alto();
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const r = w / h;
    angosto = r < 1;
    camara.position.set(0.05, 0.12, angosto ? 2.95 : 2.32 + (1.5 - Math.min(r, 1.5)) * 1.05);
    camara.lookAt(MIRA);
    camara.updateProjectionMatrix();
    // En vertical el cuadro es mas angosto y la claqueta se iba por el borde.
    EN_REPOSO.x = angosto ? -0.28 : -0.37;
    if (!abierta && !transicion && !vuelo && entrada >= 1) claqueta.position.x = EN_REPOSO.x;
    if (abierta && !transicion) {
      const f = encuadreAbierto();
      claqueta.position.copy(f.pos);
      claqueta.scale.setScalar(f.escala);
    }
  }

  /* ---- donde va la claqueta ---- */
  // El modelo tiene las manos en los bolsillos y no trae esqueleto, asi que no
  // la puede sostener: se posa a su lado y flota, que ademas le va bien a una
  // pagina que es el sueno de una cinta.
  const EN_REPOSO = new THREE.Vector3(-0.37, 0.31, 0.4);
  // medir() las lee, y medir() corre antes de que se declaren mas abajo.
  var abierta = false, transicion = null, vuelo = 0, entrada = quieto ? 1 : -1;
  const GIRO_REPOSO = new THREE.Euler(-0.08, 0.26, 0.05);
  const FUERA = new THREE.Vector3(-3.6, 2, -0.6);
  const SIN_GIRO = new THREE.Euler(0, 0, 0);

  claqueta.position.copy(quieto ? EN_REPOSO : FUERA);
  claqueta.rotation.copy(GIRO_REPOSO);
  claqueta.visible = quieto;

  const Z_FRENTE = 1.3;

  function encuadreAbierto() {
    const d = camara.position.z - Z_FRENTE;
    const altoVisible = 2 * d * Math.tan((camara.fov * Math.PI) / 360);
    const anchoVisible = altoVisible * camara.aspect;
    const escala = Math.min(
      (altoVisible * 0.94) / cl.alto,
      (anchoVisible * 0.96) / (ANCHO_CL + 2 * BISEL)
    );
    const t = (camara.position.z - Z_FRENTE) / camara.position.z;
    return {
      pos: new THREE.Vector3(
        camara.position.x + (MIRA.x - camara.position.x) * t,
        camara.position.y + (MIRA.y - camara.position.y) * t - cl.centro * escala,
        Z_FRENTE
      ),
      escala: escala
    };
  }

  let vivo = true;
  let corriendo = false;
  let t = 0;
  let giroLibre = new THREE.Vector3(0, 0, 0);
  let clap = 0;
  let escrito = false;
  let llenado = 0;

  const reloj = new THREE.Clock();
  const observador = new ResizeObserver(medir);
  observador.observe(lienzoGL);
  medir();

  function bucle() {
    if (!vivo || !corriendo) return;
    requestAnimationFrame(bucle);
    // dt solo mueve el balanceo, que no pasa nada si se atrasa; todo lo que
    // tiene que terminar en un momento dado va contra performance.now().
    t += Math.min(reloj.getDelta(), 0.05);

    if (vuelo) {
      entrada = Math.min(1, (performance.now() - vuelo) / 1600);
      const k = frenar(entrada);
      claqueta.position.lerpVectors(FUERA, EN_REPOSO, k);
      claqueta.position.y += Math.sin(entrada * Math.PI) * 0.5;
      const resto = 1 - k;
      claqueta.rotation.set(
        GIRO_REPOSO.x + resto * giroLibre.x,
        GIRO_REPOSO.y + resto * giroLibre.y,
        GIRO_REPOSO.z + resto * giroLibre.z
      );
      if (entrada >= 1) vuelo = 0;
    }

    // El personaje aparece con un fundido corto: aparecer de golpe se nota.
    if (llegada) {
      const p = Math.min(1, (performance.now() - llegada) / 700);
      persona.position.z = (1 - p) * -0.35;
      if (p >= 1) llegada = 0;
    }

    if (!quieto) {
      // Balanceo: el modelo no tiene huesos, asi que respira el conjunto.
      persona.position.y = -1.28 + Math.sin(t * 1.05) * 0.009;
      persona.rotation.y = -0.2 + Math.sin(t * 0.47) * 0.035;
      persona.rotation.z = Math.sin(t * 0.63) * 0.006;
      if (!abierta && !transicion && !vuelo) {
        claqueta.position.y = EN_REPOSO.y + Math.sin(t * 0.9) * 0.018;
        claqueta.rotation.z = GIRO_REPOSO.z + Math.sin(t * 0.72) * 0.02;
      }
    }

    if (!abierta && entrada >= 1 && !transicion) {
      const ciclo = quieto ? 0.35 : (t * 0.62) % 1;
      claqueta.getWorldPosition(aro.position);
      aro.position.y -= ALTO_CL / 2;
      aro.lookAt(camara.position);
      const s = 0.78 + ciclo * 0.62;
      aro.scale.set(s, s, s);
      aro.material.opacity = (1 - ciclo) * 0.55;
    } else {
      aro.material.opacity = 0;
    }

    if (transicion) {
      transicion.k = Math.min(1, (performance.now() - transicion.inicio) / transicion.dur);
      const k = suave(transicion.k);
      claqueta.position.lerpVectors(transicion.de, transicion.a, k);
      claqueta.rotation.set(
        mezcla(transicion.giroDe.x, transicion.giroA.x, k),
        mezcla(transicion.giroDe.y, transicion.giroA.y, k),
        mezcla(transicion.giroDe.z, transicion.giroA.z, k)
      );
      claqueta.scale.setScalar(mezcla(transicion.escalaDe, transicion.escalaA, k));
      // El personaje se corre y se va al fondo cuando la pizarra toma el cuadro.
      const fuera = transicion.abriendo ? k : 1 - k;
      persona.position.x = PERSONA_X + fuera * (angosto ? 0.34 : 0.72);
      persona.position.z = -fuera * 1.8;
      if (transicion.k >= 1) transicion = null;
    }

    // El palo: sube, baja de golpe y queda vibrando un instante. En el golpe
    // la pizarra se reescribe: es el momento en que la claqueta dice algo.
    if (clap) {
      const k = Math.min(1, (performance.now() - clap) / 340);
      let a;
      if (k < 0.32) a = (k / 0.32) * 0.62;
      else if (k < 0.52) a = 0.62 * (1 - (k - 0.32) / 0.2);
      else a = Math.sin((k - 0.52) * 46) * 0.05 * (1 - (k - 0.52) / 0.48);
      bisagra.rotation.z = a;
      if (!escrito && k >= 0.52) {
        escrito = true;
        cl.cara.map = habilidades.tex;
        cl.cara.needsUpdate = true;
        llenado = performance.now();
      }
      if (k >= 1) { clap = 0; bisagra.rotation.z = 0; }
    }

    if (llenado) {
      const p = Math.min(1, (performance.now() - llenado) / 1300);
      habilidades.dibujar(p);
      if (p >= 1) llenado = 0;
    }

    renderer.render(escena, camara);
  }

  function arrancar() {
    if (corriendo || !vivo) return;
    corriendo = true;
    reloj.getDelta();
    bucle();
  }

  function parar() { corriendo = false; }

  function entrar() {
    if (entrada >= 0) return false;
    claqueta.visible = true;
    entrada = 0;
    vuelo = performance.now();
    giroLibre = new THREE.Vector3(Math.PI * 2.4, Math.PI * 3.6, Math.PI * 1.8);
    arrancar();
    return true;
  }

  function abrir() {
    if (abierta) return;
    abierta = true;
    clap = performance.now();
    const fin = encuadreAbierto();
    transicion = {
      k: 0, inicio: performance.now(), dur: 900, abriendo: true,
      de: claqueta.position.clone(), a: fin.pos,
      giroDe: claqueta.rotation.clone(), giroA: SIN_GIRO,
      escalaDe: claqueta.scale.x, escalaA: fin.escala
    };
    arrancar();
  }

  function cerrar() {
    if (!abierta) return;
    abierta = false;
    // Al volver, la pizarra muestra otra vez los datos de rodaje.
    escrito = false;
    llenado = 0;
    cl.cara.map = texDatos;
    cl.cara.needsUpdate = true;
    habilidades.dibujar(0);
    transicion = {
      k: 0, inicio: performance.now(), dur: 720, abriendo: false,
      de: claqueta.position.clone(), a: EN_REPOSO.clone(),
      giroDe: claqueta.rotation.clone(), giroA: GIRO_REPOSO,
      escalaDe: claqueta.scale.x, escalaA: 1
    };
    arrancar();
  }

  function detener() {
    vivo = false;
    corriendo = false;
    observador.disconnect();
    renderer.dispose();
  }

  arrancar();

  return {
    entrar: entrar,
    abrir: abrir,
    cerrar: cerrar,
    // Fuera de pantalla no se dibuja: una ficha que nadie mira no gasta GPU.
    visible: function (si) { if (si) arrancar(); else parar(); },
    detener: detener
  };
}
