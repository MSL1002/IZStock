import { bounds, centroid } from './geometry';

const SECTION_COLORS = ['#4dabf7', '#69db7c', '#a78bfa', '#ffa94d', '#f783ac', '#63e6be', '#ffd43b'];

// crypto.randomUUID() only exists in secure contexts (https or localhost).
// the dashboard is served over the store's LAN, possibly as http://192.168.x.x, where it is undefined.
// getRandomValues works everywhere, so fall back to it.
export function newId() {
  const c = crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// Highest numeric aisle number + 1, skipping anything already taken.
export function nextAisleNumber(map) {
  const used = new Set(
    Object.values(map.aisles).map((a) => String(a.aisleNumber ?? '').trim().toLowerCase())
  );
  const nums = [...used].filter((v) => /^\d+$/.test(v)).map(Number);
  let n = nums.length ? Math.max(...nums) + 1 : 1;
  while (used.has(String(n))) n++;
  return String(n);
}

// Guess which side of the aisle a shelf is on. The manager can change it in the panel.
function inferSide(shelfPolygon, aislePolygon) {
  const a = bounds(aislePolygon);
  const [cx, cy] = centroid(shelfPolygon);
  if (a.height >= a.width) return cx < a.minX + a.width / 2 ? 'left' : 'right';
  return cy < a.minY + a.height / 2 ? 'back' : 'front';
}

export const makeSection = (polygon, map) => {
  const n = Object.keys(map.sections).length;
  return {
    id: newId(),
    name: `Section ${n + 1}`,
    color: SECTION_COLORS[n % SECTION_COLORS.length],
    polygon,
  };
};

export const makeAisle = (polygon, sectionId, map) => ({
  id: newId(), sectionId, aisleNumber: nextAisleNumber(map), polygon,
});

export const makeShelf = (polygon, aisleId, map) => ({
  id: newId(), aisleId, polygon, side: inferSide(polygon, map.aisles[aisleId].polygon),
});