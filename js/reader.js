// Lector con puntero: divide el texto en líneas de N palabras y avanza a un ritmo fijo.
// mode 'line'   → una barra recorre la línea activa (técnica de la escoba / ritmo constante).
// mode 'chunks' → resalta 2-3 bloques por línea, sin fijarse en la primera ni la última palabra.
// mode 'fix'    → reparte la línea entera en N fijaciones (reducción de fijaciones).
import { h } from './util.js';

// Divide en n bloques de longitud (en letras) lo más parecida posible, para que todas las
// fijaciones abarquen un tramo similar de la línea y el resaltado avance a ritmo parejo.
function split(words, n) {
  n = Math.max(1, Math.min(n, words.length));
  const lens = words.map(w => w.length + 1);
  const total = lens.reduce((a, b) => a + b, 0);
  const groups = [];
  for (let k = 0, i = 0, cum = 0; k < n; k++) {
    const target = (total * (k + 1)) / n;
    const maxEnd = words.length - (n - k - 1); // deja al menos una palabra por bloque restante
    const start = i;
    cum += lens[i++];
    while (i < maxEnd && (k === n - 1 || Math.abs(cum + lens[i] - target) < Math.abs(cum - target))) cum += lens[i++];
    groups.push({ words: words.slice(start, i) });
  }
  return groups;
}

function groupWords(words, n) {
  if (words.length < 4) return [{ words }];
  return [{ words: [words[0]], edge: true }, ...split(words.slice(1, -1), n), { words: [words.at(-1)], edge: true }];
}

const GROUPERS = {
  chunks: groupWords,
  fix: split,
  line: ws => ws.map(w => ({ words: [w] })),
};

export class Reader {
  constructor(container, text, opts = {}) {
    this.container = container;
    this.words = text.trim().split(/\s+/).filter(Boolean);
    this.opts = { mode: 'line', wordsPerLine: 10, chunks: 3, margins: false, secPerLine: 1, ...opts };
    this.i = 0;
    this.running = false;
    this.timer = null;
    this.anim = null;
    this.pending = null;
    this.render();
  }

  render() {
    const { mode, wordsPerLine: wpl, chunks, margins } = this.opts;
    const scrollTop = this.box?.scrollTop ?? 0;
    this.box = h('div', { class: `reader mode-${mode}${margins ? ' with-margins' : ''}` });
    this.lines = [];
    for (let s = 0; s < this.words.length; s += wpl) {
      const ws = this.words.slice(s, s + wpl);
      const idx = this.lines.length;
      const el = h('div', { class: 'line', onclick: () => this.jump(idx) });
      // En modo línea cada palabra va en su span para poder justificar la línea.
      for (const g of GROUPERS[mode](ws, chunks)) {
        el.append(mode === 'fix'
          // Cada palabra en su span para justificar la línea; el punto de fijación va en la central.
          ? h('span', { class: 'chunk' }, g.words.map((w, k) => h('span', { class: k === (g.words.length - 1) >> 1 ? 'fixpt' : '' }, w)))
          : h('span', { class: g.edge ? 'chunk edge' : 'chunk' }, g.words.join(' ')));
      }
      this.lines.push({ el, chunks: [...el.querySelectorAll('.chunk:not(.edge)')] });
      this.box.append(el);
    }
    this.lines.at(-1)?.el.classList.add('last');
    this.i = Math.min(this.i, Math.max(0, this.lines.length - 1));
    this.container.replaceChildren(this.box);
    this.box.scrollTop = scrollTop; // al reagrupar, el texto no debe saltar de sitio
    this.mark();
  }

  set(opts) {
    const wasRunning = this.running;
    this.pause();
    opts = { ...this.pending, ...opts };
    this.pending = null;
    this.apply(opts);
    if (wasRunning) this.play();
  }

  // Igual que set(), pero si está en marcha espera a que acabe la línea actual, para no
  // reiniciarla a medias (p. ej. al pasar de fase o de nivel).
  queue(opts) {
    if (this.running) this.pending = { ...this.pending, ...opts };
    else this.set(opts);
  }

  apply(opts) {
    Object.assign(this.opts, opts);
    if (['wordsPerLine', 'chunks', 'margins', 'mode'].some(k => k in opts)) this.render();
  }

  play() {
    if (this.running || !this.lines.length) return;
    this.running = true;
    this.step();
  }

  pause() {
    this.running = false;
    clearTimeout(this.timer);
    this.anim?.cancel();
    this.anim = null;
  }

  reset() {
    this.pause();
    this.i = 0;
    this.mark();
  }

  jump(i) {
    const wasRunning = this.running;
    this.pause();
    this.i = i;
    this.mark();
    if (wasRunning) this.play();
  }

  mark() {
    this.box.querySelectorAll('.active, .on').forEach(e => e.classList.remove('active', 'on'));
    this.box.querySelectorAll('.pacer').forEach(e => e.remove());
    const line = this.lines[this.i];
    if (!line) return null;
    line.el.classList.add('active');
    // Como en un libro, la vista baja línea a línea: solo se desplaza el texto cuando la
    // línea activa sale del área visible, y entonces queda arriba (con una línea de contexto).
    const { offsetTop: top, offsetHeight: hgt } = line.el;
    const { scrollTop, clientHeight } = this.box;
    if (top < scrollTop || top + hgt > scrollTop + clientHeight) {
      this.box.scrollTo({ top: Math.max(0, top - hgt), behavior: 'smooth' });
    }
    return line;
  }

  step() {
    if (!this.running) return;
    if (this.pending) { this.apply(this.pending); this.pending = null; }
    if (this.i >= this.lines.length) this.i = 0; // el texto se repite hasta que acabe el tiempo
    const line = this.mark();
    const dur = this.opts.secPerLine * 1000;
    const next = () => { this.i++; this.step(); };

    if (this.opts.mode !== 'line' && line.chunks.length) {
      const per = dur / line.chunks.length;
      let k = 0;
      const tick = () => {
        if (!this.running) return;
        line.chunks.forEach(c => c.classList.remove('on'));
        if (k < line.chunks.length) {
          line.chunks[k++].classList.add('on');
          this.timer = setTimeout(tick, per);
        } else next();
      };
      tick();
    } else {
      const bar = h('div', { class: 'pacer' });
      line.el.append(bar);
      this.anim = bar.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: dur, easing: 'linear', fill: 'forwards' },
      );
      this.timer = setTimeout(next, dur);
    }
  }
}
