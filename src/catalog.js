/**
 * Search, category filtering, and pack quantities for the catalog.
 * Brands are read from an item's brand field or the leading name,
 * and notes are the notes field plus the existing detail text.
 */

const MULTI_WORD_BRANDS = ['Alto Professional', 'Pig Hog', 'Phenyx Pro', 'Pro Co', 'Swiff Audio'];

const GENERIC_FIRST = new Set([
  'black',
  'grey',
  'gray',
  'teal',
  'braided',
  'dual',
  'mini',
  'power',
  'microphone',
  'mic',
  'cable',
  'cables',
]);

const CONNECTORS = ['xlr', 'rca', 'trs', 'ts', 'dmx', 'speakon'];

const LETTER_FOLDS = {
  ø: 'o',
  Ø: 'O',
  æ: 'ae',
  Æ: 'AE',
  ð: 'd',
  Ð: 'D',
  ł: 'l',
  Ł: 'L',
  ß: 'ss',
};

function cleanToken(token) {
  return token.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function foldSearch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[øØæÆðÐłŁß]/g, (char) => LETTER_FOLDS[char] || char)
    .toLowerCase();
}

export function itemBrand(item) {
  if (typeof item?.brand === 'string' && item.brand.trim()) return item.brand.trim();
  const name = String(item?.name ?? '').trim();
  if (!name) return '';
  const multi = MULTI_WORD_BRANDS.find((brand) => foldSearch(name).startsWith(foldSearch(brand)));
  if (multi) return multi;
  const first = name.split(/\s+/)[0];
  const key = cleanToken(first);
  if (!key || GENERIC_FIRST.has(key)) return '';
  if (CONNECTORS.some((connector) => key === connector || key.startsWith(connector))) return '';
  if (/^[\d.]+(?:mm|ft|in|m)?$/i.test(first)) return '';
  return first;
}

export function itemNotes(item) {
  return [item?.notes, item?.detail].filter((value) => typeof value === 'string' && value.trim()).join(' ');
}

export function searchHaystack(item) {
  return foldSearch([item?.name, itemBrand(item), itemNotes(item), item?.category, item?.id].join(' '));
}

export function matchesQuery(item, query) {
  const tokens = foldSearch(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = searchHaystack(item);
  return tokens.every((token) => haystack.includes(token));
}

export function matchesCategory(item, category) {
  if (!category || category === 'all') return true;
  return item?.category === category;
}

export function hasPhoto(item) {
  return Array.isArray(item?.photos) && item.photos.length > 0;
}

export function visibleItems(items, { query = '', category = 'all', photo = 'all' } = {}) {
  return items.filter((item) => {
    if (!matchesQuery(item, query)) return false;
    if (!matchesCategory(item, category)) return false;
    if (photo === 'photo') return hasPhoto(item);
    if (photo === 'nophoto') return !hasPhoto(item);
    return true;
  });
}

const UNIT_WORD =
  /^(ft|feet|foot|in|inch|inches|mm|cm|m|awg|w|watt|watts|ohm|ohms|channel|channels|pin|way|ghz|khz|mhz)$/i;

function clampQuantity(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 24) return null;
  return number;
}

function leadingQuantity(text) {
  const source = String(text ?? '').trim();
  if (!source) return null;
  const paren = source.match(/\((\d+)\s*[×x](?!\w)/i);
  if (paren) return clampQuantity(paren[1]);
  const times = source.match(/^(\d+)\s*[×x](?!\w)/i);
  if (times) return clampQuantity(times[1]);
  const word = source.match(/^(\d+)\s+([A-Za-z].*)$/);
  if (word && !UNIT_WORD.test(word[2].split(/\s+/)[0])) return clampQuantity(word[1]);
  return null;
}

export function itemQuantity(item) {
  if (Number.isInteger(item?.quantity) && item.quantity > 0 && item.quantity <= 24) return item.quantity;
  return leadingQuantity(item?.name) ?? leadingQuantity(itemNotes(item)) ?? 1;
}

export function groupByCategory(items, categories) {
  const grouped = new Map((categories ?? []).map((category) => [category, []]));
  for (const item of items) {
    const category = item.category || 'Other';
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(item);
  }
  return [...grouped.entries()].filter(([, list]) => list.length > 0);
}

export function totalQuantity(items) {
  return items.reduce((sum, item) => sum + itemQuantity(item), 0);
}
