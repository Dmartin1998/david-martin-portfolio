// Ficha 01 en 3D: la claqueta entra girando desde fuera de cuadro, cae en la
// mano, y al tocarla el palo golpea y la pizarra se reescribe con las
// habilidades, de frente y ocupando casi todo el lienzo.
//
// Las habilidades van dibujadas DENTRO de la pizarra, no debajo. Se dibujan en
// el mismo lienzo que el resto del rotulo, asi que acompanan a la claqueta
// aunque este girando o a medio escalar, sin tener que sincronizar una capa de
// HTML con la camara. La lista de verdad sigue en el HTML, escondida a la
// vista pero intacta para un lector de pantalla.
//
// El personaje esta en proporciones de muneco y pintado con colores planos:
// la campera se arma con una pieza por color, no con una textura. Las texturas
// de bloques quedaban como ruido a este tamano. Lo que da el aire de personaje
// 3D no es la cantidad de poligonos sino la cabeza grande, las formas sin un
// solo canto vivo, el color plano y la luz blanda con sombra propia.
//
// Es geometria generada: cero bytes de descarga, ni un modelo.
//
// Aca no hay pase de post-proceso: la pagina entera ya vive dentro del tubo,
// asi que el lienzo se dibuja transparente y hereda el tratamiento del sitio.

import * as THREE from './three.module.min.js';

const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;
const frenar = (t) => 1 - Math.pow(1 - t, 3);
const tope = (v, a, b) => Math.max(a, Math.min(b, v));

const PIEL = 0xe8b08c;
const PELO = 0x2b1f18;
const TEAL = 0x1e6b74;
const MAGENTA = 0x8e2560;
const VIOLETA = 0x4e3192;
const CASI_NEGRO = 0x17171d;

// Donde sostiene la claqueta, en coordenadas del personaje.
const MANO_SOSTIENE = new THREE.Vector3(-0.53, 0.6, 0.2);
const GUIA_IZQ = new THREE.Vector3(-1, -0.4, -0.5);

function mate(color, aspereza) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: aspereza == null ? 0.82 : aspereza,
    metalness: 0
  });
}

/* -------------------------------------------------------------- pizarra -- */
// Las dos caras del rotulo: los datos de rodaje y las habilidades.

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

// Fondo comun: acrilico oscuro, veta, marco y polvo.
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

/* ---- los iconos, dibujados con el mismo pulso que el resto del rotulo ---- */
// Cada uno cabe en una caja de 64 centrada en el origen.

const ICONOS = {
  // Camara de cine: cuerpo, objetivo y los dos rollos arriba.
  camara: function (g, col) {
    trazo(g, [[-30, -12], [12, -12], [12, 18], [-30, 18], [-30, -12]], 4, col);
    trazo(g, [[12, -2], [30, -12], [30, 20], [12, 10], [12, -2]], 4, col);
    g.strokeStyle = col; g.lineWidth = 3.4; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(-16, -24, 11, 0, 7); g.stroke();
    g.beginPath(); g.arc(4, -24, 11, 0, 7); g.stroke();
    g.beginPath(); g.arc(-9, 3, 7, 0, 7); g.stroke();
    g.globalAlpha = 1;
  },
  // Tijera de montaje.
  edicion: function (g, col) {
    trazo(g, [[-24, -26], [10, 14]], 4, col);
    trazo(g, [[24, -26], [-10, 14]], 4, col);
    g.strokeStyle = col; g.lineWidth = 3.4; g.globalAlpha = 0.85;
    g.beginPath(); g.arc(-15, 22, 9, 0, 7); g.stroke();
    g.beginPath(); g.arc(15, 22, 9, 0, 7); g.stroke();
    g.globalAlpha = 1;
  },
  // Fresnel con viseras.
  iluminacion: function (g, col) {
    trazo(g, [[-18, -16], [18, -16], [26, 16], [-26, 16], [-18, -16]], 4, col);
    trazo(g, [[-18, -16], [-30, -30]], 4, col);
    trazo(g, [[18, -16], [30, -30]], 4, col);
    trazo(g, [[-10, 16], [-10, 28]], 4, col);
    trazo(g, [[10, 16], [10, 28]], 4, col);
  },
  // Tres circulos que se pisan: la rueda de color.
  color: function (g, col) {
    g.strokeStyle = col; g.lineWidth = 3.6; g.globalAlpha = 0.9;
    [[0, -12], [-13, 10], [13, 10]].forEach(function (p) {
      g.beginPath(); g.arc(p[0], p[1], 15, 0, 7); g.stroke();
    });
    g.globalAlpha = 1;
  },
  // Onda de audio.
  sonido: function (g, col) {
    const alturas = [8, 20, 30, 14, 26, 10, 18];
    alturas.forEach(function (h, i) {
      const x = -30 + i * 10;
      trazo(g, [[x, -h], [x, h]], 4.2, col);
    });
  },
  // Lapiz sobre renglon.
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
// fotograma solo repinta los segmentos encendidos, que son sesenta rectangulos:
// redibujar la pizarra entera sesenta veces por segundo seria tirar la GPU por
// la ventana para animar unas barras.
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

    // Las ranuras vacias.
    const paso = BARRA.ancho / BARRA.ranuras;
    for (let k = 0; k < BARRA.ranuras; k++) {
      const x = BARRA.x0 + k * paso;
      gf.globalAlpha = 0.34;
      gf.strokeStyle = APAGADO;
      gf.lineWidth = 2.6;
      gf.strokeRect(x, y - 17, paso * 0.74, 34);
      gf.globalAlpha = 1;
    }
  });

  polvo(gf);

  const [c, g] = lienzo(PZ.w, PZ.h);
  const tex = aTextura(c);

  // avance de 0 a 1: cuantos segmentos ya se encendieron.
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
      for (let k = 0; k < encendidos; k++) {
        g.globalAlpha = 0.9;
        g.fillRect(BARRA.x0 + k * paso + 1.5, y - 15.5, paso * 0.74 - 3, 31);
      }
      g.globalAlpha = 1;
    });
    tex.needsUpdate = true;
  }

  dibujar(0);
  return { tex: tex, dibujar: dibujar };
}

// El palo: diagonales gastadas, con la pintura saltada.
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
// Rectangulo con las puntas redondeadas y el canto biselado. Ojo: el bisel
// agranda la pieza BISEL en cada lado, asi que el alto real es el nominal mas
// dos biseles. No tenerlo en cuenta dejaba un hueco entre el palo y la banda y
// hacia que la claqueta se saliera del lienzo por arriba.

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

// Cara del extrudido: va por delante del bisel, no a la mitad del fondo.
const caraZ = (fondo) => fondo / 2 + BISEL + 0.0025;

/* ---------------------------------------------------- cinematica inversa -- */
// Dos huesos: se le dice donde va la mano y acomoda hombro y antebrazo. El
// vector guia decide para que lado sale el codo.

const ABAJO = new THREE.Vector3(0, -1, 0);

function apuntarBrazo(brazo, destino, guia) {
  const L1 = brazo.largos[0], L2 = brazo.largos[1];
  const v = destino.clone().sub(brazo.hombro.position);
  const D = tope(v.length(), Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.99);
  const dir = v.clone().normalize();

  const alfa = Math.acos(tope((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  const gama = Math.acos(tope((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));

  const eje = new THREE.Vector3().crossVectors(dir, guia);
  if (eje.lengthSq() < 1e-6) eje.set(0, 0, 1);
  eje.normalize();

  brazo.hombro.quaternion.setFromUnitVectors(ABAJO, dir.clone().applyAxisAngle(eje, -alfa));
  const ejeLocal = eje.clone().applyQuaternion(brazo.hombro.quaternion.clone().invert());
  brazo.codo.quaternion.setFromAxisAngle(ejeLocal, Math.PI - gama);
}

/* ------------------------------------------------------------ personaje -- */

function armarPersona() {
  const persona = new THREE.Group();

  const piel = mate(PIEL, 0.74);
  const pelo = mate(PELO, 0.88);
  const teal = mate(TEAL, 0.52);
  const magenta = mate(MAGENTA, 0.52);
  const violeta = mate(VIOLETA, 0.52);
  const negro = mate(CASI_NEGRO, 0.6);
  const algodon = mate(0xe2dfd4, 0.92);
  const pantalon = mate(0x2b2c34, 0.9);
  const suelaMat = mate(0xd8d4c8, 0.8);
  const metal = new THREE.MeshStandardMaterial({ color: 0xcdbb9a, roughness: 0.26, metalness: 0.92 });

  /* ---- piernas y zapatillas ---- */
  [-1, 1].forEach(function (s) {
    const pierna = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.22, 6, 20), pantalon);
    pierna.position.set(s * 0.115, 0.3, 0);
    persona.add(pierna);

    const zapa = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.11, 6, 20), negro);
    zapa.rotation.x = Math.PI / 2;
    zapa.scale.set(1, 1, 0.76);
    zapa.position.set(s * 0.115, 0.08, 0.05);
    persona.add(zapa);

    const suela = new THREE.Mesh(new THREE.CapsuleGeometry(0.083, 0.11, 5, 18), suelaMat);
    suela.rotation.x = Math.PI / 2;
    suela.scale.set(1, 1, 0.4);
    suela.position.set(s * 0.115, 0.036, 0.05);
    persona.add(suela);
  });

  /* ---- tronco: la campera por piezas, no por textura ---- */
  const torso = new THREE.Group();

  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.198, 0.2, 8, 28), teal);
  cuerpo.scale.z = 0.8;
  cuerpo.position.y = 0.63;
  torso.add(cuerpo);

  // Peto magenta: el panel del pecho de una rompeviento.
  const peto = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 28, 20, Math.PI * 0.72, Math.PI * 0.56, Math.PI * 0.26, Math.PI * 0.46),
    magenta
  );
  peto.scale.set(1.012, 1.012, 0.812);
  peto.position.y = 0.655;
  torso.add(peto);

  // Franja violeta cruzada abajo.
  const franja = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.062, 28, 1, true, Math.PI * 0.62, Math.PI * 0.76),
    violeta
  );
  franja.scale.z = 0.805;
  franja.position.y = 0.53;
  franja.material.side = THREE.DoubleSide;
  torso.add(franja);

  // La remera asoma entre las solapas.
  const remera = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.022, 0.19, 18), algodon);
  remera.scale.set(1, 1, 0.42);
  remera.position.set(0, 0.7, 0.142);
  torso.add(remera);

  // Cuello alto de rompeviento, y el elastico de la cintura.
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.113, 0.146, 0.1, 24, 1, true), negro);
  cuello.scale.z = 0.86;
  cuello.position.y = 0.79;
  cuello.material.side = THREE.DoubleSide;
  torso.add(cuello);

  const gola = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.021, 8, 26), negro);
  gola.rotation.x = Math.PI / 2;
  gola.scale.z = 0.86;
  gola.position.y = 0.835;
  torso.add(gola);

  const elastico = new THREE.Mesh(new THREE.CylinderGeometry(0.192, 0.186, 0.05, 28), negro);
  elastico.scale.z = 0.81;
  elastico.position.y = 0.455;
  torso.add(elastico);

  persona.add(torso);

  /* ---- cabeza ---- */
  const cabeza = new THREE.Group();
  cabeza.position.y = 1.15;

  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.265, 40, 32), piel);
  craneo.scale.set(1, 1.04, 0.95);
  cabeza.add(craneo);

  const pescuezo = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.07, 5, 16), piel);
  pescuezo.position.y = -0.245;
  cabeza.add(pescuezo);

  // Pelo: casquete y cinco bochas grandes. Con muchas bochas chicas quedaba
  // un coliflor; con pocas y grandes queda pelo.
  const casco = new THREE.Mesh(
    new THREE.SphereGeometry(0.273, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.54), pelo
  );
  casco.scale.set(1.01, 1.09, 1);
  casco.position.set(0, 0.016, -0.014);
  cabeza.add(casco);

  [
    [0, 0.218, 0.09, 0.125], [-0.148, 0.185, 0.015, 0.108], [0.148, 0.185, 0.015, 0.108],
    [0, 0.2, -0.145, 0.115], [0.015, 0.258, -0.03, 0.112]
  ].forEach(function (b) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(b[3], 24, 18), pelo);
    m.position.set(b[0], b[1], b[2]);
    cabeza.add(m);
  });

  // Barba. Antes era una esfera ancha y leia como un barbijo cruzado en la
  // cara. Ahora es la masa del menton mas dos lineas de mandibula que suben a
  // las patillas: eso deja los pomulos a la vista y se lee como barba.
  const masa = new THREE.Mesh(new THREE.SphereGeometry(0.168, 30, 24), pelo);
  masa.scale.set(1.08, 0.76, 0.88);
  masa.position.set(0, -0.138, 0.062);
  cabeza.add(masa);

  [-1, 1].forEach(function (s) {
    const mandibula = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.14, 6, 16), pelo);
    mandibula.position.set(s * 0.158, -0.098, 0.052);
    mandibula.rotation.set(0.3, 0, s * 0.95);
    mandibula.scale.z = 0.82;
    cabeza.add(mandibula);

    const patilla = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.1, 5, 14), pelo);
    patilla.position.set(s * 0.226, 0.012, -0.012);
    patilla.scale.z = 0.76;
    cabeza.add(patilla);
  });

  const bigote = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 16), pelo);
  bigote.scale.set(1.18, 0.4, 0.58);
  bigote.position.set(0, -0.082, 0.229);
  cabeza.add(bigote);

  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.047, 22, 18), piel);
  nariz.scale.set(0.96, 0.9, 1.05);
  nariz.position.set(0, -0.014, 0.256);
  cabeza.add(nariz);

  const iris = new THREE.MeshStandardMaterial({ color: 0x1a120d, roughness: 0.18 });
  const chispa = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1, 1].forEach(function (s) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.043, 22, 18), iris);
    ojo.scale.set(0.86, 1.06, 0.6);
    ojo.position.set(s * 0.098, 0.05, 0.233);
    cabeza.add(ojo);

    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), chispa);
    luz.position.set(s * 0.086, 0.072, 0.254);
    cabeza.add(luz);

    const ceja = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.068, 5, 12), pelo);
    ceja.rotation.z = Math.PI / 2 + s * 0.16;
    ceja.position.set(s * 0.1, 0.128, 0.227);
    cabeza.add(ceja);

    const oreja = new THREE.Mesh(new THREE.SphereGeometry(0.054, 18, 14), piel);
    oreja.scale.set(0.42, 1.05, 0.82);
    oreja.position.set(s * 0.262, -0.014, -0.004);
    cabeza.add(oreja);
  });

  /* ---- anteojos ---- */
  const gafas = new THREE.Group();
  [-1, 1].forEach(function (s) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.0082, 10, 32), metal);
    aro.position.set(s * 0.1, 0.05, 0.235);
    aro.scale.z = 0.6;
    gafas.add(aro);

    const cristal = new THREE.Mesh(
      new THREE.CircleGeometry(0.069, 26),
      new THREE.MeshStandardMaterial({
        color: 0xa9c0d4, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.13
      })
    );
    cristal.position.set(s * 0.1, 0.05, 0.239);
    gafas.add(cristal);

    const patilla = new THREE.Mesh(new THREE.CapsuleGeometry(0.0072, 0.14, 4, 10), metal);
    patilla.rotation.set(Math.PI / 2, s * 0.55, 0);
    patilla.position.set(s * 0.196, 0.054, 0.152);
    gafas.add(patilla);
  });
  const puente = new THREE.Mesh(new THREE.CapsuleGeometry(0.0062, 0.04, 4, 10), metal);
  puente.rotation.z = Math.PI / 2;
  puente.position.set(0, 0.06, 0.237);
  gafas.add(puente);
  cabeza.add(gafas);

  persona.add(cabeza);

  /* ---- brazos ---- */
  // Una manga por color, y el puno como un anillo apoyado, no flotando: antes
  // el toro quedaba suelto en el aire cuando el brazo se estiraba.
  function brazo(lado, colorManga) {
    const L1 = 0.185, L2 = 0.19;
    const hombro = new THREE.Group();
    hombro.position.set(lado * 0.192, 0.73, 0);

    const bola = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 16), colorManga);
    hombro.add(bola);

    const superior = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, L1 - 0.06, 6, 18), colorManga);
    superior.position.y = -L1 / 2;
    hombro.add(superior);

    const codo = new THREE.Group();
    codo.position.y = -L1;
    hombro.add(codo);

    const antebrazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, L2 - 0.06, 6, 18), colorManga);
    antebrazo.position.y = -L2 / 2;
    codo.add(antebrazo);

    const puno = new THREE.Mesh(new THREE.CylinderGeometry(0.069, 0.066, 0.045, 20), negro);
    puno.position.y = -L2 + 0.012;
    codo.add(puno);

    const mano = new THREE.Group();
    mano.position.y = -L2 - 0.05;
    codo.add(mano);

    const palma = new THREE.Mesh(new THREE.SphereGeometry(0.086, 22, 18), piel);
    palma.scale.set(1, 0.9, 0.82);
    mano.add(palma);

    const pulgar = new THREE.Mesh(new THREE.CapsuleGeometry(0.027, 0.045, 4, 12), piel);
    pulgar.position.set(lado * -0.06, 0.026, 0.034);
    pulgar.rotation.set(0.5, 0, lado * 1.1);
    mano.add(pulgar);

    return { hombro: hombro, codo: codo, mano: mano, largos: [L1, L2 + 0.05] };
  }

  const izq = brazo(-1, magenta);
  const der = brazo(1, violeta);
  persona.add(izq.hombro, der.hombro);

  apuntarBrazo(izq, MANO_SOSTIENE, GUIA_IZQ);
  apuntarBrazo(der, new THREE.Vector3(0.335, 0.4, 0.075), new THREE.Vector3(1, -0.75, -0.45));

  persona.traverse(function (o) {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return { persona: persona, torso: torso, cabeza: cabeza, izq: izq, der: der };
}

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

  // La banda fija apoya sobre el canto de arriba de la pizarra. Hay que contar
  // el bisel: cada pieza mide su alto nominal mas dos biseles.
  const banda = new THREE.Mesh(placa(ANCHO_CL, ALTO_BANDA, 0.012, 0.03), canto);
  banda.position.y = ALTO_BANDA / 2 + BISEL;
  claqueta.add(banda);

  const bandaCara = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL, ALTO_BANDA + BISEL), rayas);
  bandaCara.position.set(0, banda.position.y, caraZ(0.03));
  claqueta.add(bandaCara);

  // El palo apoya sobre la banda, sin hueco: el tope de la banda es su centro
  // mas medio alto mas un bisel.
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

  claqueta.traverse(function (o) {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  // Alto real de punta a punta, biseles incluidos: lo que hay que usar para
  // encuadrarla sin que se salga por arriba.
  const alto = ALTO_CL + 2 * BISEL + ALTO_BANDA + 2 * BISEL + ALTO_PALO + 2 * BISEL;
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
  renderer.toneMappingExposure = 1.12;
  // La sombra propia es lo que hunde los pliegues y despega los brazos del
  // cuerpo. Sin esto, por mas redondo que sea, queda plano.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(32, 1, 0.05, 40);

  escena.add(new THREE.HemisphereLight(0x93a6c4, 0x241f1b, 1.35));

  const clave = new THREE.DirectionalLight(0xfff3e2, 2.5);
  clave.position.set(-2.1, 3.2, 2.9);
  clave.castShadow = true;
  clave.shadow.mapSize.set(1024, 1024);
  clave.shadow.radius = 4;
  clave.shadow.bias = -0.0012;
  const sc = clave.shadow.camera;
  sc.left = -1.8; sc.right = 1.8; sc.top = 2.4; sc.bottom = -0.6; sc.near = 0.5; sc.far = 10;
  sc.updateProjectionMatrix();
  escena.add(clave);

  const relleno = new THREE.DirectionalLight(0x9db9d8, 0.8);
  relleno.position.set(2.6, 1.1, 1.8);
  escena.add(relleno);

  const contra = new THREE.DirectionalLight(0xc6daf5, 1.9);
  contra.position.set(1.4, 2.1, -2.8);
  escena.add(contra);

  const cuerpo = armarPersona();
  const texDatos = pizarraDatos();
  const habilidades = pizarraHabilidades();
  const cl = armarClaqueta(texDatos);
  const claqueta = cl.claqueta, bisagra = cl.bisagra;
  escena.add(cuerpo.persona);

  const PERSONA_X = 0.44;
  cuerpo.persona.position.set(PERSONA_X, -0.62, 0);
  cuerpo.persona.rotation.y = -0.24;

  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(0.37, 0.008, 6, 44),
    new THREE.MeshBasicMaterial({ color: 0x7fe07f, transparent: true, opacity: 0 })
  );
  escena.add(aro);

  /* ---- encuadre ---- */
  const MIRA = new THREE.Vector3(0.02, 0.12, 0);
  let angosto = false;

  function medir() {
    const w = ancho(), h = alto();
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const r = w / h;
    angosto = r < 1;
    camara.position.set(0.05, 0.3, angosto ? 3.7 : 2.95 + (1.5 - Math.min(r, 1.5)) * 1.3);
    camara.lookAt(MIRA);
    camara.updateProjectionMatrix();
    if (abierta && !transicion) {
      const f = encuadreAbierto();
      claqueta.position.copy(f.pos);
      claqueta.scale.setScalar(f.escala);
    }
  }

  /* ---- donde va la claqueta ---- */
  escena.updateMatrixWorld(true);

  const soporte = new THREE.Group();
  cuerpo.izq.mano.add(soporte);
  soporte.quaternion.copy(cuerpo.izq.mano.getWorldQuaternion(new THREE.Quaternion())).invert();

  const EN_PALMA = new THREE.Vector3(0.015, ALTO_CL + 0.07, 0.055);
  const GIRO_PALMA = new THREE.Euler(-0.12, 0.24, 0.06);
  const FUERA = new THREE.Vector3(-3.6, 2, -0.6);
  const SIN_GIRO = new THREE.Euler(0, 0, 0);

  const aux = new THREE.Vector3();

  function destinoMano() {
    soporte.updateWorldMatrix(true, false);
    return aux.copy(EN_PALMA).applyMatrix4(soporte.matrixWorld);
  }

  function colgarDeLaMano() {
    soporte.add(claqueta);
    claqueta.position.copy(EN_PALMA);
    claqueta.rotation.copy(GIRO_PALMA);
    claqueta.scale.set(1, 1, 1);
  }

  // Abierta ocupa casi el cuadro entero. La escala se calcula contra lo que se
  // ve a esa distancia y con el alto REAL, biseles incluidos.
  const Z_FRENTE = 1.35;

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

  if (quieto) {
    colgarDeLaMano();
    claqueta.visible = true;
  } else {
    escena.add(claqueta);
    claqueta.position.copy(FUERA);
    claqueta.rotation.copy(GIRO_PALMA);
    claqueta.visible = false;
  }

  const MANO_IZQ = MANO_SOSTIENE.clone();

  let vivo = true;
  let corriendo = false;
  let t = 0;
  let abierta = false;
  let faseEntrada = quieto ? 1 : -1;
  let giroLibre = new THREE.Vector3(0, 0, 0);
  let clap = 0;
  let escrito = false;
  let llenado = 0;
  let transicion = null;
  let golpe = 0;
  let vuelo = 0;

  const reloj = new THREE.Clock();
  const observador = new ResizeObserver(medir);
  observador.observe(lienzoGL);
  medir();

  function bucle() {
    if (!vivo || !corriendo) return;
    requestAnimationFrame(bucle);
    // dt solo mueve la respiracion, que no pasa nada si se atrasa; todo lo que
    // tiene que terminar en un momento dado va contra performance.now().
    t += Math.min(reloj.getDelta(), 0.05);

    if (vuelo) {
      faseEntrada = Math.min(1, (performance.now() - vuelo) / 1600);
      const k = frenar(faseEntrada);
      claqueta.position.lerpVectors(FUERA, destinoMano(), k);
      claqueta.position.y += Math.sin(faseEntrada * Math.PI) * 0.5;
      const resto = 1 - k;
      claqueta.rotation.set(
        GIRO_PALMA.x + resto * giroLibre.x,
        GIRO_PALMA.y + resto * giroLibre.y,
        GIRO_PALMA.z + resto * giroLibre.z
      );
      if (faseEntrada >= 1) { vuelo = 0; colgarDeLaMano(); golpe = performance.now(); }
    }

    if (golpe) {
      const g = (performance.now() - golpe) / 420;
      if (g >= 1) golpe = 0;
      MANO_IZQ.copy(MANO_SOSTIENE);
      MANO_IZQ.y -= Math.sin(Math.min(g, 1) * Math.PI) * 0.1;
      apuntarBrazo(cuerpo.izq, MANO_IZQ, GUIA_IZQ);
    }

    if (!quieto) {
      const r = Math.sin(t * 1.3);
      cuerpo.torso.scale.set(1 + r * 0.012, 1 - r * 0.009, 1 + r * 0.012);
      cuerpo.cabeza.position.y = 1.15 + r * 0.009;
      cuerpo.cabeza.rotation.set(
        Math.sin(t * 0.58) * 0.035, Math.sin(t * 0.42) * 0.085, Math.sin(t * 0.5) * 0.025
      );
    }

    if (!abierta && faseEntrada >= 1 && !transicion) {
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
      const fuera = transicion.abriendo ? k : 1 - k;
      cuerpo.persona.position.x = PERSONA_X + fuera * (angosto ? 0.34 : 0.95);
      cuerpo.persona.position.z = -fuera * 1.35;
      if (transicion.k >= 1) {
        if (transicion.alaMano) colgarDeLaMano();
        transicion = null;
      }
    }

    // El palo: sube, baja de golpe y queda vibrando un instante. En el golpe
    // la pizarra se reescribe: es el momento en que la claqueta "dice" algo.
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

    // Las barras se llenan de a una. Solo se repintan los segmentos, no la
    // pizarra entera.
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
    if (faseEntrada >= 0) return false;
    claqueta.visible = true;
    faseEntrada = 0;
    vuelo = performance.now();
    giroLibre = new THREE.Vector3(Math.PI * 2.4, Math.PI * 3.6, Math.PI * 1.8);
    arrancar();
    return true;
  }

  function abrir() {
    if (abierta) return;
    abierta = true;
    clap = performance.now();
    escena.attach(claqueta);
    const fin = encuadreAbierto();
    transicion = {
      k: 0, inicio: performance.now(), dur: 900, abriendo: true, alaMano: false,
      de: claqueta.position.clone(), a: fin.pos,
      giroDe: claqueta.rotation.clone(), giroA: SIN_GIRO,
      escalaDe: claqueta.scale.x, escalaA: fin.escala
    };
    arrancar();
  }

  function cerrar() {
    if (!abierta) return;
    abierta = false;
    // Al volver a la mano, la pizarra vuelve a mostrar los datos de rodaje.
    escrito = false;
    llenado = 0;
    cl.cara.map = texDatos;
    cl.cara.needsUpdate = true;
    habilidades.dibujar(0);
    transicion = {
      k: 0, inicio: performance.now(), dur: 720, abriendo: false, alaMano: true,
      de: claqueta.position.clone(), a: destinoMano().clone(),
      giroDe: claqueta.rotation.clone(), giroA: GIRO_PALMA,
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
