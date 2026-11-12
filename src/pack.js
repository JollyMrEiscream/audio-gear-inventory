/** Gig pack list stored as item ids. The catalog stays the source of names and quantities. */

export const PACK_KEY = 'audio-gear-pack';

export function loadPack(storage) {
  try {
    const raw = storage.getItem(PACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = [];
    const seen = new Set();
    for (const id of parsed) {
      if (typeof id !== 'string' || !id.trim() || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

export function savePack(ids, storage) {
  storage.setItem(PACK_KEY, JSON.stringify(ids));
}

export function togglePackId(ids, id) {
  return ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id];
}

export function packedItems(items, ids) {
  const wanted = new Set(ids);
  return items.filter((item) => wanted.has(item.id));
}
