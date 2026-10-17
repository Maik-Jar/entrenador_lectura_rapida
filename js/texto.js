// Selección del texto de práctica (de muestra o propio).
import { h, store } from './util.js';
import { TEXTS } from './texts.js';

const countWords = s => s.trim().split(/\s+/).filter(Boolean).length;

export function currentText() {
  const id = store.get('texto', TEXTS[0].id);
  if (id === 'custom') {
    const body = store.get('textoCustom', '');
    if (body.trim()) return { id, title: 'Texto propio', body };
  }
  return TEXTS.find(t => t.id === id) ?? TEXTS[0];
}

export function mountTexto(root) {
  const selected = currentText().id;
  const msg = h('span', { class: 'muted' });
  const area = h('textarea', { rows: 10, placeholder: 'Pega aquí un texto (de un libro, artículo, etc.)…' });
  area.value = store.get('textoCustom', '');

  const option = (id, title, detail) => {
    const input = h('input', {
      type: 'radio', name: 'texto', value: id,
      onchange: () => { store.set('texto', id); msg.textContent = `Usando: ${title}`; },
    });
    input.checked = id === selected;
    return h('label', { class: 'option' }, input, h('span', {}, h('strong', {}, title), h('small', {}, detail)));
  };

  const customOpt = option('custom', 'Texto propio', 'El que pegues abajo');

  root.append(
    h('h1', {}, 'Texto de práctica'),
    h('p', { class: 'lead' }, 'Elige el texto que se usará en los ejercicios de lectura. Usa uno de dificultad media.'),
    h('div', { class: 'options' },
      TEXTS.map(t => option(t.id, t.title, `${countWords(t.body)} palabras`)),
      customOpt),
    area,
    h('div', { class: 'toolbar' },
      h('button', {
        class: 'btn primary',
        onclick: () => {
          if (!area.value.trim()) { msg.textContent = 'El texto está vacío.'; return; }
          store.set('textoCustom', area.value);
          store.set('texto', 'custom');
          customOpt.querySelector('input').checked = true;
          msg.textContent = `Texto propio guardado (${countWords(area.value)} palabras).`;
        },
      }, 'Usar mi texto'),
      msg),
  );
}
