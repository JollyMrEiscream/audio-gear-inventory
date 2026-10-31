import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fittedSize } from '../src/fit.js';

test('a large stage does not enlarge a photo past native pixels', () => {
  const size = fittedSize(1200, 1600, 4000, 4000);
  assert.deepEqual({ width: size.width, height: size.height }, { width: 1200, height: 1600 });
  assert.equal(size.scale, 1);
});

test('a small photo stays at native size inside a large frame', () => {
  const size = fittedSize(80, 40, 800, 800);
  assert.equal(size.width, 80);
  assert.equal(size.height, 40);
});

test('scales down uniformly when the frame is smaller than the photo', () => {
  const size = fittedSize(1200, 1600, 600, 600);
  assert.ok(size.width <= 600);
  assert.ok(size.height <= 600);
  assert.ok(size.width <= 1200);
  assert.ok(size.height <= 1600);
  assert.ok(Math.abs(size.width / size.height - 1200 / 1600) < 0.02);
});

test('landscape photos stay within both edges', () => {
  const size = fittedSize(1600, 1200, 300, 1000);
  assert.ok(size.width <= 300);
  assert.ok(size.height <= 1000);
  assert.ok(size.width <= 1600);
  assert.ok(size.height <= 1200);
  assert.ok(Math.abs(size.width / size.height - 1600 / 1200) < 0.02);
});

test('rejects a box with no space', () => {
  assert.equal(fittedSize(1200, 1600, 0, 400), null);
  assert.equal(fittedSize(0, 1600, 400, 400), null);
});
