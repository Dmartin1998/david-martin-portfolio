// Apertura en 3D real: televisor de tubo, videograbadora y casete VHS.
//
// El televisor es Television_01 de Poly Haven, CC0, por Gabriel Radic.
// La videograbadora y el casete se construyen con geometria propia para que
// compartan el material y la luz del modelo y no se note el pegote.
//
// three.js va auto-alojado porque la CSP del sitio es script-src 'self'.
// Todo esto pesa ~410 KB comprimido, asi que se carga en diferido: el
// contenido de la pagina ya es usable antes de que llegue la escena, y si
// falla o tarda, se entra directo sin intro.

import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';

const RUTA = '/cinta/3d/';

/* --------------------------------------------------------------- utiles -- */

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (t) => t * t * (3 - 2 * t);

function lerpVec(a, b, t) {
  return new THREE.Vector3(
    a.x + (b.x - a.x) * t,
    a.y + (b.y - a.y) * t,
    a.z + (b.z - a.z) * t
  );
}

/* ------------------------------------------------- la pantalla del tubo -- */
// Un canvas 2D que se pinta y se sube como textura: negro, lluvia o barras.

function crearPantalla() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const BARRAS = ['#bdbdbd', '#bdbd3a', '#3abdbd', '#3abd3a', '#bd3abd', '#bd3a3a', '#3a3abd'];

  function apagada() {
    g.fillStyle = '#060608';
    g.fillRect(0, 0, c.width, c.height);
    tex.needsUpdate = true;
  }

  function lluvia() {
    const img = g.createImageData(c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    tex.needsUpdate = true;
  }

  function barras() {
    const w = c.width / BARRAS.length;
    BARRAS.forEach((color, i) => {
      g.fillStyle = color;
      g.fillRect(i * w, 0, w + 1, c.height);
    });
    // lineas de barrido encima
    g.fillStyle = 'rgba(0,0,0,.22)';
    for (let y = 0; y < c.height; y += 3) g.fillRect(0, y, c.width, 1);
    tex.needsUpdate = true;
  }

  apagada();
  return { tex, apagada, lluvia, barras };
}

/* ----------------------------------------------------- etiqueta del VHS -- */
// La firma va dibujada en un canvas y de ahi a la cara superior del casete.

async function crearEtiqueta() {
  try { await document.fonts.load('150px Firma'); } catch (e) {}
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 580;
  const g = c.getContext('2d');

  g.fillStyle = '#231f1a';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#faf8f2';
  g.fillRect(44, 40, c.width - 88, 300);

  g.fillStyle = '#100e0b';
  g.textAlign = 'center';
  g.font = '150px Firma, cursive';
  g.fillText('David Martín', c.width / 2, 210);

  g.strokeStyle = '#d6cfc0';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(90, 250);
  g.lineTo(c.width - 90, 250);
  g.stroke();

  g.fillStyle = '#8a8273';
  g.font = '28px "Plex Mono", monospace';
  g.fillText('VHS · T-120 · SP · 2020—2026', c.width / 2, 300);

  // ventana de los carretes
  g.fillStyle = '#0a0810';
  g.fillRect(150, 380, c.width - 300, 150);
  g.strokeStyle = '#b9b2a4';
  g.lineWidth = 6;
  [290, c.width - 290].forEach((x) => {
    g.beginPath();
    g.arc(x, 455, 46, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(x, 455, 14, 0, Math.PI * 2);
    g.stroke();
  });
  g.strokeStyle = '#6b5333';
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(336, 455);
  g.lineTo(c.width - 336, 455);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* --------------------------------------------------------------- escena -- */

export async function montar(lienzo, alTerminar) {
  const ancho = () => lienzo.clientWidth;
  const alto = () => lienzo.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(ancho(), alto(), false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;

  const escena = new THREE.Scene();

  const camara = new THREE.PerspectiveCamera(38, ancho() / alto(), 0.01, 100);

  // Luz: una clave calida arriba a la izquierda, relleno frio a la derecha,
  // y un punto delante del tubo que simula el brillo de la pantalla.
  escena.add(new THREE.HemisphereLight(0x6a7a9a, 0x14141a, 1.1));

  const clave = new THREE.DirectionalLight(0xffeedd, 4.2);
  clave.position.set(-2.4, 2.8, 2.6);
  escena.add(clave);

  const relleno = new THREE.DirectionalLight(0x9ec0ff, 1.7);
  relleno.position.set(2.9, 0.9, 1.6);
  escena.add(relleno);

  // contraluz: le despega el contorno del fondo negro
  const contra = new THREE.DirectionalLight(0xbfd4ff, 2.2);
  contra.position.set(-0.6, 1.4, -2.6);
  escena.add(contra);

  const brillo = new THREE.PointLight(0x9fd8ff, 0, 2.4, 2);
  escena.add(brillo);

  // Piso tenue para que el equipo no flote en la nada.
  // Sombra difusa bajo el equipo, sin borde duro: un circulo con degradado
  // en canvas. Un piso con material PBR se leia como tarima iluminada.
  const sombraC = document.createElement('canvas');
  sombraC.width = sombraC.height = 256;
  const sg = sombraC.getContext('2d');
  const grad = sg.createRadialGradient(128, 128, 10, 128, 128, 126);
  grad.addColorStop(0, 'rgba(0,0,0,.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 256, 256);
  const piso = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.4),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(sombraC),
      transparent: true,
      depthWrite: false,
      opacity: 0.9
    })
  );
  piso.rotation.x = -Math.PI / 2;
  piso.position.y = 0.002;
  escena.add(piso);

  /* ---- el televisor ---- */

  const gltf = await new GLTFLoader().setPath(RUTA).loadAsync('Television_01_1k.gltf');
  const tele = gltf.scene;

  // Normalizar: apoyarlo en el piso y centrarlo en X/Z.
  let caja = new THREE.Box3().setFromObject(tele);
  const tam = caja.getSize(new THREE.Vector3());
  const escala = 1 / tam.y;
  tele.scale.setScalar(escala);
  caja = new THREE.Box3().setFromObject(tele);
  const centro = caja.getCenter(new THREE.Vector3());
  tele.position.x -= centro.x;
  tele.position.z -= centro.z;
  tele.position.y -= caja.min.y;

  caja = new THREE.Box3().setFromObject(tele);
  const t = caja.getSize(new THREE.Vector3());

  const soporte = new THREE.Group();
  escena.add(soporte);
  soporte.add(tele);

  /* ---- la videograbadora, debajo ---- */

  const metal = new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 0.6, metalness: 0.38 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9, metalness: 0.05 });

  const ALTO_VCR = 0.15;
  const FONDO_VCR = t.z * 0.9;

  const vcr = new THREE.Group();
  vcr.add(new THREE.Mesh(new THREE.BoxGeometry(t.x * 1.02, ALTO_VCR, FONDO_VCR), metal));
  const ranura = new THREE.Mesh(new THREE.BoxGeometry(t.x * 0.72, 0.03, 0.016), oscuro);
  ranura.position.set(0, 0.03, FONDO_VCR / 2);
  vcr.add(ranura);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.009, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x2a1010 })
  );
  led.position.set(-t.x * 0.4, -0.03, FONDO_VCR / 2 + 0.004);
  vcr.add(led);
  vcr.position.set(0, ALTO_VCR / 2, 0);
  soporte.add(vcr);

  // el televisor se apoya encima
  tele.position.y += ALTO_VCR;

  /* ---- la pantalla ---- */
  // Medido sobre el modelo: el tubo ocupa el 65% del ancho, corrido a la
  // izquierda porque el panel de perillas se come el lado derecho.

  const pantalla = crearPantalla();
  const ANCHO_TUBO = t.x * 0.655;
  const ALTO_TUBO = t.y * 0.62;
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(ANCHO_TUBO, ALTO_TUBO),
    new THREE.MeshBasicMaterial({ map: pantalla.tex, toneMapped: false })
  );
  const TUBO = new THREE.Vector3(-t.x * 0.126, ALTO_VCR + t.y * 0.515, t.z * 0.49);
  plano.position.copy(TUBO);
  soporte.add(plano);

  brillo.position.set(TUBO.x, TUBO.y, TUBO.z + 0.5);

  /* ---- el casete ---- */

  const etiqueta = await crearEtiqueta();
  const ladoCas = new THREE.MeshStandardMaterial({ color: 0x1d1a16, roughness: 0.72, metalness: 0.06 });
  const caraCas = new THREE.MeshBasicMaterial({ map: etiqueta, color: 0xcfcabf, toneMapped: false });
  const ANCHO_CAS = t.x * 0.52;
  const casete = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO_CAS, 0.028, ANCHO_CAS * 0.55),
    [ladoCas, ladoCas, caraCas, ladoCas, ladoCas, ladoCas]
  );
  soporte.add(casete);

  /* ---- bucle ---- */

  let vivo = true;
  const reloj = new THREE.Clock();
  let haciaLluvia = false;

  // Con fov 38 vertical, para que entre todo el equipo (1,15 de alto) con aire
  // hace falta algo mas de 2,6 de distancia al frente del mueble.
  const camInicio = new THREE.Vector3(1.55, 1.35, 3.45);
  const camMedia = new THREE.Vector3(0.14, 0.78, 2.62);
  const camFin = new THREE.Vector3(TUBO.x, TUBO.y, TUBO.z + 0.13);
  const miraInicio = new THREE.Vector3(0, 0.56, 0);
  const miraFin = new THREE.Vector3(TUBO.x, TUBO.y, TUBO.z);

  camara.position.copy(camInicio);
  camara.lookAt(miraInicio);

  let fase = 0;
  let avance = 0;

  function medir() {
    renderer.setSize(ancho(), alto(), false);
    camara.aspect = ancho() / alto();
    camara.updateProjectionMatrix();
  }
  addEventListener('resize', medir);

  function bucle() {
    if (!vivo) return;
    requestAnimationFrame(bucle);
    const dt = reloj.getDelta();
    if (haciaLluvia) pantalla.lluvia();

    if (fase === 1) {
      avance = Math.min(1, avance + dt / 1.5);
      const k = suave(avance);
      camara.position.copy(lerpVec(camInicio, camMedia, k));
      camara.lookAt(miraInicio);
    } else if (fase === 3) {
      avance = Math.min(1, avance + dt / 1.35);
      const k = avance * avance;
      camara.position.copy(lerpVec(camMedia, camFin, k));
      camara.lookAt(lerpVec(miraInicio, miraFin, suave(avance)));
    }
    renderer.render(escena, camara);
  }

  medir();
  bucle();

  /* ---- la secuencia ---- */

  const casAlto = TUBO.y - 0.04;
  const casRanura = ALTO_VCR - 0.035;
  const casZ = FONDO_VCR / 2 + 0.3;

  casete.position.set(0, casAlto, casZ + 0.5);
  casete.rotation.set(0.46, 0, 0.06);
  casete.visible = false;

  async function secuencia() {
    // el casete aparece flotando, mostrando la etiqueta
    casete.visible = true;
    for (let i = 0; i <= 30; i++) {
      const k = suave(i / 30);
      casete.position.z = casZ + 0.5 - 0.5 * k;
      casete.position.y = casAlto;
      casete.rotation.x = 0.46 - 0.1 * k;
      await esperar(16);
    }

    // la camara retrocede y encuadra el equipo entero
    fase = 1;
    avance = 0;
    await esperar(1500);
    fase = 0;

    // el casete baja, se endereza y entra en la ranura
    const y0 = casete.position.y;
    for (let i = 0; i <= 56; i++) {
      const k = suave(i / 56);
      casete.position.y = y0 + (casRanura - y0) * k;
      casete.rotation.x = 0.36 * (1 - k);
      casete.position.z = casZ - 0.08 * k;
      await esperar(16);
    }
    for (let i = 0; i <= 26; i++) {
      const k = i / 26;
      casete.position.z = casZ - 0.08 - 0.22 * k;
      await esperar(16);
    }
    casete.visible = false;

    // clac: el LED se enciende y la pantalla arranca con lluvia
    led.material.color.set(0xd8232a);
    haciaLluvia = true;
    brillo.intensity = 1.1;
    await esperar(650);

    // barras de color
    haciaLluvia = false;
    pantalla.barras();
    brillo.intensity = 2.1;
    await esperar(520);

    // la camara entra en el tubo
    fase = 3;
    avance = 0;
    await esperar(1350);

    alTerminar();
    vivo = false;
    renderer.dispose();
  }

  return { secuencia, detener: () => { vivo = false; } };
}
