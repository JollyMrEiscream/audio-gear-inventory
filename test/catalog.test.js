import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  foldSearch,
  groupByCategory,
  itemBrand,
  itemNotes,
  itemQuantity,
  matchesQuery,
  totalQuantity,
  visibleItems,
} from '../src/catalog.js';

const inventory = JSON.parse(readFileSync(new URL('../src/data/inventory.json', import.meta.url), 'utf8'));
const byId = (id) => inventory.items.find((item) => item.id === id);

test('folds accents so Røde and Rode search the same way', () => {
  assert.equal(foldSearch('RØDE'), 'rode');
  assert.equal(foldSearch('Røde'), 'rode');
});

test('reads brands from the item name', () => {
  assert.equal(itemBrand(byId('alto-ts410')), 'Alto Professional');
  assert.equal(itemBrand(byId('pig-hog-phm50')), 'Pig Hog');
  assert.equal(itemBrand(byId('phenyx-ptu-5000')), 'Phenyx Pro');
  assert.equal(itemBrand(byId('proco-cable')), 'Pro Co');
  assert.equal(itemBrand(byId('swiff-m1')), 'Swiff Audio');
  assert.equal(itemBrand(byId('radioshack-3300660')), 'RadioShack');
  assert.equal(itemBrand(byId('1mii-bt')), '1Mii');
  assert.equal(itemBrand(byId('shure-sm58')), 'Shure');
  assert.equal(itemBrand(byId('gvm-led-light-kit')), 'GVM');
  assert.equal(itemBrand(byId('betopper-lc001')), 'Betopper');
  assert.equal(itemBrand({ name: 'No brand here', brand: 'Custom Brand' }), 'Custom Brand');
  assert.equal(itemBrand(byId('xlr-black')), '');
  assert.equal(itemBrand(byId('mic-stands')), '');
  assert.equal(itemBrand(byId('teal-y')), '');
  assert.equal(itemBrand(byId('psu')), '');
  assert.equal(itemBrand(byId('xlr-quarter-adapters')), '');
});

test('notes include the detail text and an optional notes field', () => {
  assert.match(itemNotes(byId('betopper-lc001')), /barndoor/i);
  assert.equal(itemNotes({ detail: 'Shotgun microphone', notes: 'Needs a battery' }), 'Needs a battery Shotgun microphone');
});

test('search matches names, brands, and notes, including accented brands', () => {
  assert.equal(matchesQuery(byId('shure-sm58'), ''), true);
  assert.equal(matchesQuery(byId('shure-sm58'), '   '), true);
  assert.equal(matchesQuery(byId('shure-sm58'), 'SM58'), true);
  assert.equal(matchesQuery(byId('shure-head'), 'shure headset'), true);
  assert.equal(matchesQuery(byId('shure-sm58'), 'shure headset'), false);
  assert.equal(matchesQuery(byId('pig-hog-phm50'), 'hog'), true);
  assert.equal(matchesQuery(byId('proco-cable'), 'pro co'), true);
  assert.equal(matchesQuery(byId('betopper-lc001'), 'barndoor'), true);
  assert.equal(matchesQuery(byId('mini-lav'), 'lav'), true);
  assert.equal(matchesQuery(byId('rode-holders'), 'røde'), true);
  assert.equal(matchesQuery(byId('rode-ntg4'), 'RODE'), true);
  assert.equal(matchesQuery(byId('yamaha-mg12'), 'yamaha mixer'), true);
});

test('an explicit brand is searchable even when the name omits it', () => {
  const item = { id: 'custom', name: 'Dynamic microphone', brand: 'Audio-Technica', detail: 'Spare vocal mic' };
  assert.equal(matchesQuery(item, 'audio-technica'), true);
  assert.equal(matchesQuery(item, 'spare vocal'), true);
});

test('category and photo filters compose with search', () => {
  const mics = visibleItems(inventory.items, { category: 'Mics' });
  assert.ok(mics.length > 0);
  assert.ok(mics.every((item) => item.category === 'Mics'));

  const shureMics = visibleItems(inventory.items, { query: 'shure', category: 'Mics' });
  assert.ok(shureMics.every((item) => item.category === 'Mics' && /shure/i.test(item.name)));

  const lightingPhotos = visibleItems(inventory.items, { category: 'Lighting', photo: 'photo' });
  assert.deepEqual(
    lightingPhotos.map((item) => item.id),
    ['gvm-led-light-kit', 'betopper-lc001'],
  );

  const unphotographedSpeakers = visibleItems(inventory.items, {
    category: 'Speakers & stands',
    photo: 'nophoto',
  });
  assert.deepEqual(
    unphotographedSpeakers.map((item) => item.id),
    ['pyle-stands'],
  );
});

test('quantities come from the name or the leading note, not kit contents', () => {
  assert.equal(itemQuantity(byId('alto-ts410')), 2);
  assert.equal(itemQuantity(byId('pyle-stands')), 2);
  assert.equal(itemQuantity(byId('swiff-m1')), 2);
  assert.equal(itemQuantity(byId('mic-stands')), 2);
  assert.equal(itemQuantity(byId('rode-holders')), 2);
  assert.equal(itemQuantity(byId('xlr-quarter-adapters')), 3);
  assert.equal(itemQuantity(byId('speakon')), 2);
  assert.equal(itemQuantity(byId('psu')), 2);
  assert.equal(itemQuantity(byId('pig-hog-phm50')), 2);
  assert.equal(itemQuantity(byId('gvm-led-light-kit')), 1);
  assert.equal(itemQuantity(byId('phenyx-ptu-5000')), 1);
  assert.equal(itemQuantity(byId('kxable-rca-quarter-50ft')), 1);
  assert.equal(itemQuantity(byId('elecan-xlr-75ft')), 1);
  assert.equal(itemQuantity(byId('yamaha-mg12')), 1);
  assert.equal(itemQuantity({ name: 'Spare cable', quantity: 4 }), 4);
  assert.ok(inventory.items.every((item) => itemQuantity(item) >= 1));
});

test('groups packed items by the catalog category order', () => {
  const items = [byId('betopper-lc001'), byId('shure-sm58'), byId('pig-hog-phm50'), byId('rode-ntg4')];
  const groups = groupByCategory(items, inventory.categories);
  assert.deepEqual(
    groups.map(([category, list]) => [category, list.map((item) => item.id)]),
    [
      ['Mics', ['shure-sm58', 'rode-ntg4']],
      ['Cables & power', ['pig-hog-phm50']],
      ['Lighting', ['betopper-lc001']],
    ],
  );
  assert.equal(totalQuantity(items), 5);
});
