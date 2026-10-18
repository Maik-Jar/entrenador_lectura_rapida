// Lector con puntero: divide el texto en líneas de N palabras y avanza a un ritmo fijo.
// mode 'line'   → una barra recorre la línea activa (técnica de la escoba / ritmo constante).
// mode 'chunks' → resalta 2-3 bloques por línea, sin fijarse en la primera ni la última palabra.
import { h } from './util.js';

function groupWords(words, n) {
  if (words.length < 4) return [{ words }];
  const mid = words.slice(1, -1);
  const size = Math.ceil(mid.length / n);
  const groups = [];
  for (let i = 0; i < mid.length; i += size) groups.push({ words: mid.slice(i, i + size) });
  return [{ words: [words[0]], edge: true }, ...groups, { words: [words.at(-1)], edge: true }];
}

export class Reader {
  constructor(container, text, opts = {}) {
    this.container = container;
    this.words = text.trim().split(/\s+/).filter(Boolean);
    this.opts = { mode: 'line', wordsPerLine: 10, chunks: 3, margins: false, secPerLine: 1, ...opts };
    this.i = 0;
    this.running = false;
    this.timer = null;
    this.anim = null;
    this.render();
  }

  render() {
    const { mode, wordsPerLine: wpl, chunks, margins } = this.opts;
    this.box = h('div', { class: `reader mode-${mode}${margins ? ' with-margins' : ''}` });
    this.lines = [];
    for (let s = 0; s < this.words.length; s += wpl) {
      const ws = this.words.slice(s, s + wpl);
      const idx = this.lines.length;
      const el = h('div', { class: 'line', onclick: () => this.jump(idx) });
      // En modo línea cada palabra va en su span para poder justificar la línea.
      for (const g of mode === 'chunks' ? groupWords(ws, chunks) : ws.map(w => ({ words: [w] }))) {
        el.append(h('span', { class: g.edge ? 'chunk edge' : 'chunk' }, g.words.join(' ')));
      }
      this.lines.push({ el, chunks: [...el.querySelectorAll('.chunk:not(.edge)')] });
      this.box.append(el);
    }
    this.lines.at(-1)?.el.classList.add('last');
    this.i = Math.min(this.i, Math.max(0, this.lines.length - 1));
    this.container.replaceChildren(this.box);
    this.mark();
  }

  set(opts) {
    const wasRunning = this.running;
    this.pause();
    Object.assign(this.opts, opts);
    if (['wordsPerLine', 'chunks', 'margins', 'mode'].some(k => k in opts)) this.render();
    if (wasRunning) this.play();
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
    const top = line.el.offsetTop - (this.box.clientHeight - line.el.offsetHeight) / 2;
    this.box.scrollTo({ top, behavior: 'smooth' });
    return line;
  }

  step() {
    if (!this.running) return;
    if (this.i >= this.lines.length) this.i = 0; // el texto se repite hasta que acabe el tiempo
    const line = this.mark();
    const dur = this.opts.secPerLine * 1000;
    const next = () => { this.i++; this.step(); };

    if (this.opts.mode === 'chunks' && line.chunks.length) {
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
