const SIDE_LABEL = { left: 'Left', right: 'Right', front: 'Front', back: 'Back' };

// -> [{ id, number, label, shelves: [{ id, label }] }], sorted by aisle number
export function flattenLocations(map) {
const sections = map?.sections ?? map?.payload?.sections ?? [];

const aisles = sections.flatMap((section) =>
    section.aisles.map((aisle) => {
    const names = aisle.shelves.map((s) => SIDE_LABEL[s.side] ?? 'Shelf');
    const totals = names.reduce((acc, n) => ({ ...acc, [n]: (acc[n] ?? 0) + 1 }), {});
    const seen = {};
    const shelves = aisle.shelves.map((s, i) => {
        const name = names[i];
        seen[name] = (seen[name] ?? 0) + 1;
        return { id: s.id, label: totals[name] > 1 ? `${name} ${seen[name]}` : name };
    });

    return {
        id: aisle.id,
        number: String(aisle.aisleNumber),
        label: `Aisle ${aisle.aisleNumber} (${section.name})`,
        shelves,
    };
    })
);

    return aisles.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
}