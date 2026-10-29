export const EPS = 1e-9;

// ---- basics ----

export function bounds(polygon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function signedArea(polygon) {
  let sum = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    sum += x0 * y1 - x1 * y0;
  }
  return sum / 2;
}

export const area = (polygon) => Math.abs(signedArea(polygon));

export function centroid(polygon) {
  const a = signedArea(polygon);
  if (Math.abs(a) < EPS) {
    const b = bounds(polygon); // degenerate: fall back to bbox center
    return [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2];
  }
  let cx = 0, cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    const f = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * f;
    cy += (y0 + y1) * f;
  }
  return [cx / (6 * a), cy / (6 * a)];
}

export function isAxisAlignedRect(polygon) {
  if (polygon.length !== 4) return false;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % 4];
    if (Math.abs(x1 - x0) > EPS && Math.abs(y1 - y0) > EPS) return false;
  }
  return Math.abs(area(polygon) - bounds(polygon).width * bounds(polygon).height) < 1e-6;
}

const edges = (polygon) =>
  polygon.map((p, i) => [p, polygon[(i + 1) % polygon.length]]);

const midpoint = ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// ---- point location ----

const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function onSegment(p, a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  if (Math.abs(cross(a, b, p)) / len > 1e-7) return false;
  return (
    p[0] >= Math.min(a[0], b[0]) - 1e-7 && p[0] <= Math.max(a[0], b[0]) + 1e-7 &&
    p[1] >= Math.min(a[1], b[1]) - 1e-7 && p[1] <= Math.max(a[1], b[1]) + 1e-7
  );
}

// 'inside' | 'boundary' | 'outside'. Ray casting, with an explicit boundary pass
// so shapes that share an edge are not misreported.
export function locatePoint(p, polygon) {
  for (const [a, b] of edges(polygon)) if (onSegment(p, a, b)) return 'boundary';
  const [x, y] = p;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (((yi > y) !== (yj > y)) && (x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi)) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}

// creates a new segment depending on the distance from each edge on the side
export function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

export const pointInPolygon = (p, polygon) => locatePoint(p, polygon) !== 'outside';

// ---- segments ----

const orient = (a, b, c) => {
  const v = cross(a, b, c);
  return Math.abs(v) < EPS ? 0 : Math.sign(v);
};

// Strict crossing only: touching endpoints or collinear overlap don't count.
const properCross = (a, b, c, d) =>
  orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0;

function edgesProperlyCross(p, q) {
  for (const [a, b] of edges(p)) for (const [c, d] of edges(q)) if (properCross(a, b, c, d)) return true;
  return false;
}

const probes = (polygon) => [...polygon, ...edges(polygon).map(midpoint), centroid(polygon)];

// ---- overlap / other errors ----

// True when interiors overlap. Shapes that merely touch along an edge or at a
// corner do NOT overlap, so adjacent aisles/shelves are allowed.
export function polygonsOverlap(a, b) {
  const ba = bounds(a), bb = bounds(b);
  if (ba.maxX <= bb.minX + EPS || bb.maxX <= ba.minX + EPS ||
    ba.maxY <= bb.minY + EPS || bb.maxY <= ba.minY + EPS) return false;

  // Two axis-aligned rects whose boxes overlap with positive area: done.
  if (isAxisAlignedRect(a) && isAxisAlignedRect(b)) return true;

  if (edgesProperlyCross(a, b)) return true;
  // Catches containment and identical shapes (centroid of one is strictly inside the other).
  return (
    probes(a).some((p) => locatePoint(p, b) === 'inside') ||
    probes(b).some((p) => locatePoint(p, a) === 'inside')
  );
}

// True when `inner` lies entirely within `outer` (touching the boundary is fine).
export function polygonContains(outer, inner) {
  if (inner.some((p) => locatePoint(p, outer) === 'outside')) return false;
  if (edges(inner).some((e) => locatePoint(midpoint(e), outer) === 'outside')) return false;
  return !edgesProperlyCross(outer, inner);
}

// False when two non-adjacent edges cross (a bow-tie / figure-eight).
export function isSimplePolygon(polygon) {
  const es = edges(polygon);
  for (let i = 0; i < es.length; i++) {
    for (let j = i + 1; j < es.length; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === es.length - 1);
      if (!adjacent && properCross(es[i][0], es[i][1], es[j][0], es[j][1])) return false;
    }
  }
  return true;
}

// ---- finders used by tools and validation ----

// Parent lookup for a newly drawn shape: the smallest candidate containing its
// centroid. `candidates` is an array of { id, polygon }. Returns an id or null.
export function findContainer(polygon, candidates) {
  const c = centroid(polygon);
  let best = null;
  let bestArea = Infinity;
  for (const cand of candidates) {
    if (!pointInPolygon(c, cand.polygon)) continue;
    const a = area(cand.polygon);
    if (a < bestArea) { best = cand.id; bestArea = a; }
  }
  return best;
}

// Overlapping pairs among siblings: [[idA, idB], ...]. Bounding boxes prefilter,
// so this is fast at store scale.
export function findOverlappingPairs(items) {
  const withBounds = items.map((it) => ({ ...it, box: bounds(it.polygon) }));
  const pairs = [];
  for (let i = 0; i < withBounds.length; i++) {
    for (let j = i + 1; j < withBounds.length; j++) {
      const A = withBounds[i], B = withBounds[j];
      if (A.box.maxX <= B.box.minX || B.box.maxX <= A.box.minX ||
        A.box.maxY <= B.box.minY || B.box.maxY <= A.box.minY) continue;
      if (polygonsOverlap(A.polygon, B.polygon)) pairs.push([A.id, B.id]);
    }
  }
  return pairs;
}