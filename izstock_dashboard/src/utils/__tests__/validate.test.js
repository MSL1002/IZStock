import { validateMap } from '../../features/map-editor/utils/validate';
import { polygonContains, polygonsOverlap, findContainer } from '../../features/map-editor/utils/geometry';

const rect = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
const map = ({ aisleNumbers = ['1'], shelf = rect(1, 1, 2, 5) } = {}) => ({
  sections: { s1: { id: 's1', name: 'Dairy', polygon: rect(0, 0, 20, 20) } },
  aisles: Object.fromEntries(aisleNumbers.map((n, i) => [
    `a${i}`, { id: `a${i}`, sectionId: 's1', aisleNumber: n, polygon: rect(i * 5, 0, i * 5 + 4, 10) },
  ])),
  shelves: { sh1: { id: 'sh1', aisleId: 'a0', polygon: shelf } },
});

test('shelf inside its aisle is valid', () => {
  expect(validateMap(map())).toEqual([]);
});

test('shelf poking outside its aisle is flagged', () => {
  const codes = validateMap(map({ shelf: rect(3, 1, 6, 5) })).map((i) => i.code);
  expect(codes).toContain('OUTSIDE_PARENT');
});

test('adjacent aisles sharing a wall do not overlap', () => {
  expect(polygonsOverlap(rect(0, 0, 4, 10), rect(4, 0, 8, 10))).toBe(false);
});

test('duplicate aisle numbers are flagged, swaps are not', () => {
  expect(validateMap(map({ aisleNumbers: ['3', '3'] })).map((i) => i.code))
    .toContain('DUPLICATE_AISLE_NUMBER');
  expect(validateMap(map({ aisleNumbers: ['4', '3'] }))).toEqual([]);
});

test('removing a shelf that holds items blocks saving', () => {
  const issues = validateMap(map(), { shelfItemCounts: { gone: 3 } });
  expect(issues[0].code).toBe('SHELVES_IN_USE');
});

test('findContainer picks the smallest container', () => {
  const id = findContainer(rect(1, 1, 2, 2), [
    { id: 'big', polygon: rect(0, 0, 20, 20) },
    { id: 'small', polygon: rect(0, 0, 4, 10) },
  ]);
  expect(id).toBe('small');
});

test('polygonContains allows touching the boundary', () => {
  expect(polygonContains(rect(0, 0, 4, 10), rect(0, 0, 2, 10))).toBe(true);
});