// Enrutador por hash (#/schulte, #/rutina…): funciona en GitHub Pages sin configuración extra.
import { h } from './util.js';
import { mountSchulte } from './schulte.js';
import { mountSangria, mountFijaciones, mountFonetico, mountEscoba } from './exercises.js';
import { mountRutina, practicedDays } from './rutina.js';
import { mountTexto, currentText } from './texto.js';

const EXERCISES = [
  { id: 'schulte', tag: 'Visión periférica', title: 'Tablas de Schulte', desc: 'Encuentra los números en orden sin mover la vista del centro.' },
  { id: 'sangria', tag: 'Visión periférica', title: 'Sangría visual', desc: 'Lee por bloques, ignorando los márgenes: 2-3 fijaciones por línea.' },
  { id: 'fijaciones', tag: 'Visión periférica', title: 'Reducción de fijaciones', desc: 'Lee cada línea con menos paradas: de una por palabra a solo 2 o 3.' },
  { id: 'fonetico', tag: 'Subvocalización', title: 'Bloqueo fonético', desc: 'Lee al ritmo de un metrónomo repitiendo "un-dos-tres".' },
  { id: 'escoba', tag: 'Subvocalización', title: 'Sobrevuelo (escoba)', desc: '2 minutos a 1 s/línea y luego baja a ritmo de calma.' },
];

function mountHome(root) {
  const days = practicedDays().length;
  root.append(
    h('section', { class: 'hero' },
      h('h1', {}, 'Entrena tu lectura rápida'),
      h('p', { class: 'lead' }, 'Ejercicios de visión periférica y eliminación de la subvocalización. 12 minutos al día.')),
    h('a', { href: '#/rutina', class: 'card featured' },
      h('h2', {}, 'Rutina diaria · 12 min'),
      h('p', {}, 'Schulte → bloqueo fonético → sangría visual → reducción de fijaciones → sobrevuelo, encadenados y cronometrados.'),
      days ? h('p', { class: 'small' }, `Llevas ${days} ${days === 1 ? 'día' : 'días'} de práctica.`) : null,
      h('span', { class: 'cta' }, 'Empezar →')),
    h('h2', { class: 'section-title' }, 'Ejercicios sueltos'),
    h('div', { class: 'grid' }, EXERCISES.map(e => h('a', { href: '#/' + e.id, class: 'card' },
      h('span', { class: 'tag' }, e.tag),
      h('h3', {}, e.title),
      h('p', {}, e.desc)))),
    h('p', { class: 'muted' }, 'Texto de práctica: ', h('strong', {}, currentText().title), ' · ', h('a', { href: '#/texto' }, 'cambiar')),
    h('aside', { class: 'tip' }, h('strong', {}, 'Consejo final: '),
      'durante las primeras 2 semanas prioriza la velocidad y la técnica sobre la comprensión absoluta. Una vez adaptados los músculos oculares, la comprensión se estabilizará gradualmente a mayores velocidades.'),
  );
}

const ROUTES = {
  '': { mount: mountHome },
  rutina: { title: 'Rutina diaria', mount: mountRutina },
  schulte: { title: 'Tablas de Schulte', mount: mountSchulte },
  sangria: { title: 'Sangría visual', mount: mountSangria },
  fijaciones: { title: 'Reducción de fijaciones', mount: mountFijaciones },
  fonetico: { title: 'Bloqueo fonético', mount: mountFonetico },
  escoba: { title: 'Sobrevuelo', mount: mountEscoba },
  texto: { title: 'Texto de práctica', mount: mountTexto },
};

const app = document.getElementById('app');
let destroy = null;

function render() {
  destroy?.();
  destroy = null;
  const key = location.hash.replace(/^#\/?/, '');
  const route = ROUTES[key] ?? ROUTES[''];
  const view = h('section', { class: 'view' });
  app.replaceChildren(...[route.title && h('a', { href: '#/', class: 'back' }, '← Inicio'), view].filter(Boolean));
  destroy = route.mount(view) || null;
  document.title = route.title ? `${route.title} · Lectura Rápida` : 'Entrenador de Lectura Rápida';
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
render();
