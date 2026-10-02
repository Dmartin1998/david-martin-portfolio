// Apertura en 3D: close-up del casete, retroceso a la habitacion, carga en la
// videograbadora y entrada al tubo.
//
// El televisor es Television_01 de Poly Haven, CC0, por Gabriel Radic. Se le
// borro la marca del fabricante de la textura. La habitacion, el mueble, la
// videograbadora y el casete son geometria propia.
//
// Casi todo el caracter lo pone el pase de post-proceso, no la geometria:
// curvatura de tubo, aberracion cromatica, lineas de barrido, viñeteado y
// grano. Eso permite que la habitacion sea deliberadamente pobre en detalle
// sin que se note, y es lo que hace que al final la imagen quede abombada
// como el vidrio de una tele de tubo.
//
// three.js va auto-alojado porque la CSP del sitio es script-src 'self'.

import * as THREE from './three.module.min.js';
import { GLTFLoader } from './GLTFLoader.js';

const RUTA = '/cinta/3d/';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const suave = (t) => t * t * (3 - 2 * t);
const mezcla = (a, b, t) => a + (b - a) * t;

function lerpVec(a, b, t) {
  return new THREE.Vector3(mezcla(a.x, b.x, t), mezcla(a.y, b.y, t), mezcla(a.z, b.z, t));
}

/* ------------------------------------------------------ pase de imagen -- */

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tDiffuse;
uniform float uCurva;
uniform float uAberr;
uniform float uBarrido;
uniform float uGrano;
uniform float uVineta;
uniform float uTiempo;

// Curvatura de tubo: aleja los pixeles del centro segun el cuadrado del radio.
vec2 abombar(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return 0.5 + c * (1.0 + k * r2);
}

float ruido(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTiempo) * 43758.5453);
}

void main() {
  vec2 uv = abombar(vUv, uCurva);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // aberracion cromatica: cada canal con un abombado apenas distinto
  vec2 ur = abombar(vUv, uCurva + uAberr);
  vec2 ub = abombar(vUv, uCurva - uAberr);
  vec3 col = vec3(
    texture2D(tDiffuse, ur).r,
    texture2D(tDiffuse, uv).g,
    texture2D(tDiffuse, ub).b
  );

  // brillo barato: sumar lo que ya es claro, desplazado
  vec3 alto = max(texture2D(tDiffuse, uv + vec2(0.0024, 0.0)).rgb,
                  texture2D(tDiffuse, uv - vec2(0.0024, 0.0)).rgb);
  col += max(alto - 0.72, 0.0) * 0.55;

  float linea = sin(uv.y * 900.0) * 0.5 + 0.5;
  col *= 1.0 - uBarrido * (1.0 - linea) * 0.5;

  vec2 d = uv - 0.5;
  col *= 1.0 - uVineta * dot(d, d) * 2.1;

  col += (ruido(uv * 400.0) - 0.5) * uGrano;

  gl_FragColor = vec4(col, 1.0);
}`;

/* -------------------------------------------------- pantalla del tubo --- */

function crearPantalla() {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 480;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const BARRAS = ['#c3c3c3', '#c3c33c', '#3cc3c3', '#3cc33c', '#c33cc3', '#c33c3c', '#3c3cc3'];

  function apagada() {
    g.fillStyle = '#050507';
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
    tex.needsUpdate = true;
  }
  apagada();
  return { tex, apagada, lluvia, barras };
}

/* ------------------------------------------------- la cara del casete --- */

async function crearEtiqueta() {
  try { await document.fonts.load('200px Firma'); } catch (e) {}

  const c = document.createElement('canvas');
  c.width = 1400;
  c.height = 800;
  const g = c.getContext('2d');

  const fondo = g.createLinearGradient(0, 0, 0, c.height);
  fondo.addColorStop(0, '#302b25');
  fondo.addColorStop(1, '#1b1813');
  g.fillStyle = fondo;
  g.fillRect(0, 0, c.width, c.height);

  g.fillStyle = '#15120e';
  [[46, 46], [c.width - 46, 46], [46, c.height - 46], [c.width - 46, c.height - 46]].forEach(([x, y]) => {
    g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
  });

  g.fillStyle = '#f7f4ec';
  g.fillRect(84, 60, c.width - 168, 380);
  g.strokeStyle = '#cdc6b6';
  g.lineWidth = 3;
  g.strokeRect(84, 60, c.width - 168, 380);

  g.fillStyle = '#0d0b08';
  g.textAlign = 'center';
  g.font = '190px Firma, cursive';
  g.fillText('David Martín', c.width / 2, 265);

  g.strokeStyle = '#d6cfc0';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(150, 318); g.lineTo(c.width - 150, 318); g.stroke();

  g.fillStyle = '#8a8273';
  g.font = '30px "Plex Mono", monospace';
  g.fillText('VHS · T-120 · SP · 2020 — 2026', c.width / 2, 382);

  g.fillStyle = '#07060a';
  g.fillRect(210, 490, c.width - 420, 230);
  g.strokeStyle = '#2b261f';
  g.lineWidth = 5;
  g.strokeRect(210, 490, c.width - 420, 230);

  [400, c.width - 400].forEach((x) => {
    const anillo = g.createRadialGradient(x, 605, 10, x, 605, 74);
    anillo.addColorStop(0, '#5a5248');
    anillo.addColorStop(0.62, '#2a241d');
    anillo.addColorStop(1, '#0f0c09');
    g.fillStyle = anillo;
    g.beginPath(); g.arc(x, 605, 74, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#b9b2a4';
    g.lineWidth = 7;
    g.beginPath(); g.arc(x, 605, 62, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#17130e';
    g.beginPath(); g.arc(x, 605, 22, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6b6052';
    g.lineWidth = 5;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.beginPath();
      g.moveTo(x + Math.cos(a) * 24, 605 + Math.sin(a) * 24);
      g.lineTo(x + Math.cos(a) * 36, 605 + Math.sin(a) * 36);
      g.stroke();
    }
  });

  const cinta = g.createLinearGradient(0, 568, 0, 642);
  cinta.addColorStop(0, '#6d5434');
  cinta.addColorStop(1, '#30240f');
  g.fillStyle = cinta;
  g.fillRect(474, 568, c.width - 948, 74);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/* ---------------------------------------------------------------- montar -- */

export async function montar(lienzo, alTerminar, alPaso) {
  // La escena avisa en que momento esta; quien la monta decide si eso
  // suena, se registra o se ignora.
  const paso = alPaso || function () {};
  const ancho = () => lienzo.clientWidth || 1;
  const alto = () => lienzo.clientHeight || 1;

  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(ancho(), alto(), false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;

  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x050507);
  escena.fog = new THREE.Fog(0x070709, 4.2, 15);

  const camara = new THREE.PerspectiveCamera(36, ancho() / alto(), 0.01, 60);

  escena.add(new THREE.HemisphereLight(0x6d7c9c, 0x121218, 1.25));

  const clave = new THREE.DirectionalLight(0xffeedd, 4.3);
  clave.position.set(-2.6, 3.0, 2.8);
  escena.add(clave);

  const relleno = new THREE.DirectionalLight(0x9ec0ff, 1.9);
  relleno.position.set(3.0, 1.0, 1.8);
  escena.add(relleno);

  const contra = new THREE.DirectionalLight(0xbfd4ff, 1.8);
  contra.position.set(-0.6, 1.6, -3.0);
  escena.add(contra);

  const brillo = new THREE.PointLight(0x9fd8ff, 0, 3.2, 2);
  escena.add(brillo);

  const lampara = new THREE.PointLight(0xffc98a, 7, 8, 2);
  lampara.position.set(-2.4, 1.9, 1.6);
  escena.add(lampara);

  // Luz dedicada al primer plano del casete: se apaga al alejarse.
  const foco = new THREE.SpotLight(0xfff0dd, 26, 3.2, 0.7, 0.6, 2);
  foco.position.set(0.95, 2.05, 2.6);
  foco.target.position.set(0.15, 1.05, 1.92);
  escena.add(foco);
  escena.add(foco.target);

  /* ---- el televisor ---- */

  const gltf = await new GLTFLoader().setPath(RUTA).loadAsync('Television_01_1k.gltf');
  const tele = gltf.scene;

  let caja = new THREE.Box3().setFromObject(tele);
  tele.scale.setScalar(1 / caja.getSize(new THREE.Vector3()).y);
  caja = new THREE.Box3().setFromObject(tele);
  const ct = caja.getCenter(new THREE.Vector3());
  tele.position.x -= ct.x;
  tele.position.z -= ct.z;
  tele.position.y -= caja.min.y;
  caja = new THREE.Box3().setFromObject(tele);
  const t = caja.getSize(new THREE.Vector3());

  const soporte = new THREE.Group();
  escena.add(soporte);
  soporte.add(tele);

  /* ---- la habitacion: pobre a proposito, la salvan los filtros ---- */

  const pared = new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 1, metalness: 0 });
  const sueloMat = new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.95, metalness: 0 });

  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), sueloMat);
  suelo.rotation.x = -Math.PI / 2;
  escena.add(suelo);

  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(22, 8), pared);
  fondo.position.set(0, 4, -3.4);
  escena.add(fondo);

  const lateral = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), pared);
  lateral.rotation.y = Math.PI / 2;
  lateral.position.set(-3.6, 4, 0);
  escena.add(lateral);

  // Una ventana apenas insinuada: da profundidad con dos triangulos.
  const ventana = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.9),
    new THREE.MeshBasicMaterial({ color: 0x2b3a52 })
  );
  ventana.position.set(2.1, 1.75, -3.38);
  escena.add(ventana);
  const luzVentana = new THREE.PointLight(0x7fa0d8, 4.5, 9, 2);
  luzVentana.position.set(2.1, 1.75, -2.8);
  escena.add(luzVentana);

  /* ---- el mueble ---- */

  const madera = new THREE.MeshStandardMaterial({ color: 0x2b2118, roughness: 0.78, metalness: 0.04 });
  const ALTO_MUEBLE = 0.62;
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 1.25), madera);
  tapa.position.y = ALTO_MUEBLE;
  escena.add(tapa);
  const cuerpoM = new THREE.Mesh(new THREE.BoxGeometry(2.08, ALTO_MUEBLE - 0.07, 1.08), madera);
  cuerpoM.position.y = (ALTO_MUEBLE - 0.07) / 2;
  escena.add(cuerpoM);
  const ranuraM = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, ALTO_MUEBLE - 0.16, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x120d09, roughness: 1 })
  );
  ranuraM.position.set(0, (ALTO_MUEBLE - 0.07) / 2, 0.546);
  escena.add(ranuraM);

  /* ---- la videograbadora ---- */

  const metal = new THREE.MeshStandardMaterial({ color: 0x3b3a36, roughness: 0.58, metalness: 0.4 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.9, metalness: 0.05 });

  const ALTO_VCR = 0.15;
  const FONDO_VCR = t.z * 0.9;
  const BASE_VCR = ALTO_MUEBLE + 0.035;

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
  vcr.position.set(0, BASE_VCR + ALTO_VCR / 2, 0);
  soporte.add(vcr);

  tele.position.y += BASE_VCR + ALTO_VCR;

  /* ---- la pantalla ---- */

  const pantalla = crearPantalla();
  const plano = new THREE.Mesh(
    new THREE.PlaneGeometry(t.x * 0.627, t.y * 0.652),
    new THREE.MeshBasicMaterial({ map: pantalla.tex, toneMapped: false })
  );
  const TUBO = new THREE.Vector3(-t.x * 0.0994, BASE_VCR + ALTO_VCR + t.y * 0.565, t.z * 0.468);
  plano.position.copy(TUBO);
  soporte.add(plano);
  brillo.position.set(TUBO.x, TUBO.y, TUBO.z + 0.55);

  /* ---- el casete ---- */

  const etiqueta = await crearEtiqueta();
  const ladoCas = new THREE.MeshStandardMaterial({ color: 0x1b1813, roughness: 0.68, metalness: 0.06 });
  const caraCas = new THREE.MeshBasicMaterial({ map: etiqueta, color: 0xc8c4ba, toneMapped: false });
  const ANCHO_CAS = t.x * 0.52;
  const casete = new THREE.Group();
  casete.add(new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO_CAS, 0.029, ANCHO_CAS * 0.57),
    [ladoCas, ladoCas, caraCas, ladoCas, ladoCas, ladoCas]
  ));
  const tapaCas = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO_CAS * 0.93, 0.024, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x100d0a, roughness: 0.55, metalness: 0.12 })
  );
  tapaCas.position.set(0, 0.001, (ANCHO_CAS * 0.57) / 2);
  casete.add(tapaCas);
  soporte.add(casete);

  /* ---- post-proceso ---- */

  const destino = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    colorSpace: THREE.SRGBColorSpace
  });

  const filtro = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      tDiffuse: { value: destino.texture },
      uCurva: { value: 0.06 },
      uAberr: { value: 0.012 },
      uBarrido: { value: 0.12 },
      uGrano: { value: 0.055 },
      uVineta: { value: 0.46 },
      uTiempo: { value: 0 }
    },
    depthTest: false,
    depthWrite: false
  });

  const escenaPase = new THREE.Scene();
  escenaPase.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), filtro));
  const camaraPase = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---- posiciones de camara ---- */

  const CAM = {
    cerca: new THREE.Vector3(0.44, 1.33, 2.88),
    miraCerca: new THREE.Vector3(0.15, 1.04, 1.92),
    sala: new THREE.Vector3(1.8, 1.75, 3.6),
    miraSala: new THREE.Vector3(-0.05, 1.0, 0),
    frente: new THREE.Vector3(0.1, TUBO.y + 0.03, 2.3),
    miraFrente: new THREE.Vector3(TUBO.x, TUBO.y, 0),
    dentro: new THREE.Vector3(TUBO.x, TUBO.y, TUBO.z + 0.055),
    miraDentro: new THREE.Vector3(TUBO.x, TUBO.y, TUBO.z)
  };

  camara.position.copy(CAM.cerca);
  camara.lookAt(CAM.miraCerca);

  /* ---- bucle ---- */

  let vivo = true;
  let haciaLluvia = false;
  let girar = 0;
  const reloj = new THREE.Clock();
  let tramo = null;
  let avance = 0;

  function medir() {
    const w = ancho(), h = alto();
    renderer.setSize(w, h, false);
    const dpr = renderer.getPixelRatio();
    destino.setSize(Math.max(1, Math.floor(w * dpr)), Math.max(1, Math.floor(h * dpr)));
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }
  addEventListener('resize', medir);
  medir();

  function bucle() {
    if (!vivo) return;
    requestAnimationFrame(bucle);
    const dt = Math.min(reloj.getDelta(), 0.05);
    filtro.uniforms.uTiempo.value += dt;

    if (haciaLluvia) pantalla.lluvia();
    if (girar) casete.rotation.y += girar * dt;

    if (tramo) {
      avance = Math.min(1, (performance.now() - tramo.inicio) / (tramo.dur * 1000));
      const k = tramo.duro ? avance * avance : suave(avance);
      camara.position.copy(lerpVec(tramo.de, tramo.a, k));
      camara.lookAt(lerpVec(tramo.miraDe, tramo.miraA, suave(avance)));
      if (tramo.curva) {
        filtro.uniforms.uCurva.value = mezcla(tramo.curva[0], tramo.curva[1], k);
        filtro.uniforms.uAberr.value = mezcla(0.012, 0.034, k);
        filtro.uniforms.uBarrido.value = mezcla(0.18, 0.42, k);
      }
      if (avance >= 1) tramo = null;
    }

    renderer.setRenderTarget(destino);
    renderer.render(escena, camara);
    renderer.setRenderTarget(null);
    renderer.render(escenaPase, camaraPase);
  }

  bucle();

  function mover(de, a, miraDe, miraA, dur, extra) {
    avance = 0;
    tramo = Object.assign({ de, a, miraDe, miraA, dur, inicio: performance.now() }, extra || {});
    // Un pelo mas que la duracion, para que el ultimo fotograma llegue a 1.
    return esperar(dur * 1000 + 60);
  }

  /* ---- la secuencia ---- */

  const casRanura = BASE_VCR + ALTO_VCR - 0.035;
  const casZ = FONDO_VCR / 2 + 0.34;

  casete.position.set(0.15, 1.05, 1.92);
  casete.rotation.set(0.34, -0.55, 0.04);

  async function secuencia() {
    // 1. primerisimo plano: el casete gira y la etiqueta pasa de canto
    paso('girar');
    girar = 0.42;
    await esperar(2400);

    // 2. la camara se aleja y aparece la habitacion
    paso('alejar');
    girar = 0.1;
    await mover(CAM.cerca, CAM.sala, CAM.miraCerca, CAM.miraSala, 2.5);
    girar = 0;

    // 3. el casete se endereza y se ubica frente a la ranura
    paso('tomar');
    const p0 = casete.position.clone();
    const ry0 = casete.rotation.y;
    const rx0 = casete.rotation.x;
    for (let i = 0; i <= 42; i++) {
      const k = suave(i / 42);
      casete.position.set(
        mezcla(p0.x, 0, k),
        mezcla(p0.y, casRanura + 0.3, k),
        mezcla(p0.z, casZ, k)
      );
      casete.rotation.y = mezcla(ry0, 0, k);
      casete.rotation.x = mezcla(rx0, 0.28, k);
      await esperar(16);
    }

    // 4. baja y entra en la ranura
    paso('bajar');
    for (let i = 0; i <= 46; i++) {
      const k = suave(i / 46);
      casete.position.y = mezcla(casRanura + 0.3, casRanura, k);
      casete.rotation.x = 0.28 * (1 - k);
      await esperar(16);
    }
    paso('entrar');
    for (let i = 0; i <= 24; i++) {
      casete.position.z = mezcla(casZ, FONDO_VCR / 2 - 0.14, i / 24);
      await esperar(16);
    }
    casete.visible = false;

    // 5. clac, y la camara se pone de frente
    paso('cargar');
    led.material.color.set(0xd8232a);
    haciaLluvia = true;
    brillo.intensity = 1.3;
    mover(CAM.sala, CAM.frente, CAM.miraSala, CAM.miraFrente, 1.25);
    await esperar(950);

    // 6. barras de color
    paso('barras');
    haciaLluvia = false;
    pantalla.barras();
    brillo.intensity = 2.4;
    await esperar(620);

    // 7. la camara entra en el vidrio y la imagen se abomba
    paso('vidrio');
    await mover(CAM.frente, CAM.dentro, CAM.miraFrente, CAM.miraDentro, 1.5, {
      duro: true,
      curva: [0.06, 0.42]
    });
    await esperar(260);

    paso('fin');
    alTerminar();
    vivo = false;
    destino.dispose();
    renderer.dispose();
  }

  return { secuencia, detener: () => { vivo = false; } };
}
