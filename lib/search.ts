import type { Product } from '../app/data/products';

// Lower-case, strip Vietnamese accents ("Đế trưng bày" → "de trung bay") so people
// can search without typing diacritics.
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').trim();
}

function haystack(p: Product): string {
  return normalizeText([p.name, p.series, p.id, p.grade, p.scale, p.description, p.specs.weaponList.join(' ')].join(' '));
}

// Every word of the query must appear somewhere in the product (order doesn't matter).
export function matchesQuery(p: Product, query: string): boolean {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const hay = haystack(p);
  return tokens.every(t => hay.includes(t));
}

// Name matches rank above matches that only hit the description.
export function searchRank(p: Product, query: string): number {
  const q = normalizeText(query);
  const name = normalizeText(p.name);
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.includes(q)) return 2;
  return 3;
}
