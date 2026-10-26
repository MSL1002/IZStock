import { polygonContains, findOverlappingPairs, area, EPS } from "./geometry"

export const CODES = {
    INVALID_SHAPE: 'INVALID_SHAPE',                    // client only
    OUTSIDE_PARENT: 'OUTSIDE_PARENT',                  // client only
    OVERLAP: 'OVERLAP',                                // client only
    MISSING_LABEL: 'MISSING_LABEL',                    // client only
    DUPLICATE_AISLE_NUMBER: 'DUPLICATE_AISLE_NUMBER',  // mirrors server 422
    SHELVES_IN_USE: 'SHELVES_IN_USE',                  // mirrors server 422
}

const normNumber = (n) => String(n ?? '').trim().toLowerCase();

function groupBy(list, key){
    return list.reduce((acc, item) => {
        (acc[item[key]] ??= []).push(item);
        return acc;
    }, {});
}

// pure: normalized map in, array of issues out. An empty array means "safe to save".
// issue shape: { code, entityType, ids: [..], message, details? }

export function validateMap(map, { shelfItemCounts = {} } = {}) {
  const issues = [];
  const add = (code, entityType, ids, message, details) =>
    issues.push({ code, entityType, ids, message, ...(details && { details }) });

  const sections = Object.values(map.sections);
  const aisles = Object.values(map.aisles);
  const shelves = Object.values(map.shelves);
  const label = (a) => `Aisle ${String(a.aisleNumber).trim() || '(no number)'}`;

  // 1. shapes must have real area
  for (const [type, list] of [['section', sections], ['aisle', aisles], ['shelf', shelves]]) {
    for (const e of list) {
      if (area(e.polygon) < EPS) add(CODES.INVALID_SHAPE, type, [e.id], `A ${type} has no area.`);
    }
  }

  // 2. requires label
  for (const s of sections) {
    if (!s.name?.trim()) add(CODES.MISSING_LABEL, 'section', [s.id], 'A section needs a name.');
  }
  for (const a of aisles) {
    if (!String(a.aisleNumber ?? '').trim()) {
      add(CODES.MISSING_LABEL, 'aisle', [a.id], 'Every aisle needs an aisle number.');
    }
  }

  // 3. containment: shelf inside aisle, aisle inside section
  for (const a of aisles) {
    const parent = map.sections[a.sectionId];
    if (parent && !polygonContains(parent.polygon, a.polygon)) {
      add(CODES.OUTSIDE_PARENT, 'aisle', [a.id], `${label(a)} extends outside its section "${parent.name}".`);
    }
  }
  for (const sh of shelves) {
    const parent = map.aisles[sh.aisleId];
    if (parent && !polygonContains(parent.polygon, sh.polygon)) {
      add(CODES.OUTSIDE_PARENT, 'shelf', [sh.id], `A shelf extends outside ${label(parent)}.`);
    }
  }

  // 4. overlaps among siblings (touching edges are allowed)
  for (const [a, b] of findOverlappingPairs(sections)) {
    add(CODES.OVERLAP, 'section', [a, b], `Sections "${map.sections[a].name}" and "${map.sections[b].name}" overlap.`);
  }
  for (const group of Object.values(groupBy(aisles, 'sectionId'))) {
    for (const [a, b] of findOverlappingPairs(group)) {
      add(CODES.OVERLAP, 'aisle', [a, b], `${label(map.aisles[a])} and ${label(map.aisles[b])} overlap.`);
    }
  }
  for (const group of Object.values(groupBy(shelves, 'aisleId'))) {
    for (const [a, b] of findOverlappingPairs(group)) {
      add(CODES.OVERLAP, 'shelf', [a, b], `Two shelves in ${label(map.aisles[map.shelves[a].aisleId])} overlap.`);
    }
  }

  // 5. Duplicate aisle numbers (checked on the FINAL state, so swaps are fine)
  const byNumber = groupBy(aisles.filter((a) => normNumber(a.aisleNumber)), 'aisleNumber');
  const grouped = {};
  for (const a of aisles) {
    const n = normNumber(a.aisleNumber);
    if (n) (grouped[n] ??= []).push(a.id);
  }
  void byNumber; // (kept out of use; grouping above is case/whitespace-insensitive)
  for (const [n, ids] of Object.entries(grouped)) {
    if (ids.length > 1) {
      add(CODES.DUPLICATE_AISLE_NUMBER, 'aisle', ids, `Aisle number "${n}" is used ${ids.length} times.`);
    }
  }

  // 6. Shelves that still hold items must not disappear
  for (const [shelfId, count] of Object.entries(shelfItemCounts)) {
    if (count > 0 && !map.shelves[shelfId]) {
      add(CODES.SHELVES_IN_USE, 'shelf', [shelfId],
        `A deleted shelf still holds ${count} item${count === 1 ? '' : 's'}. Move them first.`,
        { shelfId, count });
    }
  }

  return issues;
}

// ---- UI helpers ----

export const canSave = (issues) => issues.length === 0;

// lookup for highlighting: key `${entityType}:${id}` -> issues touching that entity.
export function issuesByEntity(issues) {
  const index = new Map();
  for (const issue of issues) {
    for (const id of issue.ids) {
      const key = `${issue.entityType}:${id}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(issue);
    }
  }
  return index;
}

// Server 422 -> client issues, so a rejected save highlights the same way.
// Assumes the error envelope's details are shaped like { shelfId } or { aisleNumber }.
export function issuesFromServerError(error) {
  return (error.details ?? []).map((d) => ({
    code: error.code,
    entityType: d.shelfId ? 'shelf' : 'aisle',
    ids: [d.shelfId ?? d.aisleId].filter(Boolean),
    message: error.message,
  }));
}