// Ficha 01 en 3D: la claqueta entra girando desde fuera de cuadro, cae en la
// mano, y al tocarla se abre de frente para dar paso a los niveles.
//
// El personaje es geometria propia y deliberadamente estilizada. Un parecido
// real exigiria subir una foto a un servicio de avatares de terceros, y ademas
// el medio-fotorrealismo ya nos mando al valle inquietante una vez en este
// mismo sitio. Lo que identifica es la campera de bloques de color, los
// anteojos redondos y la barba; con eso alcanza y no pesa un solo byte de
// descarga, porque es codigo y no un modelo.
//
// Aca no hay pase de post-proceso: la pagina entera ya vive dentro del tubo
// (el marco abombado, el barrido y la mascara de ranuras van encima de todo),
// asi que el lienzo se dibuja transparente y hereda el tratamiento del sitio.

import * as THREE from './three.module.min.js';

const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;
// Arranca rapido y frena: sirve para lo que entra volando y tiene que posarse.
const frenar = (t) => 1 - Math.pow(1 - t, 3);

const PIEL = 0xd9a583;
const OSCURO = 0x241c18;

// Donde sostiene la claqueta, en coordenadas del personaje. El brazo no va
// horizontal: cae un poco, que es como se ofrece algo de verdad.
const MANO_SOSTIENE = new THREE.Vector3(-0.52, 0.485, 0.405);
const GUIA_IZQ = new THREE.Vector3(-1, -0.95, -0.4);

/* ------------------------------------------------------------- texturas -- */
// Tres lienzos dibujados a mano. Pesan lo que pesa el codigo que los genera.

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function aTextura(c, repetir) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  return t;
}

// La campera: bandas diagonales de ancho irregular. El bloque de color de los
// noventa no era una trama regular, eran paneles cosidos de distinto tamano.
function texturaCampera() {
  const [c, g] = lienzo(512, 512);
  // Bloques anchos: a la escala a la que se ve el torso, bandas finas leen
  // como ruido digital en vez de como paneles cosidos.
  const COLORES = ['#17757f', '#9c2466', '#5733a0', '#15151b', '#17757f', '#5733a0'];
  const ANCHOS = [186, 120, 164, 74, 128, 96, 210, 110, 150, 82];
  g.fillStyle = '#14141a';
  g.fillRect(0, 0, 512, 512);
  g.save();
  g.translate(256, 256);
  g.rotate(-0.52);
  g.translate(-700, -700);
  let x = 0;
  for (let i = 0; x < 1400; i++) {
    g.fillStyle = COLORES[i % COLORES.length];
    const w = ANCHOS[i % ANCHOS.length];
    g.fillRect(x, 0, w, 1400);
    x += w;
  }
  g.restore();
  // El nylon de una rompeviento no es mate: tiene brillo y arrugas.
  g.globalAlpha = 0.055;
  for (let i = 0; i < 150; i++) {
    g.strokeStyle = i % 2 ? '#ffffff' : '#000000';
    g.lineWidth = Math.random() * 2 + 0.5;
    g.beginPath();
    const x0 = Math.random() * 512;
    const y0 = Math.random() * 512;
    g.moveTo(x0, y0);
    g.lineTo(x0 + (Math.random() - 0.5) * 70, y0 + (Math.random() - 0.5) * 70);
    g.stroke();
  }
  g.globalAlpha = 1;
  return aTextura(c, true);
}

// La cara de la pizarra, escrita a mano como corresponde.
function texturaPizarra() {
  const [c, g] = lienzo(512, 400);
  g.fillStyle = '#1b1a16';
  g.fillRect(0, 0, 512, 400);
  g.strokeStyle = '#e8e6df';
  g.lineWidth = 7;
  g.strokeRect(4, 4, 504, 392);

  const FILAS = [['PROD.', 'ISCAA'], ['ESCENA', '01'], ['TOMA', '2020']];
  g.font = '34px ui-monospace, monospace';
  g.textBaseline = 'middle';
  FILAS.forEach(function (f, i) {
    const y = 86 + i * 104;
    g.fillStyle = '#9e9a8e';
    g.textAlign = 'left';
    g.fillText(f[0], 42, y);
    g.fillStyle = '#e8e6df';
    g.textAlign = 'right';
    g.fillText(f[1], 470, y);
    if (i < 2) {
      g.strokeStyle = '#4a4740';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(42, y + 50);
      g.lineTo(470, y + 50);
      g.stroke();
    }
  });
  return aTextura(c);
}

// El palo: la diagonal blanca y negra de toda la vida.
function texturaPalo() {
  const [c, g] = lienzo(512, 64);
  g.fillStyle = '#17161a';
  g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#ece9e0';
  for (let i = -1; i < 10; i++) {
    g.beginPath();
    g.moveTo(i * 56 + 30, 0);
    g.lineTo(i * 56 + 58, 0);
    g.lineTo(i * 56 + 28, 64);
    g.lineTo(i * 56, 64);
    g.closePath();
    g.fill();
  }
  return aTextura(c);
}

/* ------------------------------------------------------------ personaje -- */

function armarPersona(texCampera) {
  const persona = new THREE.Group();

  const piel = new THREE.MeshStandardMaterial({ color: PIEL, roughness: 0.72 });
  const pelo = new THREE.MeshStandardMaterial({ color: OSCURO, roughness: 0.85 });
  const nylon = new THREE.MeshStandardMaterial({
    map: texCampera, roughness: 0.42, metalness: 0.06, side: THREE.DoubleSide
  });
  const algodon = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.9 });
  const lienzoBlanco = new THREE.MeshStandardMaterial({ color: 0xcfcdc4, roughness: 0.95 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9a98c, roughness: 0.3, metalness: 0.9 });
  const vidrio = new THREE.MeshStandardMaterial({
    color: 0x9fb4c4, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.17
  });

  /* ---- tronco ---- */
  // La remera va entera y la campera es una cascara mas grande con el frente
  // abierto: asi el blanco del medio aparece solo, sin recortar nada.
  const torso = new THREE.Group();

  // La remera va entera y apenas rota: el blanco puro se quema con el
  // contraluz y se come la cara de al lado.
  const remera = new THREE.Mesh(new THREE.CylinderGeometry(0.212, 0.192, 0.64, 18), lienzoBlanco);
  remera.scale.z = 0.6;
  remera.position.y = 0.32;
  torso.add(remera);

  // La abertura de la campera mira a camara y es angosta: antes dejaba ver
  // medio torso blanco y parecia un babero.
  const campera = new THREE.Mesh(
    new THREE.CylinderGeometry(0.247, 0.224, 0.66, 30, 1, true, Math.PI * 0.048, Math.PI * 1.904),
    nylon
  );
  campera.scale.z = 0.62;
  campera.position.y = 0.31;
  torso.add(campera);

  // Cuello de la campera, levantado como corresponde a una rompeviento.
  const cuelloCampera = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.145, 0.125, 22, 1, true, Math.PI * 0.11, Math.PI * 1.78),
    nylon
  );
  cuelloCampera.scale.z = 0.72;
  cuelloCampera.position.y = 0.655;
  torso.add(cuelloCampera);

  // Hombros redondeados: sin esto el tronco termina en un filo de lata.
  [-1, 1].forEach(function (s) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.082, 14, 12), nylon);
    h.position.set(s * 0.222, 0.585, 0);
    h.scale.set(1, 0.92, 0.72);
    torso.add(h);
  });

  persona.add(torso);

  /* ---- cabeza ---- */
  const cabeza = new THREE.Group();
  cabeza.position.y = 0.8;

  const craneo = new THREE.Mesh(new THREE.SphereGeometry(0.125, 26, 22), piel);
  craneo.scale.set(1, 1.14, 0.97);
  cabeza.add(craneo);

  const cuello = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.12, 12), piel);
  cuello.position.y = -0.125;
  cabeza.add(cuello);

  // Pelo corto: un casquete que deja frente. Si baja mas, se junta con la
  // barba y la cabeza queda negra entera, que es lo que pasaba antes.
  const corte = new THREE.Mesh(
    new THREE.SphereGeometry(0.1295, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), pelo
  );
  corte.scale.set(1, 1.15, 1);
  corte.position.set(0, 0.012, -0.012);
  cabeza.add(corte);

  // La barba es una esfera chica apoyada en el menton, ancha y poco profunda:
  // cubre menton y mandibula y deja libres los ojos y el puente de la nariz.
  const barba = new THREE.Mesh(new THREE.SphereGeometry(0.093, 22, 18), pelo);
  barba.scale.set(1.3, 1.05, 1.12);
  barba.position.set(0, -0.05, 0.008);
  cabeza.add(barba);

  // Patillas: suben desde la barba hasta la oreja.
  [-1, 1].forEach(function (s) {
    const patilla = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), pelo);
    patilla.scale.set(0.5, 1.5, 0.95);
    patilla.position.set(s * 0.108, -0.006, 0.014);
    cabeza.add(patilla);
  });

  const nariz = new THREE.Mesh(new THREE.SphereGeometry(0.0215, 14, 12), piel);
  nariz.scale.set(0.95, 1.3, 1.5);
  nariz.position.set(0, -0.004, 0.122);
  cabeza.add(nariz);

  const iris = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.3 });
  [-1, 1].forEach(function (s) {
    const blanco = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 12), algodon);
    blanco.scale.set(1, 0.8, 0.5);
    blanco.position.set(s * 0.045, 0.028, 0.112);
    cabeza.add(blanco);

    const ojo = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 12, 10), iris);
    ojo.position.set(s * 0.045, 0.027, 0.121);
    cabeza.add(ojo);

    const ceja = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.009, 0.014), pelo);
    ceja.position.set(s * 0.046, 0.058, 0.113);
    ceja.rotation.z = s * -0.14;
    cabeza.add(ceja);

    const oreja = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), piel);
    oreja.scale.set(0.4, 1.05, 0.78);
    oreja.position.set(s * 0.123, -0.002, -0.004);
    cabeza.add(oreja);
  });

  /* ---- anteojos ---- */
  // Redondos y de marco fino: es lo que mas lo identifica de frente.
  const gafas = new THREE.Group();
  [-1, 1].forEach(function (s) {
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.0325, 0.0032, 8, 26), metal);
    aro.position.set(s * 0.0455, 0.028, 0.1155);
    gafas.add(aro);

    const cristal = new THREE.Mesh(new THREE.CircleGeometry(0.031, 22), vidrio);
    cristal.position.set(s * 0.0455, 0.028, 0.1155);
    gafas.add(cristal);

    const patilla = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.0035, 0.105), metal);
    patilla.position.set(s * 0.093, 0.03, 0.055);
    patilla.rotation.y = s * 0.5;
    gafas.add(patilla);
  });
  const puente = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.003), metal);
  puente.position.set(0, 0.034, 0.116);
  gafas.add(puente);
  cabeza.add(gafas);

  persona.add(cabeza);

  /* ---- brazos ---- */
  // Cada brazo es hombro -> codo -> mano, encadenados, para poder girar el
  // conjunto desde el hombro y que la mano acompane sola.
  function brazo(lado) {
    const hombro = new THREE.Group();
    hombro.position.set(lado * 0.235, 0.575, 0);

    const superior = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.27, 12), nylon);
    superior.position.y = -0.135;
    hombro.add(superior);

    const codo = new THREE.Group();
    codo.position.y = -0.27;
    hombro.add(codo);

    const antebrazo = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.042, 0.26, 12), nylon);
    antebrazo.position.y = -0.13;
    codo.add(antebrazo);

    const puno = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.013, 8, 16), nylon);
    puno.position.y = -0.255;
    puno.rotation.x = Math.PI / 2;
    codo.add(puno);

    const mano = new THREE.Group();
    mano.position.y = -0.285;
    codo.add(mano);

    const palma = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.024, 0.086), piel);
    mano.add(palma);
    for (let i = 0; i < 4; i++) {
      const dedo = new THREE.Mesh(new THREE.CapsuleGeometry(0.0115, 0.05, 3, 7), piel);
      dedo.position.set(-0.03 + i * 0.02, 0.004, 0.072);
      dedo.rotation.x = Math.PI / 2;
      mano.add(dedo);
    }
    const pulgar = new THREE.Mesh(new THREE.CapsuleGeometry(0.0135, 0.04, 3, 7), piel);
    pulgar.position.set(lado * -0.046, 0.006, 0.03);
    pulgar.rotation.set(Math.PI / 2, 0, lado * 0.9);
    mano.add(pulgar);

    return { hombro: hombro, codo: codo, mano: mano, largos: [0.27, 0.285] };
  }

  const izq = brazo(-1);
  const der = brazo(1);
  persona.add(izq.hombro, der.hombro);

  // Donde van las manos, no con que angulos se llega. El codo sale hacia
  // afuera y atras en los dos casos, que es como cae un brazo humano.
  apuntarBrazo(izq, MANO_SOSTIENE, GUIA_IZQ);
  apuntarBrazo(der, new THREE.Vector3(0.315, 0.16, 0.16), new THREE.Vector3(1, -0.3, -0.55));
  izq.mano.rotation.set(0.95, 0, 0);

  return { persona: persona, torso: torso, cabeza: cabeza, izq: izq, der: der };
}

/* --------------------------------------------------- cinematica inversa -- */
// Dos huesos y un codo. Se le dice donde va la mano y acomoda hombro y
// antebrazo; el vector guia decide para que lado sale el codo, que es lo unico
// que la geometria por si sola no puede decidir.

const ABAJO = new THREE.Vector3(0, -1, 0);
const tope = (v, a, b) => Math.max(a, Math.min(b, v));

function apuntarBrazo(brazo, destino, guia) {
  const L1 = brazo.largos[0], L2 = brazo.largos[1];
  const v = destino.clone().sub(brazo.hombro.position);
  const D = tope(v.length(), Math.abs(L1 - L2) + 0.01, (L1 + L2) * 0.995);
  const dir = v.clone().normalize();

  // Angulo entre el brazo y la recta hombro-mano, y apertura del codo.
  const alfa = Math.acos(tope((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  const gama = Math.acos(tope((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));

  let eje = new THREE.Vector3().crossVectors(dir, guia);
  if (eje.lengthSq() < 1e-6) eje.set(0, 0, 1);
  eje.normalize();

  const superior = dir.clone().applyAxisAngle(eje, -alfa);

  brazo.hombro.quaternion.setFromUnitVectors(ABAJO, superior);
  // El eje de flexion, visto desde el hombro ya girado.
  const ejeLocal = eje.clone().applyQuaternion(brazo.hombro.quaternion.clone().invert());
  brazo.codo.quaternion.setFromAxisAngle(ejeLocal, Math.PI - gama);
}

/* ------------------------------------------------------------- claqueta -- */

function armarClaqueta(texPizarra, texPalo) {
  const claqueta = new THREE.Group();

  const cuerpo = new THREE.MeshStandardMaterial({ color: 0x1b1a16, roughness: 0.6, metalness: 0.08 });
  const cara = new THREE.MeshStandardMaterial({ map: texPizarra, roughness: 0.55 });
  const rayas = new THREE.MeshStandardMaterial({ map: texPalo, roughness: 0.5 });

  const A = 0.3, L = 0.235;

  const pizarra = new THREE.Mesh(new THREE.BoxGeometry(A, L, 0.016), cuerpo);
  pizarra.position.y = -L / 2;
  claqueta.add(pizarra);

  const frente = new THREE.Mesh(new THREE.PlaneGeometry(A * 0.98, L * 0.96), cara);
  frente.position.set(0, -L / 2, 0.0085);
  claqueta.add(frente);

  // La banda fija apoyada sobre el canto de arriba de la pizarra, y el palo
  // encima, con la bisagra en la punta izquierda. Apilados y sin pisarse: si
  // comparten altura y profundidad, los dos rayados se pelean el fotograma.
  const base = new THREE.Mesh(new THREE.BoxGeometry(A, 0.034, 0.019), rayas);
  base.position.y = 0.017;
  claqueta.add(base);

  const bisagra = new THREE.Group();
  bisagra.position.set(-A / 2, 0.035, 0);
  const palo = new THREE.Mesh(new THREE.BoxGeometry(A, 0.042, 0.021), rayas);
  palo.position.set(A / 2, 0.021, 0);
  bisagra.add(palo);
  claqueta.add(bisagra);

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
  renderer.toneMappingExposure = 1.18;

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(34, 1, 0.05, 40);

  escena.add(new THREE.HemisphereLight(0x7d8ca8, 0x14141a, 1.5));
  const clave = new THREE.DirectionalLight(0xfff0dd, 2.6);
  clave.position.set(-1.9, 2.4, 2.4);
  escena.add(clave);
  const relleno = new THREE.DirectionalLight(0x8fa8c8, 0.9);
  relleno.position.set(2.4, 0.9, 1.4);
  escena.add(relleno);
  // Contraluz: despega la silueta del fondo negro de la pagina.
  const contra = new THREE.DirectionalLight(0xbcd2ee, 1.7);
  contra.position.set(1.1, 1.8, -2.6);
  escena.add(contra);

  const texCampera = texturaCampera();
  const cuerpo = armarPersona(texCampera);
  const { claqueta, bisagra } = armarClaqueta(texturaPizarra(), texturaPalo());

  escena.add(cuerpo.persona);
  escena.add(claqueta);

  const PERSONA_X = 0.33;
  cuerpo.persona.position.set(PERSONA_X, -0.42, 0);
  cuerpo.persona.rotation.y = -0.3;

  // El anillo que late alrededor de la claqueta mientras espera que la toquen.
  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(0.26, 0.007, 6, 40),
    new THREE.MeshBasicMaterial({ color: 0x7fe07f, transparent: true, opacity: 0 })
  );
  escena.add(aro);

  /* ---- encuadre ---- */
  // La claqueta queda a la izquierda y el personaje a la derecha. En vertical
  // la camara se aleja, que es lo unico que hace falta para que entre todo.
  const MIRA = new THREE.Vector3(0.04, 0.3, 0);

  let angosto = false;

  function medir() {
    const w = ancho(), h = alto();
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const r = w / h;
    angosto = r < 1;
    camara.position.set(0.07, 0.42, angosto ? 2.2 : 1.72 + (1.5 - Math.min(r, 1.5)) * 0.85);
    camara.lookAt(MIRA);
    camara.updateProjectionMatrix();
  }

  const observador = new ResizeObserver(medir);
  observador.observe(lienzoGL);
  medir();

  /* ---- donde va la claqueta ---- */
  // Sostenida, la claqueta es hija de la mano: la respiracion y el rebote del
  // brazo la arrastran solas, sin copiar matrices a mano cada fotograma. La
  // posicion de destino se pregunta, no se escribe: a ojo erraba por medio
  // cuerpo y habia que corregirla cada vez que cambiaba la pose.
  escena.updateMatrixWorld(true);

  // Un soporte colgado de la mano pero alineado con el mundo. Sin esto la
  // claqueta heredaba el giro del antebrazo y quedaba colgando de costado,
  // mirando al piso.
  const soporte = new THREE.Group();
  cuerpo.izq.mano.add(soporte);
  soporte.quaternion.copy(cuerpo.izq.mano.getWorldQuaternion(new THREE.Quaternion())).invert();

  // El alto de la pizarra mas un dedo de aire: asi el borde de abajo apoya
  // sobre la palma en vez de tapar la mano entera.
  const EN_PALMA = new THREE.Vector3(0, 0.272, 0.042);
  const GIRO_PALMA = new THREE.Euler(-0.14, 0.26, 0.07);
  // A z 0,88 el centro del cuadro cae en (0,054 / 0,356). La pizarra cuelga
  // medio alto por debajo del origen del grupo, asi que el grupo va ahi mas
  // ese medio alto. Sin esta correccion la claqueta se iba por abajo.
  const DE_FRENTE = new THREE.Vector3(0.05, 0.44, 0.88);
  const GIRO_FRENTE = new THREE.Euler(0, 0, 0);
  const FUERA = new THREE.Vector3(-2.7, 1.45, -0.4);

  const aux = new THREE.Vector3();

  // Donde cae la claqueta, en coordenadas del mundo.
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

  if (quieto) {
    colgarDeLaMano();
    claqueta.visible = true;
  } else {
    escena.add(claqueta);
    claqueta.position.copy(FUERA);
    claqueta.rotation.copy(GIRO_PALMA);
    claqueta.visible = false;
  }

  // Copia de trabajo, para poder hundir la mano en el golpe.
  const MANO_IZQ = MANO_SOSTIENE.clone();

  let vivo = true;
  let corriendo = false;
  let t = 0;
  let abierta = false;
  let faseEntrada = quieto ? 1 : -1;
  let giroLibre = new THREE.Vector3(0, 0, 0);
  let clap = null;
  let transicion = null;
  let golpe = 0;

  const reloj = new THREE.Clock();

  function bucle() {
    if (!vivo || !corriendo) return;
    requestAnimationFrame(bucle);
    const dt = Math.min(reloj.getDelta(), 0.05);
    t += dt;

    /* la entrada: vuela desde fuera de cuadro girando y frena en la palma */
    if (faseEntrada >= 0 && faseEntrada < 1) {
      faseEntrada = Math.min(1, faseEntrada + dt / 1.55);
      const k = frenar(faseEntrada);
      claqueta.position.lerpVectors(FUERA, destinoMano(), k);
      // Un arco: sube antes de caer, si no parece que la arrastran.
      claqueta.position.y += Math.sin(faseEntrada * Math.PI) * 0.42;
      const resto = 1 - k;
      claqueta.rotation.set(
        GIRO_PALMA.x + resto * giroLibre.x,
        GIRO_PALMA.y + resto * giroLibre.y,
        GIRO_PALMA.z + resto * giroLibre.z
      );
      if (faseEntrada >= 1) { colgarDeLaMano(); golpe = 1; }
    }

    /* el golpe en la palma: el brazo cede y vuelve */
    if (golpe > 0) {
      golpe = Math.max(0, golpe - dt * 2.6);
      // El peso hunde la mano y el brazo la recupera. Se pide el destino mas
      // abajo y la cinematica reacomoda hombro y codo sola.
      MANO_IZQ.copy(MANO_SOSTIENE);
      MANO_IZQ.y -= Math.sin(golpe * Math.PI) * 0.075;
      apuntarBrazo(cuerpo.izq, MANO_IZQ, GUIA_IZQ);
    }

    /* respiracion y mecido: sin esto el muneco parece un maniqui */
    if (!quieto) {
      const r = Math.sin(t * 1.35);
      cuerpo.torso.scale.set(1 + r * 0.008, 1 - r * 0.006, 1 + r * 0.008);
      cuerpo.torso.position.y = r * 0.004;
      cuerpo.cabeza.position.y = 0.8 + r * 0.005;
      cuerpo.cabeza.rotation.set(Math.sin(t * 0.6) * 0.03, Math.sin(t * 0.44) * 0.07, Math.sin(t * 0.52) * 0.02);
    }

    /* el anillo late mientras espera que la toquen */
    if (!abierta && faseEntrada >= 1 && !transicion) {
      const ciclo = quieto ? 0.35 : (t * 0.62) % 1;
      claqueta.getWorldPosition(aro.position);
      aro.position.y -= 0.11;
      aro.lookAt(camara.position);
      const s = 0.6 + ciclo * 0.9;
      aro.scale.set(s, s, s);
      aro.material.opacity = (1 - ciclo) * 0.55;
    } else {
      aro.material.opacity = 0;
    }

    /* abrir y cerrar */
    if (transicion) {
      transicion.k = Math.min(1, transicion.k + dt / transicion.dur);
      const k = suave(transicion.k);
      claqueta.position.lerpVectors(transicion.de, transicion.a, k);
      claqueta.rotation.set(
        mezcla(transicion.giroDe.x, transicion.giroA.x, k),
        mezcla(transicion.giroDe.y, transicion.giroA.y, k),
        mezcla(transicion.giroDe.z, transicion.giroA.z, k)
      );
      const e = mezcla(transicion.escalaDe, transicion.escalaA, k);
      claqueta.scale.set(e, e, e);
      // El personaje se corre y se apaga cuando la pizarra toma el cuadro.
      const fuera = transicion.abriendo ? k : 1 - k;
      cuerpo.persona.position.x = PERSONA_X + fuera * (angosto ? 0.16 : 0.42);
      cuerpo.persona.position.z = -fuera * (angosto ? 1 : 0.7);
      if (transicion.k >= 1) {
        if (transicion.alaMano) colgarDeLaMano();
        transicion = null;
      }
    }

    /* el palo: baja de golpe y rebota */
    if (clap) {
      clap.k = Math.min(1, clap.k + dt / 0.34);
      const k = clap.k;
      // Sube rapido, cae mas rapido todavia y queda vibrando un instante.
      let a;
      if (k < 0.32) a = (k / 0.32) * 0.62;
      else if (k < 0.52) a = 0.62 * (1 - (k - 0.32) / 0.2);
      else a = Math.sin((k - 0.52) * 46) * 0.05 * (1 - (k - 0.52) / 0.48);
      bisagra.rotation.z = a;
      if (k >= 1) { clap = null; bisagra.rotation.z = 0; }
    }

    renderer.render(escena, camara);
  }

  // Siempre se dibuja al menos una vez. Con movimiento reducido la claqueta
  // arranca en la mano y entrar() no hace nada, asi que sin esto el lienzo se
  // quedaba en blanco hasta que alguien tocaba.
  function arrancar() {
    if (corriendo || !vivo) return;
    corriendo = true;
    reloj.getDelta();
    bucle();
  }

  function parar() {
    corriendo = false;
  }

  /* ---- interfaz ---- */

  // La claqueta entra girando desde fuera de cuadro. Solo una vez.
  function entrar() {
    if (faseEntrada >= 0) return false;
    claqueta.visible = true;
    faseEntrada = 0;
    giroLibre = new THREE.Vector3(
      Math.PI * 2.4,
      Math.PI * 3.6,
      Math.PI * 1.8
    );
    arrancar();
    return true;
  }

  function abrir() {
    if (abierta) return;
    abierta = true;
    clap = { k: 0 };
    // attach() despega la claqueta de la mano sin que pegue un salto.
    escena.attach(claqueta);
    transicion = {
      k: 0, dur: 0.85, abriendo: true, alaMano: false,
      de: claqueta.position.clone(), a: DE_FRENTE.clone(),
      giroDe: claqueta.rotation.clone(), giroA: GIRO_FRENTE,
      escalaDe: claqueta.scale.x, escalaA: 1.34
    };
    arrancar();
  }

  function cerrar() {
    if (!abierta) return;
    abierta = false;
    transicion = {
      k: 0, dur: 0.7, abriendo: false, alaMano: true,
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
