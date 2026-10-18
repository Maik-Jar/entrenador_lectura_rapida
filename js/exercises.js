// Ejercicios de lectura con puntero: sangría visual, reducción de fijaciones, bloqueo fonético y sobrevuelo.
import { h, store, fmtClock, intro, defaultWpl, openModal, Countdown, Metronome } from './util.js';
import { Reader } from './reader.js';
import { currentText } from './texto.js';

const SYLLABLES = { num: ['UN', 'DOS', 'TRES'], abc: ['A', 'B', 'C'] };

function rangeCtl(s, key, label, min, max, step, show, onChange) {
  const out = h('output', {}, show(s[key]));
  const input = h('input', {
    type: 'range', min, max, step, value: s[key],
    oninput: e => { s[key] = +e.target.value; out.textContent = show(s[key]); onChange(key); },
  });
  return h('label', { class: 'ctl' }, h('span', {}, label, ' ', out), input);
}

function checkCtl(s, key, label, onChange) {
  const input = h('input', { type: 'checkbox', onchange: e => { s[key] = e.target.checked; onChange(key); } });
  input.checked = s[key];
  return h('label', { class: 'ctl check' }, input, label);
}

function selectCtl(s, key, label, options, onChange) {
  const sel = h('select', {
    onchange: e => { const v = e.target.value; s[key] = isNaN(+v) ? v : +v; onChange(key); },
  }, options.map(([v, t]) => h('option', { value: v }, t)));
  sel.value = String(s[key]);
  return h('label', { class: 'ctl' }, h('span', {}, label), sel);
}

const CONTROLS = {
  ppm: (s, on) => rangeCtl(s, 'ppm', 'Velocidad', 100, 1000, 25, v => `${v} PPM`, on),
  wpl: (s, on) => rangeCtl(s, 'wpl', 'Palabras por línea', 3, 15, 1, v => v, on),
  chunks: (s, on) => selectCtl(s, 'chunks', 'Fijaciones por línea', [[2, '2 fijaciones'], [3, '3 fijaciones']], on),
  margins: (s, on) => checkCtl(s, 'margins', 'Atenuar primera y última palabra', on),
  minutes: (s, on) => rangeCtl(s, 'minutes', 'Duración', 1, 10, 1, v => `${v} min`, on),
  bpm: (s, on) => rangeCtl(s, 'bpm', 'Ritmo', 60, 240, 10, v => `${v} pulsos/min`, on),
  syl: (s, on) => selectCtl(s, 'syl', 'Repetir', [['num', 'Un-dos-tres'], ['abc', 'A-B-C']], on),
  sound: (s, on) => checkCtl(s, 'sound', 'Sonido de metrónomo', on),
  p1: (s, on) => rangeCtl(s, 'p1', 'Fase 1 (sobrevuelo)', 0.5, 3, 0.25, v => `${v} s/línea`, on),
  p2: (s, on) => rangeCtl(s, 'p2', 'Fase 2 (calma)', 0.5, 4, 0.25, v => `${v} s/línea`, on),
  fixFrom: (s, on) => rangeCtl(s, 'fixFrom', 'Fijaciones al empezar', 3, 10, 1, v => v, on),
  fixTo: (s, on) => selectCtl(s, 'fixTo', 'Fijaciones objetivo', [[2, '2 fijaciones'], [3, '3 fijaciones']], on),
  fixMs: (s, on) => rangeCtl(s, 'fixMs', 'Duración de cada fijación', 150, 600, 25, v => `${v} ms`, on),
};

const ppmOf = (s, secPerLine) => Math.round((s.wpl * 60) / secPerLine);

const loadSettings = cfg => ({ ...cfg.defaults, ...store.get('cfg:' + cfg.id, {}) });
// En la rutina la duración la fija el plan, así que no se ofrece.
const controlKeys = cfg => cfg.controls.filter(k => !(cfg.embedded && k === 'minutes'));

function mountReading(root, cfg) {
  const { embedded = false, onDone } = cfg;
  const s = loadSettings(cfg);
  const text = currentText();
  // Las fases pueden depender de los ajustes (p. ej. cuántos niveles de fijaciones hay).
  const phases = () => (typeof cfg.phases === 'function' ? cfg.phases(s) : cfg.phases);
  const cur = () => { const ps = phases(); return ps[Math.min(phase, ps.length - 1)]; };
  let phase = 0, timer = null, state = 'idle', configuring = false;

  const status = h('span', { class: 'status' }, 'Listo para empezar');
  const clock = h('span', { class: 'clock' }, fmtClock(phases()[0].ms(s)));
  const btn = h('button', { class: 'btn primary', onclick: toggle }, 'Iniciar');
  const readerBox = h('div');
  const reader = new Reader(readerBox, text.body, {
    mode: cfg.mode, wordsPerLine: s.wpl, chunks: phases()[0].chunks?.(s) ?? s.chunks, margins: s.margins,
    secPerLine: phases()[0].secPerLine(s),
  });

  let metro = null, beatEl = null;
  if (cfg.metronome) {
    beatEl = h('div', { class: 'beat', 'aria-hidden': 'true' });
    metro = new Metronome(renderBeat);
    metro.bpm = s.bpm;
    metro.sound = s.sound;
    renderBeat(-1);
  }

  function renderBeat(n) {
    beatEl.replaceChildren(...SYLLABLES[s.syl].map((t, i) => h('span', { class: i === n % 3 ? 'on' : '' }, t)));
  }

  // Aplica al lector la velocidad (y, si la fase lo define, las fijaciones) de la fase actual.
  // Con queue=true el cambio entra al empezar la siguiente línea (paso de fase o nivel).
  function applyPhase(queue = false) {
    const p = cur();
    const chunks = p.chunks?.(s);
    const opts = chunks && chunks !== reader.opts.chunks ? { secPerLine: p.secPerLine(s), chunks } : { secPerLine: p.secPerLine(s) };
    if (queue) reader.queue(opts);
    else reader.set(opts);
  }

  function onChange(key) {
    store.set('cfg:' + cfg.id, s);
    if (key === 'wpl') { reader.set({ wordsPerLine: s.wpl }); applyPhase(); }
    else if (key === 'chunks' || key === 'margins') reader.set({ [key]: s[key] });
    else if (key === 'bpm') metro?.setBpm(s.bpm);
    else if (key === 'sound') { if (metro) metro.sound = s.sound; }
    else if (key === 'syl') renderBeat(-1);
    else if (key === 'minutes') { if (state === 'idle' || state === 'done') clock.textContent = fmtClock(phases()[0].ms(s)); }
    else applyPhase();
    if (state === 'running' || state === 'paused') status.textContent = cur().label(s);
    else clock.textContent = fmtClock(phases()[0].ms(s));
  }

  function startPhase() {
    const p = cur();
    applyPhase(true);
    status.textContent = p.label(s);
    timer = new Countdown(p.ms(s), left => { clock.textContent = fmtClock(left); }, () => {
      phase++;
      if (phase < phases().length) {
        startPhase();
        timer.start();
      } else finish();
    });
  }

  async function toggle() {
    if (configuring) return;
    if (state === 'running') {
      state = 'paused';
      timer.pause();
      reader.pause();
      metro?.stop();
      btn.textContent = 'Continuar';
      return;
    }
    if (state === 'paused') {
      state = 'running';
      timer.start();
      reader.play();
      metro?.start();
      btn.textContent = 'Pausar';
      return;
    }
    if (!embedded) {
      // Ajustes antes de empezar, para no tener que tocarlos durante el ejercicio.
      configuring = true;
      const ok = await openModal(`Ajustes · ${cfg.title}`, h('div', { class: 'controls' }, buildControls()));
      configuring = false;
      settings.replaceChildren(...buildControls());
      if (!ok) return;
    }
    if (state === 'done') reader.reset();
    phase = 0;
    state = 'running';
    startPhase();
    timer.start();
    reader.play();
    metro?.start();
    btn.textContent = 'Pausar';
  }

  function finish() {
    state = 'done';
    reader.pause();
    metro?.stop();
    if (beatEl) renderBeat(-1);
    btn.textContent = 'Repetir';
    status.textContent = '¡Ejercicio completado!';
    clock.textContent = '0:00';
    onDone?.();
  }

  const onKey = e => {
    if (e.code !== 'Space' || e.target.closest('input, select, textarea, button')) return;
    e.preventDefault();
    toggle();
  };
  document.addEventListener('keydown', onKey);

  const buildControls = () => controlKeys(cfg).map(k => CONTROLS[k](s, onChange));
  const settings = h('div', { class: 'controls' }, buildControls());

  root.append(...[
    ...(embedded ? [] : intro(cfg.title, cfg.lead, cfg.steps, cfg.goal)),
    h('details', { class: 'settings' },
      h('summary', {}, 'Ajustes'),
      settings),
    h('div', { class: 'toolbar' }, btn, status, clock),
    beatEl,
    readerBox,
    h('p', { class: 'muted small' },
      `Texto: ${text.title}`,
      embedded ? '' : [' · ', h('a', { href: '#/texto' }, 'cambiar')],
      ' · Toca una línea para saltar a ella · Espacio = iniciar/pausar'),
  ].filter(Boolean));

  if (embedded) toggle();

  return () => {
    timer?.stop();
    reader.pause();
    metro?.close();
    document.removeEventListener('keydown', onKey);
  };
}

const DEFS = {
  sangria: o => ({
    ...o,
    id: 'sangria',
    mode: 'chunks',
    title: 'Sangría visual',
    lead: 'Las primeras y últimas palabras de cada línea están rodeadas de espacio en blanco. Aprovecharás tu visión periférica para captarlas sin apuntar directamente a ellas.',
    steps: [
      'El resaltado marca dónde fijar la vista: 2 o 3 bloques por línea.',
      'Tu primera fijación cae en la segunda o tercera palabra; la última, en la penúltima.',
      'Deja que la visión periférica capte la primera y la última palabra (atenuadas) automáticamente.',
      'Sigue el resaltado sin regresar; ajusta la velocidad cuando te resulte cómodo.',
    ],
    goal: 'Reducir las paradas a 2 o 3 por línea.',
    defaults: { ppm: 300, wpl: defaultWpl(), chunks: 3, margins: true, minutes: 3 },
    controls: ['ppm', 'wpl', 'chunks', 'margins', 'minutes'],
    phases: [{
      ms: s => (o.minutes ?? s.minutes) * 60000,
      secPerLine: s => (s.wpl * 60) / s.ppm,
      label: s => `Lectura por bloques · ${s.ppm} PPM`,
    }],
  }),

  fonetico: o => ({
    ...o,
    id: 'fonetico',
    mode: 'line',
    metronome: true,
    title: 'Bloqueo fonético',
    lead: 'Este método satura el canal articulatorio-auditivo del cerebro para forzar la ruta visual directa.',
    steps: [
      'Mientras la vista sigue el puntero a ritmo constante, repite al compás del metrónomo: "Un-dos-tres" o "A-B-C".',
      'Mantén la lengua ligeramente pegada al paladar o muerde suavemente un lápiz en horizontal.',
      'Concéntrate solo en las imágenes y conceptos que representan las palabras, ignorando el ruido que generas.',
      'Al principio la comprensión bajará: es normal mientras el cerebro adapta sus circuitos visuales.',
    ],
    goal: 'Leer sin "oír" las palabras en tu cabeza.',
    defaults: { ppm: 250, wpl: defaultWpl(), bpm: 150, syl: 'num', sound: true, minutes: 3 },
    controls: ['ppm', 'wpl', 'bpm', 'syl', 'sound', 'minutes'],
    phases: [{
      ms: s => (o.minutes ?? s.minutes) * 60000,
      secPerLine: s => (s.wpl * 60) / s.ppm,
      label: s => `Bloqueo fonético · ${s.ppm} PPM`,
    }],
  }),

  fijaciones: fijacionesDef,
  escoba: escobaDef,
};

// Niveles de fijaciones por línea, de fixFrom a fixTo; cada fijación dura lo mismo, así que
// al hacer menos paradas por línea la lectura se acelera sola.
function fijacionesDef(o) {
  const levels = s => {
    const from = Math.max(s.fixTo, Math.min(s.fixFrom, s.wpl));
    return Array.from({ length: from - s.fixTo + 1 }, (_, k) => from - k);
  };
  const secPerLine = n => s => (n * s.fixMs) / 1000;
  return {
    ...o,
    id: 'fijaciones',
    mode: 'fix',
    title: 'Reducción de fijaciones',
    lead: 'Al leer, el ojo no se desliza: salta y se detiene (fija) casi en cada palabra. En una línea de 7 palabras suele hacer 7 paradas. Este ejercicio te entrena para captar varias palabras en cada parada hasta leer la línea con solo 2 o 3.',
    steps: [
      'Cada línea está dividida en bloques. El punto rojo marca dónde fijar la vista: el centro del bloque resaltado.',
      'Salta de bloque en bloque sin detenerte en las palabras sueltas; deja que la visión periférica capte las de los lados.',
      'Empiezas con varias fijaciones por línea y, conforme avanza el tiempo, el número baja nivel a nivel hasta 2 o 3.',
      'Cada fijación dura lo mismo, por lo que menos paradas significan más velocidad. No regreses a releer.',
    ],
    goal: 'Pasar de una fijación por palabra a 2 o 3 por línea.',
    defaults: { wpl: 7, fixFrom: 5, fixTo: 3, fixMs: 300, minutes: 4 },
    controls: ['wpl', 'fixFrom', 'fixTo', 'fixMs', 'minutes'],
    phases: s => {
      const ls = levels(s);
      return ls.map((n, k) => ({
        ms: s => ((o.minutes ?? s.minutes) * 60000) / ls.length,
        chunks: () => n,
        secPerLine: secPerLine(n),
        label: s => `Nivel ${k + 1}/${ls.length} · ${n} fijaciones por línea (≈${ppmOf(s, secPerLine(n)(s))} PPM)`,
      }));
    },
  };
}

function escobaDef(o) {
  const fase1 = {
    ms: () => 120000,
    secPerLine: s => s.p1,
    label: s => `Fase 1 · sobrevuelo a ${s.p1} s/línea (≈${ppmOf(s, s.p1)} PPM) — no te detengas`,
  };
  const fase2 = {
    ms: () => 60000,
    secPerLine: s => s.p2,
    label: s => `Fase 2 · ${s.p2} s/línea (≈${ppmOf(s, s.p2)} PPM) — nota la calma`,
  };
  return {
    ...o,
    id: 'escoba',
    mode: 'line',
    title: 'Sobrevuelo a alta velocidad',
    lead: 'Técnica de la escoba: forzarás a la mente a procesar información visual a velocidades donde la voz humana sencillamente no puede competir.',
    steps: [
      'Sigue con los ojos la barra que se desliza bajo cada línea, a 1 segundo por línea.',
      'No te detengas bajo ninguna circunstancia. No intentes pronunciar ninguna palabra: limítate a "fotografiar" el texto.',
      'Tras 2 minutos la velocidad baja automáticamente a unos 2 segundos por línea.',
      'Notarás cómo empiezas a comprender bloques de palabras sin necesidad de "oírlas".',
    ],
    goal: 'Reajustar tu límite de velocidad mental.',
    defaults: { wpl: defaultWpl(), p1: 1, p2: 2 },
    controls: o.routine ? ['wpl', 'p1'] : ['wpl', 'p1', 'p2'],
    phases: o.routine ? [fase1] : [fase1, fase2],
  };
}

export const mountSangria = (root, o = {}) => mountReading(root, DEFS.sangria(o));
export const mountFonetico = (root, o = {}) => mountReading(root, DEFS.fonetico(o));
export const mountEscoba = (root, o = {}) => mountReading(root, DEFS.escoba(o));
export const mountFijaciones = (root, o = {}) => mountReading(root, DEFS.fijaciones(o));

// Controles que editan directamente los ajustes guardados de un ejercicio (para configurar
// antes de montarlo, p. ej. desde la rutina).
export function storedControls(id, o = {}) {
  const cfg = DEFS[id](o);
  const s = loadSettings(cfg);
  return controlKeys(cfg).map(k => CONTROLS[k](s, () => store.set('cfg:' + id, s)));
}
