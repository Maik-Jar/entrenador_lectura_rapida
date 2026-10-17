// Plan de entrenamiento diario de 10 minutos: encadena los cuatro ejercicios.
import { h, store } from './util.js';
import { mountSchulte } from './schulte.js';
import { mountFonetico, mountSangria, mountEscoba } from './exercises.js';

const STEPS = [
  {
    title: 'Tablas de Schulte', min: 2, focus: 'Calentamiento y expansión del campo visual.',
    mount: (el, done) => mountSchulte(el, { embedded: true, durationMs: 2 * 60000, onDone: done }),
  },
  {
    title: 'Lectura con bloqueo fonético', min: 3, focus: 'Desactivación de la subvocalización.',
    mount: (el, done) => mountFonetico(el, { embedded: true, minutes: 3, onDone: done }),
  },
  {
    title: 'Sangría visual y puntero', min: 3, focus: 'Integración de visión periférica y ritmo.',
    mount: (el, done) => mountSangria(el, { embedded: true, minutes: 3, onDone: done }),
  },
  {
    title: 'Sobrevuelo a alta velocidad', min: 2, focus: 'Reajuste del límite de velocidad mental (1 s/línea).',
    mount: (el, done) => mountEscoba(el, { embedded: true, routine: true, onDone: done }),
  },
];

const today = () => new Date().toLocaleDateString('sv'); // AAAA-MM-DD en hora local

export function practicedDays() {
  return store.get('dias', []);
}

export function mountRutina(root) {
  let idx = -1, destroyStep = null;

  const list = h('ol', { class: 'steps' }, STEPS.map((s, i) => h('li', {},
    h('span', { class: 'when' }, `Min ${STEPS.slice(0, i).reduce((a, x) => a + x.min, 0)}–${STEPS.slice(0, i + 1).reduce((a, x) => a + x.min, 0)}`),
    h('strong', {}, s.title),
    h('span', { class: 'muted' }, s.focus))));
  const stage = h('div', { class: 'stage' });
  const startBtn = h('button', { class: 'btn primary', onclick: () => go(0) }, 'Comenzar rutina');
  const skipBtn = h('button', { class: 'btn', hidden: true, onclick: () => go(idx + 1) }, 'Saltar paso →');
  const stopBtn = h('button', { class: 'btn', hidden: true, onclick: () => { go(-1); } }, 'Detener');
  const days = h('p', { class: 'muted' });

  const renderDays = () => {
    const d = practicedDays();
    days.textContent = d.length ? `Días con rutina completada: ${d.length} (último: ${d.at(-1)})` : '';
  };

  function go(i) {
    destroyStep?.();
    destroyStep = null;
    idx = i;
    [...list.children].forEach((li, k) => { li.className = i < 0 ? '' : k < i ? 'done' : k === i ? 'current' : ''; });
    stage.replaceChildren();

    if (i < 0) {
      startBtn.hidden = false;
      startBtn.textContent = 'Comenzar rutina';
      skipBtn.hidden = stopBtn.hidden = true;
      return;
    }
    if (i >= STEPS.length) {
      const d = practicedDays();
      if (d.at(-1) !== today()) store.set('dias', [...d, today()]);
      renderDays();
      stage.append(h('div', { class: 'done-box' },
        h('h2', {}, '¡Rutina completada! 🎉'),
        h('p', {}, 'Durante las primeras 2 semanas prioriza la velocidad y la técnica sobre la comprensión absoluta. Vuelve mañana.')));
      startBtn.hidden = false;
      startBtn.textContent = 'Repetir rutina';
      skipBtn.hidden = stopBtn.hidden = true;
      return;
    }

    startBtn.hidden = true;
    skipBtn.hidden = stopBtn.hidden = false;
    skipBtn.textContent = i === STEPS.length - 1 ? 'Terminar →' : 'Saltar paso →';
    const el = h('div');
    stage.append(h('h2', {}, `Paso ${i + 1} de ${STEPS.length}: ${STEPS[i].title}`), el);
    destroyStep = STEPS[i].mount(el, () => {
      setTimeout(() => { if (idx === i) go(i + 1); }, 1500);
    });
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  root.append(
    h('h1', {}, 'Rutina diaria · 10 minutos'),
    h('p', { class: 'lead' }, 'Practícala una vez al día para obtener resultados sostenibles. Cada paso empieza solo y pasa al siguiente al terminar su tiempo.'),
    list,
    h('div', { class: 'toolbar' }, startBtn, skipBtn, stopBtn),
    days,
    stage,
  );
  renderDays();

  return () => destroyStep?.();
}
