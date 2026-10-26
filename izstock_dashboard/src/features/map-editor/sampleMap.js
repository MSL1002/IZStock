const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

// Vertical aisle: shelves flank a 1-unit walkway
const vAisle = (id, n, x) => ({
  id, aisleNumber: n, polygon: rect(x, 2, x + 3, 14),
  shelves: [
    { id: `${id}-L`, polygon: rect(x, 2, x + 1, 14), side: 'left' },
    { id: `${id}-R`, polygon: rect(x + 2, 2, x + 3, 14), side: 'right' },
  ],
});

// Horizontal aisle
const hAisle = (id, n, x1, y1, x2, y2) => ({
  id, aisleNumber: n, polygon: rect(x1, y1, x2, y2),
  shelves: [
    { id: `${id}-B`, polygon: rect(x1, y1, x2, y1 + 1), side: 'back' },
    { id: `${id}-F`, polygon: rect(x1, y2 - 1, x2, y2), side: 'front' },
  ],
});

export const sampleMap = {
  storeId: 'store-1',
  version: 1,
  units: 'meters',
  sections: [
    { id: 'sec-dairy', name: 'Dairy', color: '#4dabf7', polygon: rect(1, 1, 21, 15),
      aisles: [vAisle('a-1', '1', 2), vAisle('a-2', '2', 6), vAisle('a-3', '3', 10)] },
    { id: 'sec-produce', name: 'Produce', color: '#69db7c', polygon: rect(22, 1, 39, 15),
      aisles: [vAisle('a-4', '4', 23), vAisle('a-5', '5', 27)] },
    { id: 'sec-frozen', name: 'Frozen', color: '#a78bfa',
      polygon: [[1, 17], [39, 17], [39, 23], [20, 23], [20, 21], [1, 21]],
      aisles: [hAisle('a-6', '6', 2, 18, 18, 21), hAisle('a-7', '7', 22, 18, 38, 22)] },
  ],
};

export const sampleItemCounts = { 'a-1-L': 14, 'a-4-R': 6 };