// Utilidades compartidas: creación de nodos, almacenamiento local, temporizadores y metrónomo.

export function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
  return node;
}

// localStorage puede fallar (modo privado, almacenamiento bloqueado): la app funciona igual sin él.
export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem('elr:' + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem('elr:' + key, JSON.stringify(value));
    } catch { /* sin almacenamiento disponible */ }
  },
};

export const fmtSecs = ms => (ms / 1000).toFixed(1) + ' s';

export function fmtClock(ms) {
  const t = Math.ceil(ms / 1000);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const defaultWpl = () => (window.innerWidth < 600 ? 6 : 10);

export function intro(title, lead, steps, goal) {
  return [
    h('h1', {}, title),
    h('p', { class: 'lead' }, lead),
    h('details', { class: 'howto', open: true },
      h('summary', {}, 'Paso a paso'),
      h('ol', {}, steps.map(s => h('li', {}, s)))),
    goal && h('p', { class: 'goal' }, h('strong', {}, 'Meta: '), goal),
  ].filter(Boolean);
}

// Ventana modal de confirmación. Resuelve true si se pulsa el botón principal.
// Se cierra sola (como cancelada) si el usuario navega a otra vista.
export function openModal(title, body, okText = 'Empezar') {
  return new Promise(resolve => {
    const dlg = h('dialog', { class: 'modal' },
      h('form', { method: 'dialog' },
        h('h2', {}, title),
        h('div', { class: 'modal-body' }, body),
        h('div', { class: 'toolbar modal-actions' },
          h('button', { class: 'btn', value: 'cancel' }, 'Cancelar'),
          h('button', { class: 'btn primary', value: 'ok', autofocus: true }, okText))));
    const onNav = () => dlg.close();
    window.addEventListener('hashchange', onNav);
    dlg.addEventListener('close', () => {
      window.removeEventListener('hashchange', onNav);
      dlg.remove();
      resolve(dlg.returnValue === 'ok');
    });
    document.body.append(dlg);
    dlg.showModal();
  });
}

// Cuenta regresiva pausable.
export class Countdown {
  constructor(ms, onTick, onDone) {
    this.left = ms;
    this.onTick = onTick;
    this.onDone = onDone;
    this.id = null;
  }
  get running() { return this.id !== null; }
  start() {
    if (this.running || this.left <= 0) return;
    this.last = performance.now();
    this.id = setInterval(() => this.#tick(), 100);
    this.onTick?.(this.left);
  }
  pause() {
    if (!this.running) return;
    this.#tick();
    this.stop();
  }
  stop() {
    clearInterval(this.id);
    this.id = null;
  }
  #tick() {
    const now = performance.now();
    this.left = Math.max(0, this.left - (now - this.last));
    this.last = now;
    this.onTick?.(this.left);
    if (this.left <= 0) {
      this.stop();
      this.onDone?.();
    }
  }
}

export class Metronome {
  constructor(onBeat) {
    this.onBeat = onBeat;
    this.bpm = 150;
    this.sound = true;
    this.id = null;
    this.n = 0;
  }
  start() {
    this.stop();
    this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume?.();
    const beat = () => {
      this.#click(this.n % 3 === 0);
      this.onBeat?.(this.n++);
    };
    beat();
    this.id = setInterval(beat, 60000 / this.bpm);
  }
  stop() {
    clearInterval(this.id);
    this.id = null;
  }
  setBpm(bpm) {
    this.bpm = bpm;
    if (this.id !== null) this.start();
  }
  close() {
    this.stop();
    this.ctx?.close();
  }
  #click(accent) {
    if (!this.sound || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1200 : 800;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }
}
