// La banda de sonido de la apertura y el zumbido del tubo, sintetizados.
// Ni un archivo de audio: todo sale de osciladores y de ruido generado en el
// momento. Un VHS no suena a muestra de 44 kHz, suena a motor, a plastico y a
// cinta rozando la cabeza, y eso se arma con tres filtros y una envolvente.
// Se carga en diferido: quien no enciende el sonido no baja ni un byte.

/* ------------------------------------------------------------------ ruido -- */
// Un buffer de ruido se reusa para todos los golpes: generarlo cuesta
// milisegundos y la apertura dispara una docena de capas en dos segundos.

const buffers = new Map();

function ruido(ac, segundos) {
  const clave = segundos.toFixed(2);
  let b = buffers.get(clave);
  if (b) return b;
  b = ac.createBuffer(1, Math.ceil(ac.sampleRate * segundos), ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  buffers.set(clave, b);
  return b;
}

/* ----------------------------------------------------------------- crear -- */

export function crear(ac, bus) {
  let vivo = true;
  const permanentes = [];

  // Submezcla propia. La radio ya esta calibrada y cuelga directo del bus; la
  // apertura necesita 3,5 dB mas para no quedar por debajo de todo lo demas.
  const propio = ac.createGain();
  propio.gain.value = 1.5;
  propio.connect(bus);

  function salida() {
    const g = ac.createGain();
    g.connect(propio);
    return g;
  }

  // Un disparo de ruido con filtro y envolvente propia.
  function soplo(t, opciones) {
    const o = opciones;
    const dur = o.dur;
    const s = ac.createBufferSource();
    s.buffer = ruido(ac, Math.max(0.25, dur));
    s.playbackRate.value = o.vel || 1;

    const f = ac.createBiquadFilter();
    f.type = o.filtro || 'bandpass';
    f.Q.value = o.q == null ? 0.9 : o.q;
    f.frequency.setValueAtTime(o.desde, t);
    if (o.hasta) f.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);

    const g = salida();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol, t + (o.atk == null ? 0.004 : o.atk));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    s.connect(f);
    f.connect(g);
    s.start(t);
    s.stop(t + dur + 0.05);
  }

  // Un cuerpo tonal: el plastico de la caja, el golpe del mecanismo, el tono
  // de barras. Con rampa de frecuencia si hace falta que caiga o suba.
  function cuerpo(t, opciones) {
    const o = opciones;
    const dur = o.dur;
    const osc = ac.createOscillator();
    osc.type = o.onda || 'sine';
    osc.frequency.setValueAtTime(o.frec, t);
    if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);

    const g = salida();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.vol, t + (o.atk == null ? 0.003 : o.atk));
    if (o.sost) g.gain.setValueAtTime(o.vol, t + o.sost);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /* --------------------------------------------------------------- piezas -- */

  // Plastico contra plastico: ruido corto y agudo mas un cuerpo hueco.
  function chasquido(t, vol) {
    soplo(t, { dur: 0.055, desde: 2600, hasta: 1100, q: 1.1, vol: vol * 0.5 });
    cuerpo(t, { frec: 190, hasta: 95, dur: 0.07, vol: vol * 0.35 });
  }

  // El motor de la videograbadora: sierra grave con armonicos filtrados.
  function motor(t, dur, f0, f1, vol) {
    const osc = ac.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.55);
    osc.frequency.exponentialRampToValueAtTime(f1 * 0.94, t + dur);

    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    f.Q.value = 3.2;

    const g = salida();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.09);
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(f);
    f.connect(g);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    // El roce de la cinta encima del motor.
    soplo(t + 0.04, { dur: dur - 0.06, desde: 900, hasta: 2000, q: 0.5, vol: vol * 0.5, atk: 0.12 });
  }

  /* ------------------------------------------------------- ambiente fijo -- */
  // Tres capas que no se apagan: el roce de la cinta, el zumbido de 50 Hz del
  // transformador y el chillido de la bobina de linea. El chillido real de un
  // tubo PAL es de 15.625 kHz; se deja en su frecuencia, mas un subarmonico
  // muy bajo para quienes ya no escuchan esa banda.

  function capaRuido(centro, q, vol) {
    const s = ac.createBufferSource();
    s.buffer = ruido(ac, 2);
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = centro;
    f.Q.value = q;
    const g = salida();
    g.gain.value = 0;
    s.connect(f);
    f.connect(g);
    s.start();
    permanentes.push(s);
    return { g: g, vol: vol };
  }

  function capaTono(frec, vol, onda) {
    const osc = ac.createOscillator();
    osc.type = onda || 'sine';
    osc.frequency.value = frec;
    const g = salida();
    g.gain.value = 0;
    osc.connect(g);
    osc.start();
    permanentes.push(osc);
    return { g: g, vol: vol, osc: osc };
  }

  const cinta = capaRuido(1500, 0.55, 0.034);
  const aire = capaRuido(240, 0.7, 0.022);
  const zumbido = capaTono(50, 0.016, 'sine');
  const armonico = capaTono(150, 0.007, 'sine');
  const bobina = capaTono(15625, 0.009);
  const sub = capaTono(7812, 0.0055);

  // Niveles de ambiente por momento de la secuencia. El tubo solo zumba
  // cuando esta encendido, y adentro del vidrio todo se cierra.
  const AMBIENTES = {
    silencio: [0, 0, 0, 0, 0, 0],
    cinta: [1, 0.55, 0, 0, 0, 0],
    sala: [0.75, 1, 0, 0, 0, 0],
    tubo: [0.8, 0.7, 1, 1, 1, 1],
    dentro: [0.45, 0.35, 1.25, 1.1, 1.35, 1.3],
    reposo: [0.3, 0.25, 0.75, 0.7, 0.85, 0.85]
  };

  let actual = 'silencio';

  function ambiente(nombre, seg) {
    if (!vivo) return;
    const mezcla = AMBIENTES[nombre];
    if (!mezcla) return;
    actual = nombre;
    const t = ac.currentTime;
    const dur = seg == null ? 0.8 : seg;
    const capas = [cinta, aire, zumbido, armonico, bobina, sub];
    for (let i = 0; i < capas.length; i++) {
      const g = capas[i].g.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(capas[i].vol * mezcla[i], t + dur);
    }
  }

  /* ---------------------------------------------------------------- pasos -- */
  // Cada clave es un momento de la secuencia en 3D. La escena las dispara
  // cuando llega, no en un horario fijo: si una maquina lenta pierde
  // fotogramas el sonido sigue pegado a la imagen.

  const PASOS = {
    // Primerisimo plano del casete girando.
    girar: function (t) {
      ambiente('cinta', 1.4);
      soplo(t, { dur: 1.1, desde: 300, hasta: 1400, q: 0.5, vol: 0.06, atk: 0.5 });
      cuerpo(t + 0.1, { frec: 62, hasta: 44, dur: 1.6, vol: 0.075, atk: 0.4 });
    },

    // La camara retrocede y aparece la habitacion.
    alejar: function (t) {
      ambiente('sala', 2.2);
      soplo(t, { dur: 2.2, desde: 2600, hasta: 320, q: 0.45, vol: 0.085, atk: 0.3 });
    },

    // El casete se endereza frente a la ranura: dos roces de mano.
    tomar: function (t) {
      chasquido(t + 0.02, 0.24);
      chasquido(t + 0.33, 0.17);
    },

    // Baja hasta la boca de la ranura.
    bajar: function (t) {
      soplo(t, { dur: 0.62, desde: 1800, hasta: 700, q: 0.8, vol: 0.095, atk: 0.26 });
    },

    // Apoya y entra empujado: el golpe va al principio del tramo que lo
    // provoca, no a un horario calculado, asi no se despega en maquinas lentas.
    entrar: function (t) {
      chasquido(t, 0.28);
      soplo(t + 0.03, { dur: 0.42, desde: 700, hasta: 2400, q: 1.4, vol: 0.14, atk: 0.14 });
    },

    // Clac del mecanismo de carga, el motor arranca y la pantalla llueve.
    cargar: function (t) {
      chasquido(t, 0.42);
      cuerpo(t + 0.01, { frec: 150, hasta: 60, dur: 0.16, vol: 0.24 });
      soplo(t + 0.04, { dur: 0.3, desde: 420, hasta: 180, q: 1.6, vol: 0.15 });
      motor(t + 0.12, 1.5, 34, 86, 0.105);
      // La nieve de la pantalla sin senal.
      soplo(t + 0.5, { dur: 1.3, desde: 2800, q: 0.35, filtro: 'highpass', vol: 0.07, atk: 0.3 });
    },

    // Barras de color: desmagnetizado del tubo y tono de 1 kHz.
    barras: function (t) {
      ambiente('tubo', 0.7);
      // El golpe sordo de la bobina desmagnetizadora.
      cuerpo(t, { frec: 108, hasta: 38, dur: 0.42, vol: 0.22 });
      soplo(t, { dur: 0.1, desde: 1400, hasta: 400, q: 0.7, vol: 0.13 });
      // El tono de ajuste, con el ataque y la caida suaves de un generador.
      cuerpo(t + 0.1, { frec: 1000, dur: 0.6, vol: 0.07, atk: 0.03, sost: 0.4 });
    },

    // La camara entra en el vidrio: todo sube y se cierra.
    vidrio: function (t) {
      ambiente('dentro', 1.5);
      soplo(t, { dur: 1.5, desde: 400, hasta: 3200, q: 0.4, vol: 0.095, atk: 0.9 });
      cuerpo(t, { frec: 70, hasta: 210, dur: 1.5, vol: 0.08, atk: 0.9 });
    },

    // Ya adentro: la imagen se asienta y queda el zumbido de fondo.
    fin: function (t) {
      soplo(t, { dur: 0.22, desde: 3000, hasta: 900, q: 0.9, vol: 0.13 });
      cuerpo(t, { frec: 240, hasta: 90, dur: 0.2, vol: 0.1 });
      ambiente('reposo', 2.6);
    }
  };

  // Cuando alguien enciende el sonido a mitad de la apertura, el ambiente se
  // pone donde corresponde sin disparar el golpe que ya paso.
  const DONDE = {
    girar: 'cinta', alejar: 'sala', tomar: 'sala', bajar: 'sala',
    entrar: 'sala', cargar: 'sala', barras: 'tubo', vidrio: 'dentro', fin: 'reposo'
  };

  function paso(nombre) {
    if (!vivo) return;
    const fn = PASOS[nombre];
    if (fn) fn(ac.currentTime + 0.02);
  }

  function desde(nombre) {
    ambiente(DONDE[nombre] || 'silencio', 0.5);
  }

  function cerrar() {
    vivo = false;
    permanentes.forEach(function (n) { try { n.stop(); } catch (e) {} });
    permanentes.length = 0;
  }

  return { paso: paso, ambiente: ambiente, desde: desde, cerrar: cerrar, donde: function () { return actual; } };
}
