import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PACK_KEY, loadPack, packedItems, savePack, togglePackId } from '../src/pack.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
  };
}

test('loads an empty pack when nothing is stored', () => {
  assert.deepEqual(loadPack(memoryStorage()), []);
});

test('round-trips packed ids and ignores corrupt entries', () => {
  const storage = memoryStorage();
  savePack(['shure-sm58', 'alto-ts410'], storage);
  assert.equal(storage.getItem(PACK_KEY), '["shure-sm58","alto-ts410"]');
  assert.deepEqual(loadPack(storage), ['shure-sm58', 'alto-ts410']);

  storage.setItem(PACK_KEY, '{');
  assert.deepEqual(loadPack(storage), []);

  storage.setItem(PACK_KEY, JSON.stringify(['ok', '', 3, 'ok', null, 'betopper-lc001']));
  assert.deepEqual(loadPack(storage), ['ok', 'betopper-lc001']);

  storage.setItem(PACK_KEY, JSON.stringify({ ids: ['shure-sm58'] }));
  assert.deepEqual(loadPack(storage), []);
});

test('toggles an id without dropping the rest of the pack', () => {
  assert.deepEqual(togglePackId([], 'shure-sm58'), ['shure-sm58']);
  assert.deepEqual(togglePackId(['shure-sm58', 'rode-ntg4'], 'shure-sm58'), ['rode-ntg4']);
  assert.deepEqual(togglePackId(['rode-ntg4'], 'alto-ts410'), ['rode-ntg4', 'alto-ts410']);
});

test('keeps packed items in catalog order', () => {
  const items = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ];
  assert.deepEqual(
    packedItems(items, ['c', 'a', 'missing']).map((item) => item.id),
    ['a', 'c'],
  );
});
