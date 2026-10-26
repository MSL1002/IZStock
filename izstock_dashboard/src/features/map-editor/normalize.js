export const emptyMap = { sections: {}, aisles: {}, shelves: {} };

// Nested (server / payload shape) -> normalized
export function normalize(storeMap) {
  const map = { sections: {}, aisles: {}, shelves: {} };
  for (const { aisles, ...section } of storeMap.sections) {
    map.sections[section.id] = section;
    for (const { shelves, ...aisle } of aisles) {
      map.aisles[aisle.id] = { ...aisle, sectionId: section.id };
      for (const shelf of shelves) {
        map.shelves[shelf.id] = { ...shelf, aisleId: aisle.id };
      }
    }
  }
  return map;
}

// Normalized -> nested (for PUT /map)
export function denormalize(map) {
  const aislesBySection = groupBy(Object.values(map.aisles), 'sectionId');
  const shelvesByAisle = groupBy(Object.values(map.shelves), 'aisleId');

  return Object.values(map.sections).map((section) => ({
    ...section,
    aisles: (aislesBySection[section.id] ?? []).map(({ sectionId, ...aisle }) => ({
      ...aisle,
      shelves: (shelvesByAisle[aisle.id] ?? []).map(({ aisleId, ...shelf }) => shelf),
    })),
  }));
}

function groupBy(list, key) {
  return list.reduce((acc, item) => {
    (acc[item[key]] ??= []).push(item);
    return acc;
  }, {});
}