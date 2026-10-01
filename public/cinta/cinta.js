// La cinta — apertura, estaciones y radio sintetizada.
// Sin dependencias y sin archivos de audio: las cuatro emisoras se generan
// con osciladores de la Web Audio API. Un MP3 de un tema de los 90 tendria
// derechos de autor; ademas, la web de esa epoca sonaba a MIDI, no a MP3.

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var stage = $('stage'), bar = $('bar'), radio = $('radio'), skip = $('skip');

  /* ------------------------------------------------------------ apertura */
  // Secuencia: la firma se escribe, se vuelve etiqueta del casete, la camara
  // retrocede hasta ver el equipo, el casete entra en la videograbadora, la
  // tele enciende y la camara entra en la pantalla.
  // Solo se ve una vez por sesion: a la vuelta, el contenido aparece directo.

  var revealed = false;
  var relojes = [];

  function luego(ms, fn) { relojes.push(setTimeout(fn, ms)); }

  function reveal() {
    if (revealed) return;
    revealed = true;
    relojes.forEach(clearTimeout);
    stage.classList.add('gone');
    $('crt').classList.add('on');
    bar.classList.add('on');
    radio.classList.add('on');
    skip.hidden = true;
    try { sessionStorage.setItem('cinta-vista', '1'); } catch (e) {}
    luego(700, function () { stage.hidden = true; });
    tick();
  }

  skip.addEventListener('click', reveal);

  var yaVista = false;
  try { yaVista = sessionStorage.getItem('cinta-vista') === '1'; } catch (e) {}

  if (reduce || yaVista) {
    reveal();
  } else {
    var world = $('world'), sigbox = $('sigbox'), wiperect = $('wiperect'),
        sigline = $('sigline'), rig = $('rig'), cassette = $('cassette'),
        slot = $('slot'), led = $('led'), disp = $('disp'),
        estatica = $('static'), barras = $('bars');

    // 0.0 — la firma se escribe (barrido sobre el trazo)
    wiperect.animate(
      [{ width: '0px' }, { width: '800px' }],
      { duration: 1500, easing: 'cubic-bezier(.5,.05,.3,1)', fill: 'forwards' }
    );
    luego(1250, function () {
      sigline.animate(
        [{ width: '0px', x: '400px' }, { width: '560px', x: '120px' }],
        { duration: 480, easing: 'ease-out', fill: 'forwards' }
      );
    });

    // 1.9 — la firma se apaga y aparece el casete con ella en la etiqueta
    luego(1900, function () { sigbox.classList.add('gone'); });
    luego(2150, function () { cassette.classList.add('on'); });

    // 2.5 — la camara retrocede y revela el equipo completo
    luego(2500, function () {
      world.classList.add('pullback');
      rig.classList.add('on');
    });

    // 3.6 — se abre la ranura y el casete entra
    luego(3600, function () { slot.classList.add('open'); });
    luego(3750, function () { cassette.classList.add('insert'); });

    // 5.2 — clac: cierra la ranura, enciende el LED y arranca el contador
    luego(5200, function () {
      slot.classList.remove('open');
      led.classList.add('on');
      disp.classList.add('on');
      disp.textContent = '00:00';
      estatica.classList.add('on');
    });

    // 5.8 — barras de color
    luego(5800, function () {
      estatica.classList.remove('on');
      barras.classList.add('on');
    });

    // 6.3 — la camara entra en la pantalla y corta a negro antes del contenido
    luego(6300, function () { world.classList.add('pushin'); });
    // corte a negro: se apagan las barras y queda el fondo del tubo
    luego(7400, function () { $('bars').classList.remove('on'); });
    luego(7640, reveal);
  }

  // Si alguien baja antes de que termine, la apertura se corta sola.
  window.addEventListener('scroll', function () {
    if (!revealed && window.scrollY > 40) reveal();
  }, { passive: true });

  /* -------------------------------- timecode y limpieza progresiva de ruido */

  var tc = $('tc'), root = document.documentElement;

  function tick() {
    var max = root.scrollHeight - root.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 0;
    var yr = 20 + p * 6;
    var m = Math.floor(yr);
    var s = Math.floor((yr - m) * 60);
    tc.textContent = '00:' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    // El grano arranca al maximo en 2020 y llega a cero antes del final.
    root.style.setProperty('--noise', String(Math.max(0, 1 - p * 1.25)));
  }

  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  tick();

  /* ---------------------------------------------------------- 01 claqueta */

  var clap = $('clap'), s1 = $('s1'), h1 = $('h1');
  clap.addEventListener('click', function () {
    var on = clap.classList.toggle('on');
    s1.classList.toggle('on', on);
    clap.setAttribute('aria-expanded', String(on));
    h1.textContent = on ? '▸ ESCENA 01 — HABILIDADES' : '▸ TOCÁ LA CLAQUETA';
    if (on) blip(880);
  });

  /* ------------------------------------------------------------ 02 grilla */

  var gout = $('gout');
  var slots = document.querySelectorAll('.slot');
  Array.prototype.forEach.call(slots, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(slots, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      gout.textContent = b.dataset.d;
      blip(660);
    });
  });

  /* ---------------------------------------------------------- 03 switcher */

  var pgm = $('pgm'), pgmtxt = $('pgmtxt'), live = [];
  Array.prototype.forEach.call(document.querySelectorAll('.fader'), function (b) {
    b.addEventListener('click', function () {
      var on = b.classList.toggle('on');
      b.setAttribute('aria-pressed', String(on));
      var s = b.dataset.s;
      if (on) { live.push(s); blip(1040); }
      else { live = live.filter(function (x) { return x !== s; }); }
      pgm.classList.toggle('live', live.length > 0);
      pgmtxt.textContent = live.length
        ? 'PGM — AL AIRE: ' + live.join(' · ')
        : 'PGM — NADA AL AIRE';
    });
  });

  /* ------------------------------------------------------------ 04 tienda */

  var added = 0, visitas = 137;
  $('cart').addEventListener('click', function () {
    if (added >= 4) return;
    added++;
    $('st' + added).textContent = '✓ en el carrito';
    visitas += Math.floor(Math.random() * 7) + 2;
    $('vis').textContent = String(visitas).padStart(6, '0');
    blip(520 + added * 90);
  });

  /* -------------------------------------------------------------- 05 chat */

  var CHARLA = [
    ['Cliente', 'Hola! vi el auto publicado, ¿sigue disponible?'],
    ['Vos', 'Sí, lo tengo acá al lado. ¿Querés verlo hoy?'],
    ['— habilidad', 'Prospección y cierre'],
    ['Cliente', 'Che, ¿y las redes de la marca las manejás vos?'],
    ['Vos', 'Sí. Contenido, calendario y respuesta. Todo.'],
    ['— habilidad', 'Community management · Copy · Contenido']
  ];
  var ci = 0, chatb = $('chatb');

  function nextMsg() {
    if (ci >= CHARLA.length) { ci = 0; chatb.textContent = ''; }
    var m = CHARLA[ci];
    var d = document.createElement('div');
    d.className = 'msg' + (m[0] === 'Vos' ? ' me' : '');
    var who = document.createElement('b');
    who.textContent = m[0];
    var txt = document.createElement('span');
    txt.textContent = m[1];
    d.appendChild(who);
    d.appendChild(txt);
    chatb.appendChild(d);
    ci++;
    blip(740);
  }

  $('chatnext').addEventListener('click', nextMsg);
  nextMsg();

  /* --------------------------------------------------------- 06 disquetes */

  var dout = $('dout');
  var disks = document.querySelectorAll('.disk');
  Array.prototype.forEach.call(disks, function (b) {
    b.addEventListener('click', function () {
      Array.prototype.forEach.call(disks, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      dout.textContent = b.dataset.d;
      blip(600);
    });
  });

  /* -------------------------------------------------------------- radio */

  var ac = null, timer = null, step = 0, emisora = 0, sonando = false;

  var EMISORAS = [
    {
      nombre: '88.5  EURODANCE', bpm: 140, onda: 'sawtooth', corte: 1500,
      bajo: [0, 0, 7, 0, 0, 0, 5, 0], melodia: [12, null, 10, 12, 15, null, 12, 10]
    },
    {
      nombre: '92.1  HOUSE', bpm: 124, onda: 'square', corte: 950,
      bajo: [0, null, 0, null, 3, null, 5, null], melodia: [7, 7, null, 10, null, 12, null, 7]
    },
    {
      nombre: '96.7  BALADA', bpm: 88, onda: 'triangle', corte: 760,
      bajo: [0, null, null, null, 5, null, null, null], melodia: [12, null, null, 10, null, null, 8, null]
    },
    {
      nombre: '101.3  CHIPTUNE', bpm: 160, onda: 'square', corte: 2800,
      bajo: [0, 0, null, 0, 7, null, 7, null], melodia: [12, 15, 19, 15, 12, 10, 12, null]
    }
  ];

  function hz(semitono) { return 110 * Math.pow(2, semitono / 12); }

  function nota(frec, t, dur, onda, vol, corte) {
    var o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = onda;
    o.frequency.value = frec;
    f.type = 'lowpass';
    f.frequency.value = corte;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(f); f.connect(g); g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function charles(t) {
    var b = ac.createBuffer(1, 1700, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = b;
    f.type = 'highpass';
    f.frequency.value = 7200;
    g.gain.value = 0.045;
    s.connect(f); f.connect(g); g.connect(ac.destination);
    s.start(t);
  }

  function correr() {
    var e = EMISORAS[emisora];
    var spb = 60 / e.bpm / 2;
    var t = ac.currentTime + 0.04;
    var i = step % 8;
    if (e.bajo[i] !== null) nota(hz(e.bajo[i] - 12), t, spb * 0.9, e.onda, 0.15, e.corte);
    if (e.melodia[i] !== null) nota(hz(e.melodia[i]), t, spb * 0.7, e.onda, 0.065, e.corte);
    if (i % 2 === 1) charles(t);
    step++;
    timer = setTimeout(correr, spb * 1000);
  }

  function blip(f) {
    if (ac) nota(f || 880, ac.currentTime, 0.06, 'square', 0.04, 5000);
  }

  var dial = $('dial'), play = $('play');

  function sintonizar(n) {
    emisora = n;
    step = 0;
    dial.textContent = EMISORAS[n].nombre;
    Array.prototype.forEach.call(radio.querySelectorAll('[data-st]'), function (b) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.st) === n));
    });
  }

  function encender() {
    if (ac) return true;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { dial.textContent = 'SIN AUDIO'; return false; }
    try { ac = new Ctx(); } catch (e) { dial.textContent = 'SIN AUDIO'; return false; }
    sintonizar(0);
    return true;
  }

  play.addEventListener('click', function () {
    if (!encender()) return;
    if (ac.state === 'suspended') ac.resume();
    sonando = !sonando;
    play.textContent = sonando ? '■ STOP' : '▶ PLAY';
    play.setAttribute('aria-pressed', String(sonando));
    if (sonando) correr(); else clearTimeout(timer);
  });

  Array.prototype.forEach.call(radio.querySelectorAll('[data-st]'), function (b) {
    b.addEventListener('click', function () {
      if (!encender()) return;
      sintonizar(Number(b.dataset.st));
      if (!sonando) play.click(); else blip(1200);
    });
  });
})();
