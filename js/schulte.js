// Tablas de Schulte: buscar los números en orden sin mover la vista del centro.
import { h, store, fmtSecs, fmtClock, shuffle, intro, Countdown } from './util.js';

const loadCfg = () => ({ size: 5, mode: 'clic', ...store.get('cfg:schulte', {}) });

function settingsCtls(cfg, onChange) {
  const sizeSel = h('select', {
    onchange: e => { cfg.size = +e.target.value; store.set('cfg:schulte', cfg); onChange(); },
  }, [3, 5, 7].map(n => h('option', { value: n }, `${n}×${n}`)));
  sizeSel.value = cfg.size;

  const modeSel = h('select', {
    onchange: e => { cfg.mode = e.target.value; store.set('cfg:schulte', cfg); onChange(); },
  }, h('option', { value: 'clic' }, 'Clic: toca cada número'), h('option', { value: 'foco' }, 'Foco: pulsa Espacio, sin mover la vista'));
  modeSel.value = cfg.mode;

  return [
    h('label', { class: 'ctl' }, h('span', {}, 'Tamaño'), sizeSel),
    h('label', { class: 'ctl' }, h('span', {}, 'Modo'), modeSel),
  ];
}

// Controles que editan los ajustes guardados, para configurar antes de montar el ejercicio.
export const storedSchulteControls = () => settingsCtls(loadCfg(), () => {});

export function mountSchulte(root, { embedded = false, durationMs = 0, onDone } = {}) {
  const cfg = loadCfg();
  let next = 1, errors = 0, t0 = 0, raf = 0, running = false, countdown = null, restartId = 0;
  const history = [];

  const target = h('strong', { class: 'target' }, '—');
  const time = h('span', { class: 'time' }, '0.0 s');
  const best = h('span', { class: 'muted' });
  const grid = h('div', { class: 'schulte idle' });
  const startBtn = h('button', { class: 'btn primary', onclick: start }, 'Iniciar');
  const foundBtn = h('button', { class: 'btn found', onclick: advance }, 'Encontrado (Espacio)');
  const histList = h('ol', { class: 'history' });
  const clock = h('span', { class: 'clock' });

  const total = () => cfg.size * cfg.size;
  const bestKey = () => `best:schulte:${cfg.size}:${cfg.mode}`;

  function build() {
    const n = total();
    const center = (n - 1) / 2;
    grid.style.setProperty('--n', cfg.size);
    grid.replaceChildren(...shuffle([...Array(n)].map((_, i) => i + 1)).map((num, i) => h('button', {
      class: i === center ? 'cell center' : 'cell',
      tabindex: -1,
      onclick: e => pick(num, e.currentTarget),
    }, n >= 10 ? String(num).padStart(2, '0') : num)));
  }

  function flash(cell, cls) {
    cell.classList.remove('ok', 'bad');
    void cell.offsetWidth; // reinicia la animación
    cell.classList.add(cls);
  }

  function pick(num, cell) {
    if (!running || cfg.mode !== 'clic') return;
    if (num === next) {
      flash(cell, 'ok');
      advance();
    } else {
      errors++;
      flash(cell, 'bad');
    }
  }

  function advance() {
    if (!running) return;
    next++;
    if (next > total()) finish();
    else target.textContent = next;
  }

  function start() {
    clearTimeout(restartId);
    build();
    grid.classList.remove('idle');
    next = 1;
    errors = 0;
    running = true;
    target.textContent = 1;
    startBtn.textContent = 'Reiniciar';
    t0 = performance.now();
    cancelAnimationFrame(raf);
    const loop = () => {
      time.textContent = fmtSecs(performance.now() - t0);
      raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    clearTimeout(restartId);
  }

  function finish() {
    stop();
    const ms = performance.now() - t0;
    time.textContent = fmtSecs(ms);
    target.textContent = '✓';
    const prev = store.get(bestKey(), null);
    if (prev === null || ms < prev) store.set(bestKey(), ms);
    history.unshift({ ms, errors, size: cfg.size, record: prev === null || ms < prev });
    renderHistory();
    renderBest();
    if (embedded && countdown?.running) restartId = setTimeout(start, 1200);
  }

  function renderBest() {
    const b = store.get(bestKey(), null);
    best.textContent = b === null ? 'Sin récord aún' : `Récord ${cfg.size}×${cfg.size}: ${fmtSecs(b)}`;
  }

  function renderHistory() {
    histList.replaceChildren(...history.slice(0, 8).map(r => h('li', {},
      `${r.size}×${r.size} · ${fmtSecs(r.ms)}`,
      cfg.mode === 'clic' ? ` · ${r.errors} errores` : '',
      r.record ? h('span', { class: 'badge' }, 'récord') : '')));
  }

  function reset() {
    stop();
    build();
    grid.classList.add('idle');
    target.textContent = '—';
    time.textContent = '0.0 s';
    startBtn.textContent = 'Iniciar';
    foundBtn.hidden = cfg.mode !== 'foco';
    renderBest();
  }

  const onKey = e => {
    if (e.code !== 'Space' || e.target.closest('input, select, textarea')) return;
    e.preventDefault();
    if (running && cfg.mode === 'foco') advance();
    else if (!running) start();
  };
  document.addEventListener('keydown', onKey);

  root.append(...[
    ...(embedded ? [] : intro(
      'Tablas de Schulte',
      'Gimnasio visual: cuadrículas numéricas desordenadas que obligan a los ojos a mantenerse fijos en un punto central mientras la mente rastrea el entorno.',
      [
        'Sitúate a una distancia de entre 30 y 40 cm de la pantalla.',
        'Clava la mirada exclusivamente en la casilla central (marcada en rojo). No muevas las pupilas fuera de ella.',
        'Usando únicamente tu visión periférica, busca el 1, luego el 2, el 3… hasta el último número.',
        'Modo clic: toca cada número al encontrarlo. Modo foco: pulsa Espacio (o el botón) cada vez que lo localices, sin mover la vista.',
        'Registra tu tiempo e intenta superarlo.',
      ],
      'Completar una tabla 5×5 en menos de 25 segundos sin desplazar los ojos del foco central.',
    )),
    h('div', { class: 'controls' }, settingsCtls(cfg, reset)),
    h('div', { class: 'toolbar' }, startBtn, h('span', {}, 'Busca: ', target), time, embedded && clock),
    grid,
    h('div', { class: 'toolbar center' }, foundBtn),
    h('p', { class: 'center' }, best),
    histList,
  ].filter(Boolean));

  reset();

  if (embedded) {
    countdown = new Countdown(durationMs, left => { clock.textContent = `Quedan ${fmtClock(left)}`; }, () => {
      stop();
      target.textContent = '⏱';
      onDone?.();
    });
    countdown.start();
    start();
  }

  return () => {
    stop();
    countdown?.stop();
    document.removeEventListener('keydown', onKey);
  };
}
