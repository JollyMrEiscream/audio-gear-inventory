/**
 * Pixel size for a photo inside a box.
 * Scale never goes above 1, so the bitmap is not enlarged past its native pixels.
 */
export function fittedSize(naturalWidth, naturalHeight, availWidth, availHeight) {
  const nw = Number(naturalWidth);
  const nh = Number(naturalHeight);
  const aw = Number(availWidth);
  const ah = Number(availHeight);
  if (![nw, nh, aw, ah].every((n) => Number.isFinite(n) && n > 0)) return null;

  const scale = Math.min(1, aw / nw, ah / nh);
  const width = Math.max(1, Math.min(Math.round(nw * scale), Math.floor(nw), Math.floor(aw)));
  const height = Math.max(1, Math.min(Math.round(nh * scale), Math.floor(nh), Math.floor(ah)));
  return { width, height, scale };
}
