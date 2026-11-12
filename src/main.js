import {
  groupByCategory,
  hasPhoto,
  itemQuantity,
  totalQuantity,
  visibleItems,
} from './catalog.js';
import inventory from './data/inventory.json';
import { fittedSize } from './fit.js';
import { loadPack, packedItems, savePack, togglePackId } from './pack.js';
import './style.css';

const base = import.meta.env.BASE_URL;
const state = {
  query: '',
  filter: 'all',
  category: 'all',
  lbId: null,
  lbIndex: 0,
};

const storage = window.localStorage;
let packIds = loadPack(storage).filter((id) => inventory.items.some((item) => item.id === id));

const dialog = document.querySelector('#lightbox');
const checklist = document.querySelector('#checklist');
const lbImg = document.querySelector('#lb-img');
const lbStage = document.querySelector('#lb-stage');
const results = document.querySelector('#results');
const input = document.querySelector('#q');
const controls = document.querySelector('.controls');

let sectionObserver = null;

const frameObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const img = entry.target.querySelector('img');
    if (img) applyFit(img, entry.target);
  }
});

frameObserver.observe(lbStage);

const controlsObserver = new ResizeObserver(() => {
  const height = Math.ceil(controls.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--controls-h', `${height}px`);
});
controlsObserver.observe(controls);

function photoSrc(file) {
  return `${base}photos/${encodeURIComponent(file)}`;
}

function slug(category) {
  return `cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function formatDate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function contentBox(box) {
  const style = getComputedStyle(box);
  const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return {
    width: box.clientWidth - padX,
    height: box.clientHeight - padY,
  };
}

function applyFit(img, box) {
  if (!img.naturalWidth || !img.naturalHeight || img.hidden) return;
  const avail = contentBox(box);
  const size = fittedSize(img.naturalWidth, img.naturalHeight, avail.width, avail.height);
  if (!size) return;
  img.style.width = `${size.width}px`;
  img.style.height = `${size.height}px`;
  img.classList.add('is-fit');
}

function el(tag, props = {}) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  return node;
}

function placeholderEl() {
  const wrap = el('div', { class: 'placeholder' });
  wrap.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <rect x="7" y="11" width="34" height="26" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"></rect>
    <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" stroke-width="1.5"></circle>
    <path d="M10 35 L18 26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>
  </svg>`;
  wrap.append(el('span', { text: 'No photo yet' }));
  return wrap;
}

function stat(label, value) {
  const wrap = el('div');
  wrap.append(el('dt', { text: label }), el('dd', { text: String(value) }));
  return wrap;
}

function renderIntro() {
  document.title = `${inventory.title} — ${inventory.owner}`;
  document.querySelector('#title').textContent = inventory.title;
  document.querySelector('#byline').textContent = inventory.owner;
  document.querySelector('#lede').textContent =
    'Speakers, mixers, microphones, stands, and cables from this public catalog. Open a photographed piece to page through its pictures. Gear without a photo stays in the list so the catalog is complete.';
  const photographed = inventory.items.filter(hasPhoto).length;
  document.querySelector('#stats').replaceChildren(
    stat('Pieces', inventory.items.length),
    stat('Photographed', photographed),
    stat('Updated', formatDate(inventory.updated)),
  );
  document.querySelector('#footer').textContent =
    `${inventory.owner}’s public audio gear catalog. Updated ${formatDate(inventory.updated)}. Pictures are shown where they were taken; every other piece is listed beside them.`;
}

function renderRail(counts) {
  const rail = document.querySelector('#rail');
  rail.replaceChildren(el('p', { class: 'rail-label', text: 'Categories' }));
  for (const category of inventory.categories) {
    const count = counts.get(category) || 0;
    if (!count) continue;
    const link = el('a', { href: `#${slug(category)}` });
    link.append(document.createTextNode(category), el('span', { text: String(count) }));
    link.addEventListener('click', (event) => {
      const section = document.getElementById(slug(category));
      if (!section) return;
      event.preventDefault();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${slug(category)}`);
    });
    rail.append(link);
  }
}

function highlightRail() {
  sectionObserver?.disconnect();
  const links = [...document.querySelectorAll('#rail a')];
  const sections = [...results.querySelectorAll('section')];
  if (!sections.length) return;
  sectionObserver = new IntersectionObserver(
    (entries) => {
      const hit = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!hit) return;
      for (const link of links) {
        link.classList.toggle('is-current', link.getAttribute('href') === `#${hit.target.id}`);
      }
    },
    { rootMargin: '-25% 0px -55% 0px', threshold: [0.15, 0.4] },
  );
  for (const section of sections) sectionObserver.observe(section);
}

function renderCard(item) {
  const index = inventory.items.findIndex((entry) => entry.id === item.id) + 1;
  const packed = packIds.includes(item.id);
  const article = el('article', { class: packed ? 'card is-packed' : 'card' });
  article.dataset.id = item.id;
  article.append(hasPhoto(item) ? photoButton(item) : emptyShot());

  const body = el('div', { class: 'card-body' });
  body.append(
    el('p', { class: 'num', text: String(index).padStart(2, '0') }),
    el('h3', { text: item.name }),
    el('p', { class: 'detail', text: item.detail }),
    packControl(item),
  );
  article.append(body);
  return article;
}

function packControl(item) {
  const label = el('label', { class: 'pack' });
  const box = el('input', { type: 'checkbox' });
  box.dataset.pack = item.id;
  box.checked = packIds.includes(item.id);
  box.setAttribute('aria-label', `Pack ${item.name}`);
  box.addEventListener('change', () => {
    packIds = togglePackId(packIds, item.id);
    persistPack();
    box.closest('.card')?.classList.toggle('is-packed', packIds.includes(item.id));
    updateChecklist();
  });
  label.append(box, el('span', { text: 'Pack' }));
  return label;
}

function photoButton(item) {
  const button = el('button', {
    type: 'button',
    class: 'shot',
    'aria-label':
      item.photos.length > 1
        ? `View ${item.photos.length} photos of ${item.name}`
        : `View photo of ${item.name}`,
  });
  const frame = el('div', { class: 'shot-frame' });
  const img = el('img', { alt: '', decoding: 'async', loading: 'lazy' });
  img.src = photoSrc(item.photos[0]);
  img.addEventListener('load', () => applyFit(img, frame));
  img.addEventListener('error', () => frame.replaceChildren(placeholderEl()));
  frame.append(img);
  button.append(frame);
  if (item.photos.length > 1) {
    button.append(el('span', { class: 'badge', text: `${item.photos.length} photos` }));
  } else if (item.photoSource === 'web') {
    button.append(el('span', { class: 'badge', text: 'Product photo' }));
  }
  button.addEventListener('click', () => openLightbox(item.id, 0));
  frameObserver.observe(frame);
  return button;
}

function emptyShot() {
  const wrap = el('div', { class: 'shot is-empty' });
  const frame = el('div', { class: 'shot-frame' });
  frame.append(placeholderEl());
  wrap.append(frame);
  return wrap;
}

function renderCategoryChips(searched) {
  const host = document.querySelector('#categories');
  const active = state.category;
  host.replaceChildren();
  const choices = [
    ['all', 'All'],
    ...inventory.categories.map((category) => [category, category]),
  ];
  for (const [id, label] of choices) {
    const count = visibleItems(searched, { category: id, photo: state.filter }).length;
    const button = el('button', { type: 'button' });
    button.dataset.category = id;
    const on = id === active;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.append(document.createTextNode(label), el('span', { text: String(count) }));
    button.addEventListener('click', () => {
      state.category = id;
      renderCatalog();
      [...host.querySelectorAll('[data-category]')].find((button) => button.dataset.category === id)?.focus();
    });
    host.append(button);
  }
}

function renderCatalog() {
  const searched = visibleItems(inventory.items, { query: state.query });
  const inCategory = visibleItems(searched, { category: state.category });
  const photographed = inCategory.filter(hasPhoto).length;
  document.querySelector('#count-all').textContent = String(inCategory.length);
  document.querySelector('#count-photo').textContent = String(photographed);
  document.querySelector('#count-nophoto').textContent = String(inCategory.length - photographed);
  renderCategoryChips(searched);

  const visible = visibleItems(inCategory, { photo: state.filter });
  const grouped = groupByCategory(visible, inventory.categories);

  const counts = new Map();
  results.querySelectorAll('.shot-frame').forEach((frame) => frameObserver.unobserve(frame));
  results.replaceChildren();
  document.querySelector('#status').textContent = visible.length
    ? `Showing ${visible.length} of ${inventory.items.length}`
    : state.query
      ? 'Nothing in the catalog matches that search.'
      : 'Nothing in the catalog matches those filters.';

  if (!visible.length) {
    results.append(
      el('p', {
        class: 'empty',
        text: 'Try another name, brand, or note, or switch the category and photo filters.',
      }),
    );
  }

  for (const [category, items] of grouped) {
    if (!items.length) continue;
    counts.set(category, items.length);
    const section = el('section', { id: slug(category) });
    const head = el('div', { class: 'section-head' });
    head.append(
      el('h2', { text: category }),
      el('span', { text: items.length === 1 ? '1 piece' : `${items.length} pieces` }),
    );
    const grid = el('div', { class: 'grid' });
    for (const item of items) grid.append(renderCard(item));
    section.append(head, grid);
    results.append(section);
  }

  renderRail(counts);
  highlightRail();
}

function currentItem() {
  return inventory.items.find((item) => item.id === state.lbId) ?? null;
}

function renderThumbs(item) {
  const thumbs = document.querySelector('#lb-thumbs');
  thumbs.replaceChildren();
  const multi = item.photos.length > 1;
  thumbs.hidden = !multi;
  if (!multi) return;
  item.photos.forEach((file, index) => {
    const button = el('button', {
      type: 'button',
      'aria-label': `Photo ${index + 1} of ${item.name}`,
    });
    const img = el('img', { alt: '', decoding: 'async' });
    img.src = photoSrc(file);
    button.append(img);
    button.addEventListener('click', () => {
      state.lbIndex = index;
      showSlide();
    });
    thumbs.append(button);
  });
}

function showSlide() {
  const item = currentItem();
  if (!item) return;
  const count = item.photos.length;
  const index = state.lbIndex;
  const multi = count > 1;
  document.querySelector('#lb-prev').hidden = !multi;
  document.querySelector('#lb-next').hidden = !multi;
  document.querySelector('#lb-count').textContent = `${index + 1} / ${count}`;
  document.querySelector('#lb-fallback').hidden = true;
  lbImg.hidden = false;
  lbImg.classList.remove('is-fit');
  lbImg.style.width = '';
  lbImg.style.height = '';
  lbImg.alt = `${item.name}, photo ${index + 1} of ${count}`;
  lbImg.src = photoSrc(item.photos[index]);
  document.querySelectorAll('#lb-thumbs button').forEach((button, thumbIndex) => {
    const current = thumbIndex === index;
    if (current) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  if (lbImg.complete && lbImg.naturalWidth) applyFit(lbImg, lbStage);
}

function openLightbox(id, index) {
  const item = inventory.items.find((entry) => entry.id === id);
  if (!item || !hasPhoto(item)) return;
  state.lbId = id;
  state.lbIndex = index;
  document.querySelector('#lb-cat').textContent = item.category;
  document.querySelector('#lb-title').textContent = item.name;
  document.querySelector('#lb-detail').textContent = item.detail;
  renderThumbs(item);
  showSlide();
  if (!dialog.open) dialog.showModal();
  requestAnimationFrame(() => applyFit(lbImg, lbStage));
}

function step(delta) {
  const item = currentItem();
  if (!item || item.photos.length < 2) return;
  const count = item.photos.length;
  state.lbIndex = (state.lbIndex + delta + count) % count;
  showSlide();
}

function currentPack() {
  return packedItems(inventory.items, packIds);
}

function pieceLabel(count, noun) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function persistPack() {
  try {
    savePack(packIds, storage);
  } catch {
    // Private mode or a full store: the pack still works until the page closes.
  }
}

function syncPackChecks() {
  document.querySelectorAll('[data-pack]').forEach((box) => {
    const on = packIds.includes(box.dataset.pack);
    box.checked = on;
    box.closest('.card')?.classList.toggle('is-packed', on);
  });
}

function checklistRow(item, { interactive }) {
  const qty = itemQuantity(item);
  if (!interactive) {
    const row = el('div', { class: 'print-row' });
    row.append(
      el('span', { class: 'print-box', 'aria-hidden': 'true' }),
      el('span', { class: 'print-name', text: item.name }),
      el('span', { class: 'print-qty', text: `×${qty}` }),
    );
    return row;
  }
  const label = el('label', { class: 'check-row' });
  const box = el('input', { type: 'checkbox' });
  box.checked = true;
  box.setAttribute('aria-label', `Remove ${item.name} from the checklist`);
  box.addEventListener('change', () => {
    packIds = togglePackId(packIds, item.id);
    persistPack();
    syncPackChecks();
    updateChecklist();
  });
  label.append(box, el('span', { class: 'print-name', text: item.name }), el('span', { class: 'print-qty', text: `×${qty}` }));
  return label;
}

function checklistGroups(packed, interactive) {
  const wrap = el('div', { class: interactive ? 'check-groups' : 'print-columns' });
  if (!interactive && packed.length > 16) wrap.classList.add('is-two');
  for (const [category, items] of groupByCategory(packed, inventory.categories)) {
    const group = el('section', { class: interactive ? 'check-group' : 'print-group' });
    group.append(el('h2', { text: category }));
    for (const item of items) group.append(checklistRow(item, { interactive }));
    wrap.append(group);
  }
  return wrap;
}

function updateChecklist() {
  const packed = currentPack();
  const count = packed.length;
  const units = totalQuantity(packed);
  document.querySelector('#pack-count').textContent = String(count);
  const opener = document.querySelector('#open-checklist');
  opener.classList.toggle('has-items', count > 0);
  opener.setAttribute('aria-label', count ? `Open gig checklist, ${pieceLabel(count, 'piece')} packed` : 'Open gig checklist');

  const summary = document.querySelector('#check-summary');
  const body = document.querySelector('#check-body');
  const clear = document.querySelector('#check-clear');
  const print = document.querySelector('#check-print');
  clear.disabled = count === 0;
  print.disabled = count === 0;
  summary.textContent = count
    ? `${pieceLabel(count, 'piece')} · ${units} total`
    : 'Tick Pack on any piece. The list stays in this browser.';
  body.replaceChildren(count ? checklistGroups(packed, true) : el('p', { class: 'empty', text: 'Nothing packed yet.' }));

  const sheet = document.querySelector('#print-sheet');
  sheet.replaceChildren();
  if (!count) return;
  const head = el('header', { class: 'print-head' });
  const titles = el('div');
  titles.append(
    el('p', { class: 'print-kicker', text: 'Gig checklist' }),
    el('h1', { text: inventory.owner }),
  );
  head.append(
    titles,
    el('p', {
      class: 'print-meta',
      text: `${formatChecklistDate(new Date())} · ${pieceLabel(count, 'piece')} · ${units} total`,
    }),
  );
  sheet.append(head, checklistGroups(packed, false));
}

function formatChecklistDate(date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function printChecklist() {
  if (!packIds.length) return;
  const reopen = checklist.open;
  if (reopen) checklist.close();
  document.body.classList.add('is-printing-checklist');
  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    document.body.classList.remove('is-printing-checklist');
    if (reopen && !checklist.open) checklist.showModal();
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}

function bind() {
  document.querySelector('#search-form').addEventListener('submit', (event) => event.preventDefault());
  const clear = document.querySelector('#clear');
  input.addEventListener('input', () => {
    state.query = input.value;
    clear.hidden = input.value.length === 0;
    renderCatalog();
  });
  clear.addEventListener('click', () => {
    input.value = '';
    state.query = '';
    clear.hidden = true;
    input.focus();
    renderCatalog();
  });

  document.querySelectorAll('[data-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((other) => {
        const on = other === button;
        other.classList.toggle('is-on', on);
        other.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      renderCatalog();
    });
  });

  document.querySelector('#open-checklist').addEventListener('click', () => {
    updateChecklist();
    if (!checklist.open) checklist.showModal();
  });
  document.querySelector('#check-close').addEventListener('click', () => checklist.close());
  document.querySelector('#check-clear').addEventListener('click', () => {
    packIds = [];
    persistPack();
    syncPackChecks();
    updateChecklist();
  });
  document.querySelector('#check-print').addEventListener('click', printChecklist);
  checklist.addEventListener('click', (event) => {
    if (event.target === checklist) checklist.close();
  });
  window.addEventListener('beforeprint', () => {
    if (checklist.open) document.body.classList.add('is-printing-checklist');
  });
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('is-printing-checklist');
  });

  document.querySelector('#lb-close').addEventListener('click', () => dialog.close());
  document.querySelector('#lb-prev').addEventListener('click', () => step(-1));
  document.querySelector('#lb-next').addEventListener('click', () => step(1));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    state.lbId = null;
  });

  lbImg.addEventListener('load', () => {
    document.querySelector('#lb-fallback').hidden = true;
    lbImg.hidden = false;
    applyFit(lbImg, lbStage);
  });
  lbImg.addEventListener('error', () => {
    lbImg.hidden = true;
    lbImg.classList.remove('is-fit');
    document.querySelector('#lb-fallback').hidden = false;
  });

  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && !dialog.open && !checklist.open) {
      event.preventDefault();
      input.focus();
    }
    if (!dialog.open) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  });
}

function scrollToHash() {
  const id = location.hash.replace(/^#/, '');
  if (!id) return;
  document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

renderIntro();
bind();
renderCatalog();
updateChecklist();
scrollToHash();
