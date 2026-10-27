import { area, EPS, findContainer, isSimplePolygon, polygonContains, polygonsOverlap } from './geometry';

// tool: 'aisle' | 'shelf'. Returns { parentId, error }.
export function checkRect(tool, polygon, map) {
  const isAisle = tool === 'aisle';
  const parentPool = isAisle ? map.sections : map.aisles;
  const parentName = isAisle ? 'section' : 'aisle';

  const parentId = findContainer(polygon, Object.values(parentPool));
  if (!parentId) return { parentId: null, error: `Draw ${isAisle ? 'an aisle' : 'a shelf'} inside a ${parentName}.` };

  if (!polygonContains(parentPool[parentId].polygon, polygon)) {
    return { parentId, error: `That shape sticks out of its ${parentName}.` };
  }

  const field = isAisle ? 'sectionId' : 'aisleId';
  const siblings = Object.values(isAisle ? map.aisles : map.shelves).filter((s) => s[field] === parentId);
  const hit = siblings.find((s) => polygonsOverlap(s.polygon, polygon));
  if (hit) {
    return { parentId, error: isAisle ? `Overlaps aisle ${hit.aisleNumber || '(no number)'}.` : 'Overlaps another shelf.' };
  }
  return { parentId, error: null };
}

// Returns an error message, or null when the section can be added.
export function checkSection(polygon, map) {
  if (area(polygon) < EPS) return 'That section has no area.';
  if (!isSimplePolygon(polygon)) return 'The edges cross each other. Backspace removes the last corner.';
  const hit = Object.values(map.sections).find((s) => polygonsOverlap(s.polygon, polygon));
  if (hit) return `Overlaps the section "${hit.name || 'Unnamed'}".`;
  return null;
}