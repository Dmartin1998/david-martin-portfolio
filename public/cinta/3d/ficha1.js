// Ficha 01 en 3D: la claqueta entra girando desde fuera de cuadro, cae en la
// mano, y al tocarla se abre casi a pantalla completa para dar paso a los
// niveles.
//
// El personaje esta en proporciones de muneco: cabeza enorme, cuerpo chico,
// todo capsulas y esferas. El primer intento usaba proporciones reales y por
// eso parecia un maniqui de vidriera. Lo que da el aire de personaje 3D no es
// la cantidad de poligonos sino la cabeza grande, las formas sin un solo canto
// vivo, el material mate y la luz blanda con sombra propia.
//
// Es geometria generada: cero bytes de descarga, ni un modelo. Lo que
// identifica son la campera de bloques de color, los anteojos redondos y la
// barba.
//
// Aca no hay pase de post-proceso: la pagina entera ya vive dentro del tubo
// (el marco abombado, el barrido y la mascara de ranuras van encima de todo),
// asi que el lienzo se dibuja transparente y hereda el tratamiento del sitio.

import * as THREE from './three.module.min.js';

const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;
// Arranca rapido y frena: sirve para lo que entra volando y tiene que posarse.
const frenar = (t) => 1 - Math.pow(1 - t, 3);
const tope = (v, a, b) => Math.max(a, Math.min(b, v));

const PIEL = 0xe8b08c;
const PELO = 0x2b1f18;

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

/* ------------------------------------------------------------- texturas -- */

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

// La campera: bloques diagonales anchos, como los paneles cosidos de una
// rompeviento de los noventa.
function texturaCampera() {
  const [c, g] = lienzo(512, 512);
  // Mas negro que color y bandas anchas: la campera tiene que leerse como una
  // prenda, no como una mancha. Los tres colores aparecen de a uno.
  const COLORES = ['#1a1a20', '#1a6f79', '#1a1a20', '#8e2560', '#1a1a20', '#4e3192'];
  const ANCHOS = [96, 168, 72, 150, 88, 176];
  g.fillStyle = '#1b1b22';
  g.fillRect(0, 0, 512, 512);
  g.save();
  g.translate(256, 256);
  g.rotate(-0.46);
  g.translate(-640, -640);
  let x = 0;
  for (let i = 0; x < 1280; i++) {
    g.fillStyle = COLORES[i % COLORES.length];
    const w = ANCHOS[i % ANCHOS.length];
    g.fillRect(x, 0, w, 1280);
    x += w;
  }
  g.restore();
  // Arrugas de nylon, apenas.
  g.globalAlpha = 0.05;
  for (let i = 0; i < 110; i++) {
    g.strokeStyle = i % 2 ? '#ffffff' : '#000000';
    g.lineWidth = Math.random() * 2.4 + 0.6;
    g.beginPath();
    const x0 = Math.random() * 512, y0 = Math.random() * 512;
    g.moveTo(x0, y0);
    g.lineTo(x0 + (Math.random() - 0.5) * 90, y0 + (Math.random() - 0.5) * 90);
    g.stroke();
  }
  g.globalAlpha = 1;
  return aTextura(c);
}

// La cara de la pizarra. Es lo que mas se mira cuando se abre, asi que lleva
// la grilla entera de una claqueta de verdad, tiza con pulso tembloroso,
// rayones y polvo.
function texturaPizarra() {
  const W = 1200, H = 960;
  const [c, g] = lienzo(W, H);

  g.fillStyle = '#16171c';
  g.fillRect(0, 0, W, H);

  // Veta: la pizarra es acrilica y tiene marcas de uso.
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = 'rgba(255,255,255,' + (Math.random() * 0.016) + ')';
    g.fillRect(Math.random() * W, Math.random() * H, Math.random() * 90 + 10, 1);
  }

  const TIZA = '#eceadf';
  const APAGADO = '#8e8a7e';

  // Tiza: el trazo nunca es una linea perfecta. Tres pasadas con un temblor
  // minimo, que es lo que separa un rotulo escrito de uno impreso.
  function raya(x0, y0, x1, y1, grosor, color) {
    g.strokeStyle = color || TIZA;
    g.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      g.globalAlpha = 0.34 + k * 0.1;
      g.lineWidth = grosor * (1 - k * 0.14);
      g.beginPath();
      const pasos = 7;
      for (let i = 0; i <= pasos; i++) {
        const t = i / pasos;
        const x = mezcla(x0, x1, t) + (Math.random() - 0.5) * 2.4;
        const y = mezcla(y0, y1, t) + (Math.random() - 0.5) * 2.4;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }

  function texto(s, x, y, tam, color, alinear) {
    g.font = '700 ' + tam + 'px ui-monospace, "Courier New", monospace';
    g.textAlign = alinear || 'left';
    g.textBaseline = 'middle';
    g.save();
    g.translate(x, y);
    g.rotate((Math.random() - 0.5) * 0.012);
    g.globalAlpha = 0.28;
    g.fillStyle = color || TIZA;
    g.fillText(s, 2, 2);
    g.globalAlpha = 1;
    g.fillText(s, 0, 0);
    g.restore();
  }

  const M = 44;
  raya(M, M, W - M, M, 7);
  raya(W - M, M, W - M, H - M, 7);
  raya(W - M, H - M, M, H - M, 7);
  raya(M, H - M, M, M, 7);

  const F1 = 220, F2 = 396, F3 = 640, F4 = 800;
  raya(M, F1, W - M, F1, 4, APAGADO);
  raya(M, F2, W - M, F2, 4, APAGADO);
  raya(M, F3, W - M, F3, 4, APAGADO);
  raya(M, F4, W - M, F4, 4, APAGADO);

  texto('PROD.', M + 36, 134, 52, APAGADO);
  texto('ISCAA', W - M - 36, 134, 66, TIZA, 'right');

  texto('DIR.', M + 36, 310, 52, APAGADO);
  texto('D. MARTÍN', W - M - 36, 310, 66, TIZA, 'right');

  // Tres cajas: escena, toma, rollo.
  const c1 = M + (W - 2 * M) / 3, c2 = M + ((W - 2 * M) / 3) * 2;
  raya(c1, F2, c1, F3, 4, APAGADO);
  raya(c2, F2, c2, F3, 4, APAGADO);

  const CAJAS = [['ESCENA', '01', M, c1], ['TOMA', '01', c1, c2], ['ROLLO', 'A', c2, W - M]];
  CAJAS.forEach(function (b) {
    const cx = (b[2] + b[3]) / 2;
    texto(b[0], cx, 460, 40, APAGADO, 'center');
    texto(b[1], cx, 566, 110, TIZA, 'center');
  });

  texto('FECHA', M + 36, 722, 52, APAGADO);
  texto('2020', W - M - 36, 722, 66, TIZA, 'right');

  texto('REALIZACIÓN INTEGRAL DE CINE, TV Y VIDEO', W / 2, 876, 40, APAGADO, 'center');

  // Polvo de tiza y rayones, para que no parezca recien comprada.
  g.globalAlpha = 0.05;
  for (let i = 0; i < 24; i++) {
    g.strokeStyle = TIZA;
    g.lineWidth = Math.random() * 2 + 0.5;
    g.beginPath();
    const x0 = Math.random() * W, y0 = Math.random() * H;
    g.moveTo(x0, y0);
    g.lineTo(x0 + (Math.random() - 0.5) * 220, y0 + (Math.random() - 0.5) * 60);
    g.stroke();
  }
  for (let i = 0; i < 60; i++) {
    g.fillStyle = TIZA;
    g.globalAlpha = Math.random() * 0.07;
    g.beginPath();
    g.arc(Math.random() * W, Math.random() * H, Math.random() * 26 + 4, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;

  return aTextura(c);
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
// Rectangulo con las puntas redondeadas y el canto biselado. Un canto vivo
// delata la caja, y la claqueta abierta ocupa casi el cuadro entero.

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
    depth: fondo, bevelEnabled: true, bevelThickness: 0.006,
    bevelSize: 0.006, bevelSegments: 3, curveSegments: 8
  });
  g.translate(0, 0, -fondo / 2);
  return g;
}

/* ---------------------------------------------------- cinematica inversa -- */
// Dos huesos: se le dice donde va la mano y acomoda hombro y antebrazo. El
// vector guia decide para que lado sale el codo, que es lo unico que la
// geometria por si sola no puede decidir.

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

function armarPersona(texCampera) {
  const persona = new THREE.Group();

  const piel = mate(PIEL, 0.74);
  const pelo = mate(PELO, 0.88);
  const nylon = new THREE.MeshStandardMaterial({ map: texCampera, roughness: 0.46, metalness: 0.04 });
  const nylonDoble = nylon.clone();
  nylonDoble.side = THREE.DoubleSide;
  const algodon = mate(0xe4e1d6, 0.92);
  const tela = mate(0x2a2b33, 0.9);
  const cuero = mate(0x241c17, 0.6);
  const metal = new THREE.MeshStandardMaterial({ color: 0xcdbb9a, roughness: 0.26, metalness: 0.92 });
  const negro = mate(0x15110f, 0.42);

  /* ---- piernas y zapatillas ---- */
  [-1, 1].forEach(function (s) {
    const pierna = new THREE.Mesh(new THREE.CapsuleGeometry(0.093, 0.2, 6, 20), tela);
    pierna.position.set(s * 0.125, 0.3, 0);
    persona.add(pierna);

    const zapa = new THREE.Mesh(new THREE.CapsuleGeometry(0.088, 0.1, 6, 20), negro);
    zapa.rotation.x = Math.PI / 2;
    zapa.scale.set(1, 1, 0.78);
    zapa.position.set(s * 0.125, 0.082, 0.045);
    persona.add(zapa);

    const suela = new THREE.Mesh(new THREE.CapsuleGeometry(0.086, 0.1, 5, 18), algodon);
    suela.rotation.x = Math.PI / 2;
    suela.scale.set(1, 1, 0.42);
    suela.position.set(s * 0.125, 0.038, 0.045);
    persona.add(suela);
  });

  /* ---- tronco ---- */
  const torso = new THREE.Group();

  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.198, 0.2, 8, 28), nylon);
  cuerpo.scale.z = 0.8;
  cuerpo.position.y = 0.63;
  torso.add(cuerpo);

  // La remera asoma en el medio: una tajada de capsula apenas mas chica,
  // adelantada lo justo para que se vea entre las solapas.
  const remera = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.14, 6, 20), algodon);
  remera.scale.set(1, 1, 0.42);
  remera.position.set(0, 0.64, 0.14);
  torso.add(remera);

  [-1, 1].forEach(function (s) {
    const solapa = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.21, 5, 16), nylon);
    solapa.scale.set(1, 1, 0.46);
    solapa.position.set(s * 0.098, 0.655, 0.148);
    solapa.rotation.z = s * 0.26;
    torso.add(solapa);
  });

  // Cuello alto de rompeviento.
  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.148, 0.1, 24, 1, true), nylonDoble);
  cuello.scale.z = 0.86;
  cuello.position.y = 0.79;
  torso.add(cuello);

  const gola = new THREE.Mesh(new THREE.TorusGeometry(0.112, 0.021, 8, 26), nylon);
  gola.rotation.x = Math.PI / 2;
  gola.scale.z = 0.86;
  gola.position.y = 0.835;
  torso.add(gola);

  persona.add(torso);

  /* ---- cabeza ---- */
  // Grande: es la mitad del asunto en este estilo.
  const cabeza = new THREE.Group();
  cabeza.position.y = 1.15;

  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.265, 40, 32), piel);
  craneo.scale.set(1, 1.04, 0.95);
  cabeza.add(craneo);

  const pescuezo = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.07, 5, 16), piel);
  pescuezo.position.y = -0.24;
  cabeza.add(pescuezo);

  // Pelo: un casquete mas varias bochas encima. Las bochas son lo que lo saca
  // de "pelota pintada de marron" y lo convierte en pelo.
  const casco = new THREE.Mesh(
    new THREE.SphereGeometry(0.272, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.56), pelo
  );
  casco.scale.set(1.01, 1.08, 0.99);
  casco.position.set(0, 0.012, -0.012);
  cabeza.add(casco);

  const BOCHAS = [
    [0, 0.235, 0.075, 0.1], [-0.115, 0.215, 0.055, 0.085], [0.115, 0.215, 0.055, 0.085],
    [-0.062, 0.2, 0.16, 0.078], [0.07, 0.195, 0.158, 0.075], [0, 0.145, 0.215, 0.066],
    [-0.19, 0.145, 0.045, 0.072], [0.19, 0.145, 0.045, 0.072],
    [-0.145, 0.2, -0.13, 0.08], [0.145, 0.2, -0.13, 0.08], [0, 0.205, -0.19, 0.082]
  ];
  BOCHAS.forEach(function (b) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(b[3], 20, 16), pelo);
    m.position.set(b[0], b[1], b[2]);
    cabeza.add(m);
  });

  // Barba: una masa redonda sobre el menton y la mandibula. En este estilo la
  // barba es una forma, no una textura.
  const barba = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 26), pelo);
  barba.scale.set(1.02, 0.82, 0.9);
  barba.position.set(0, -0.122, 0.034);
  cabeza.add(barba);

  const menton = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), pelo);
  menton.scale.set(1.1, 0.92, 1);
  menton.position.set(0, -0.172, 0.108);
  cabeza.add(menton);

  [-1, 1].forEach(function (s) {
    const patilla = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.1, 5, 14), pelo);
    patilla.position.set(s * 0.218, -0.012, 0);
    patilla.rotation.z = s * 0.12;
    patilla.scale.z = 0.8;
    cabeza.add(patilla);
  });

  const bigote = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 16), pelo);
  bigote.scale.set(1.15, 0.4, 0.58);
  bigote.position.set(0, -0.085, 0.228);
  cabeza.add(bigote);

  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.047, 22, 18), piel);
  nariz.scale.set(0.96, 0.9, 1.05);
  nariz.position.set(0, -0.012, 0.255);
  cabeza.add(nariz);

  // Ojos: ovalos oscuros con un brillo, como en la referencia.
  const iris = new THREE.MeshStandardMaterial({ color: 0x1a120d, roughness: 0.18, metalness: 0 });
  const chispa = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-1, 1].forEach(function (s) {
    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.044, 22, 18), iris);
    ojo.scale.set(0.86, 1.08, 0.6);
    ojo.position.set(s * 0.098, 0.042, 0.232);
    cabeza.add(ojo);

    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), chispa);
    luz.position.set(s * 0.085, 0.066, 0.255);
    cabeza.add(luz);

    const ceja = new THREE.Mesh(new THREE.CapsuleGeometry(0.0165, 0.07, 5, 12), pelo);
    ceja.rotation.z = Math.PI / 2 + s * 0.17;
    ceja.position.set(s * 0.1, 0.123, 0.226);
    cabeza.add(ceja);

    const oreja = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 14), piel);
    oreja.scale.set(0.42, 1.05, 0.82);
    oreja.position.set(s * 0.262, -0.012, -0.004);
    cabeza.add(oreja);
  });

  /* ---- anteojos ---- */
  const gafas = new THREE.Group();
  [-1, 1].forEach(function (s) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.073, 0.0085, 10, 32), metal);
    aro.position.set(s * 0.1, 0.042, 0.234);
    aro.scale.z = 0.6;
    gafas.add(aro);

    const cristal = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 26),
      new THREE.MeshStandardMaterial({
        color: 0xa9c0d4, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.15
      })
    );
    cristal.position.set(s * 0.1, 0.042, 0.238);
    gafas.add(cristal);

    const patilla = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.14, 4, 10), metal);
    patilla.rotation.set(Math.PI / 2, s * 0.55, 0);
    patilla.position.set(s * 0.195, 0.046, 0.15);
    gafas.add(patilla);
  });
  const puente = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.04, 4, 10), metal);
  puente.rotation.z = Math.PI / 2;
  puente.position.set(0, 0.052, 0.236);
  gafas.add(puente);
  cabeza.add(gafas);

  persona.add(cabeza);

  /* ---- brazos ---- */
  // Cortos y gruesos, con la mano como una bocha: en este estilo los dedos
  // sueltos ensucian la silueta.
  function brazo(lado) {
    const L1 = 0.185, L2 = 0.19;
    const hombro = new THREE.Group();
    hombro.position.set(lado * 0.192, 0.73, 0);

    const superior = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, L1 - 0.06, 6, 18), nylon);
    superior.position.y = -L1 / 2;
    hombro.add(superior);

    const codo = new THREE.Group();
    codo.position.y = -L1;
    hombro.add(codo);

    const antebrazo = new THREE.Mesh(new THREE.CapsuleGeometry(0.066, L2 - 0.06, 6, 18), nylon);
    antebrazo.position.y = -L2 / 2;
    codo.add(antebrazo);

    const puno = new THREE.Mesh(new THREE.TorusGeometry(0.063, 0.017, 8, 20), nylon);
    puno.rotation.x = Math.PI / 2;
    puno.position.y = -L2 + 0.015;
    codo.add(puno);

    const mano = new THREE.Group();
    mano.position.y = -L2 - 0.055;
    codo.add(mano);

    const palma = new THREE.Mesh(new THREE.SphereGeometry(0.088, 22, 18), piel);
    palma.scale.set(1, 0.9, 0.82);
    mano.add(palma);

    const pulgar = new THREE.Mesh(new THREE.CapsuleGeometry(0.027, 0.045, 4, 12), piel);
    pulgar.position.set(lado * -0.062, 0.026, 0.034);
    pulgar.rotation.set(0.5, 0, lado * 1.1);
    mano.add(pulgar);

    return { hombro: hombro, codo: codo, mano: mano, largos: [L1, L2 + 0.055] };
  }

  const izq = brazo(-1);
  const der = brazo(1);
  persona.add(izq.hombro, der.hombro);

  apuntarBrazo(izq, MANO_SOSTIENE, GUIA_IZQ);
  apuntarBrazo(der, new THREE.Vector3(0.3, 0.56, 0.08), new THREE.Vector3(1, -0.35, -0.6));

  // Reloj: en la referencia, los detalles chicos son los que dan vida.
  const reloj = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.016, 20), negro);
  reloj.rotation.z = Math.PI / 2;
  reloj.position.y = -der.largos[1] + 0.085;
  der.codo.add(reloj);

  const correa = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 20), cuero);
  correa.rotation.x = Math.PI / 2;
  correa.position.y = -der.largos[1] + 0.085;
  der.codo.add(correa);

  persona.traverse(function (o) {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });

  return { persona: persona, torso: torso, cabeza: cabeza, izq: izq, der: der };
}

/* ------------------------------------------------------------- claqueta -- */

const ANCHO_CL = 0.56;
const ALTO_CL = 0.445;
const ALTO_BANDA = 0.062;
const ALTO_PALO = 0.072;

function armarClaqueta() {
  const claqueta = new THREE.Group();

  const marco = mate(0x24262c, 0.52);
  const cara = new THREE.MeshStandardMaterial({ map: texturaPizarra(), roughness: 0.46 });
  const rayas = new THREE.MeshStandardMaterial({ map: texturaPalo(), roughness: 0.5 });
  const canto = mate(0x1a1c21, 0.6);
  const tornillo = new THREE.MeshStandardMaterial({ color: 0xb9ac92, roughness: 0.3, metalness: 0.9 });

  const pizarra = new THREE.Mesh(placa(ANCHO_CL, ALTO_CL, 0.022, 0.026), marco);
  pizarra.position.y = -ALTO_CL / 2;
  claqueta.add(pizarra);

  const frente = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL - 0.022, ALTO_CL - 0.022), cara);
  frente.position.set(0, -ALTO_CL / 2, 0.0225);
  claqueta.add(frente);

  // Banda fija sobre el canto de arriba, y el palo encima con su bisagra.
  // Apilados y sin pisarse: si comparten altura y profundidad, los dos rayados
  // se pelean el fotograma.
  const banda = new THREE.Mesh(placa(ANCHO_CL, ALTO_BANDA, 0.012, 0.03), canto);
  banda.position.y = ALTO_BANDA / 2;
  claqueta.add(banda);

  const bandaCara = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL - 0.014, ALTO_BANDA - 0.012), rayas);
  bandaCara.position.set(0, ALTO_BANDA / 2, 0.0245);
  claqueta.add(bandaCara);

  const bisagra = new THREE.Group();
  bisagra.position.set(-ANCHO_CL / 2 + 0.02, ALTO_BANDA + 0.004, 0);

  const palo = new THREE.Mesh(placa(ANCHO_CL, ALTO_PALO, 0.014, 0.034), canto);
  palo.position.set(ANCHO_CL / 2 - 0.02, ALTO_PALO / 2, 0);
  bisagra.add(palo);

  const paloCara = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO_CL - 0.016, ALTO_PALO - 0.014), rayas);
  paloCara.position.set(ANCHO_CL / 2 - 0.02, ALTO_PALO / 2, 0.0265);
  bisagra.add(paloCara);

  // El eje de la bisagra, con sus dos tornillos.
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

  return { claqueta: claqueta, bisagra: bisagra };
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

  // Contraluz: despega la silueta del fondo negro de la pagina.
  const contra = new THREE.DirectionalLight(0xc6daf5, 1.9);
  contra.position.set(1.4, 2.1, -2.8);
  escena.add(contra);

  const cuerpo = armarPersona(texturaCampera());
  const { claqueta, bisagra } = armarClaqueta();
  escena.add(cuerpo.persona);

  const PERSONA_X = 0.44;
  cuerpo.persona.position.set(PERSONA_X, -0.62, 0);
  cuerpo.persona.rotation.y = -0.24;

  // El anillo que late alrededor de la claqueta mientras espera el toque.
  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.008, 6, 44),
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

  // Un soporte colgado de la mano pero alineado con el mundo: sin esto la
  // claqueta hereda el giro del antebrazo y queda colgando de costado.
  const soporte = new THREE.Group();
  cuerpo.izq.mano.add(soporte);
  soporte.quaternion.copy(cuerpo.izq.mano.getWorldQuaternion(new THREE.Quaternion())).invert();

  // El alto de la pizarra mas un dedo de aire: el borde de abajo apoya sobre
  // la palma en vez de taparla entera.
  const EN_PALMA = new THREE.Vector3(0.015, ALTO_CL + 0.055, 0.055);
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

  // Abierta ocupa casi el cuadro entero. La escala se calcula contra lo que
  // se ve a esa distancia, no a ojo, y como la pizarra cuelga por debajo del
  // origen del grupo hay que compensar ese desfasaje.
  const Z_FRENTE = 1.35;
  const ALTO_TOTAL = ALTO_CL + ALTO_BANDA + ALTO_PALO;
  const DESFASE = -(ALTO_CL / 2) + (ALTO_BANDA + ALTO_PALO) / 2;

  function encuadreAbierto() {
    const d = camara.position.z - Z_FRENTE;
    const altoVisible = 2 * d * Math.tan((camara.fov * Math.PI) / 360);
    const anchoVisible = altoVisible * camara.aspect;
    const escala = Math.min(
      (altoVisible * 0.92) / ALTO_TOTAL,
      (anchoVisible * 0.95) / ANCHO_CL
    );
    // Centro del cuadro a esa profundidad.
    const t = (camara.position.z - Z_FRENTE) / camara.position.z;
    return {
      pos: new THREE.Vector3(
        camara.position.x + (MIRA.x - camara.position.x) * t,
        camara.position.y + (MIRA.y - camara.position.y) * t - DESFASE * escala,
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
    // dt solo mueve la respiracion, que no pasa nada si se atrasa; todo lo
    // que tiene que terminar en un momento dado va contra performance.now().
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

    // El peso hunde la mano y el brazo la recupera.
    if (golpe) {
      const g = (performance.now() - golpe) / 420;
      if (g >= 1) { golpe = 0; }
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
      // El personaje se corre y se va al fondo cuando la pizarra toma el cuadro.
      const fuera = transicion.abriendo ? k : 1 - k;
      cuerpo.persona.position.x = PERSONA_X + fuera * (angosto ? 0.3 : 0.9);
      cuerpo.persona.position.z = -fuera * 1.3;
      if (transicion.k >= 1) {
        if (transicion.alaMano) colgarDeLaMano();
        transicion = null;
      }
    }

    // El palo: sube, baja de golpe y queda vibrando un instante.
    if (clap) {
      const k = Math.min(1, (performance.now() - clap) / 340);
      let a;
      if (k < 0.32) a = (k / 0.32) * 0.62;
      else if (k < 0.52) a = 0.62 * (1 - (k - 0.32) / 0.2);
      else a = Math.sin((k - 0.52) * 46) * 0.05 * (1 - (k - 0.52) / 0.48);
      bisagra.rotation.z = a;
      if (k >= 1) { clap = 0; bisagra.rotation.z = 0; }
    }

    renderer.render(escena, camara);
  }

  // Siempre se dibuja al menos una vez: con movimiento reducido la claqueta
  // arranca en la mano y entrar() no hace nada.
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
    // attach() despega la claqueta de la mano sin que pegue un salto.
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
