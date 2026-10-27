export const DEFAULT_PX_PER_UNIT = 20; // constant; zoom is the Stage's scale, not this
export const DEFAULT_SNAP = 0.5;       // store units
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 6;

export const round = (n) => Math.round(n * 1e4) / 1e4

// ---- store units <-> pixels ----
export const toPx = (points, pxPerUnit = DEFAULT_PX_PER_UNIT) =>
    points.flatMap(([x,y]) => [x * pxPerUnit, y * pxPerUnit]);

export const pointToPx = ([x, y], pxPerUnit = DEFAULT_PX_PER_UNIT) =>
    [x * pxPerUnit, y * pxPerUnit];

export const toUnits = ([x, y], pxPerUnit = DEFAULT_PX_PER_UNIT) =>
    [x / pxPerUnit, y / pxPerUnit];

// ---- snapping + clamping ----

export const snapValue = (v, step = DEFAULT_SNAP) =>
    step > 0 ? round(Math.round(v / step) * step) : round(v);

export const snapPoint = ([x, y], step = DEFAULT_SNAP) =>[
        Math.max(0, snapValue(x, step)),
        Math.max(0, snapValue(y, step))
    ];

// ---- pointer -> store units ----

// getRelativePointerPosition() already accounts for the Stage's zoom and pan
export function pointerToStore(stage, pxPerUnit = DEFAULT_PX_PER_UNIT, step = DEFAULT_SNAP) {
  const p = stage.getRelativePointerPosition();
  if (!p) return null;
  return snapPoint(toUnits([p.x, p.y], pxPerUnit), step);
}

// ---- shapes ----

// Two opposite corners (drag start/end) -> 4-point polygon, or null if degenerate.
export function rectToPolygon(a, b, minSize = DEFAULT_SNAP) {
  const minX = Math.min(a[0], b[0]);
  const maxX = Math.max(a[0], b[0]);
  const minY = Math.min(a[1], b[1]);
  const maxY = Math.max(a[1], b[1]);
  if (maxX - minX < minSize || maxY - minY < minSize) return null;
  return [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
}

// ---- drag / transform results ----

// After a drag, the Konva node's x/y is its offset in px from where it started.
// Convert to a store-unit delta for MOVE_ENTITY. The caller then resets the node
// to x=0, y=0. Snapping the delta (not the result) keeps already-aligned shapes
// on the grid.
export function dragDeltaToUnits(node, pxPerUnit = DEFAULT_PX_PER_UNIT, step = DEFAULT_SNAP) {
  return {
    dx: snapValue(node.x() / pxPerUnit, step),
    dy: snapValue(node.y() / pxPerUnit, step),
  };
}

// For a Konva.Transformer on a <Rect>: resizing changes scaleX/scaleY, not
// width/height. Bake the scale into the size, snap, and return a polygon for
// SET_POLYGON. The caller must reset node.scale({ x: 1, y: 1 }) afterwards.
export function transformedRectToPolygon(node, pxPerUnit = DEFAULT_PX_PER_UNIT, step = DEFAULT_SNAP) {
  const [x, y] = snapPoint(toUnits([node.x(), node.y()], pxPerUnit), step);
  const w = snapValue((node.width() * node.scaleX()) / pxPerUnit, step);
  const h = snapValue((node.height() * node.scaleY()) / pxPerUnit, step);
  return rectToPolygon([x, y], [x + w, y + h], step);
}

// A Rect node (after a Transformer resize) -> snapped 4-point polygon, or null if degenerate.
// The Transformer changes scaleX/scaleY, not width/height, so bake the scale in here.
export function rectNodeToPolygon(node, pxPerUnit = DEFAULT_PX_PER_UNIT, step = DEFAULT_SNAP) {
  const x1 = node.x();
  const y1 = node.y();
  const x2 = x1 + node.width() * node.scaleX();
  const y2 = y1 + node.height() * node.scaleY();
  return rectToPolygon(
    snapPoint(toUnits([x1, y1], pxPerUnit), step),
    snapPoint(toUnits([x2, y2], pxPerUnit), step),
    step
  );
}

// ---- zoom ----

// Zoom keeping the point under the cursor fixed. Returns the Stage's new scale
// and position; apply with stage.scale({x: s, y: s}) and stage.position(pos).
export function zoomAtPointer(stage, factor, limits = { min: MIN_ZOOM, max: MAX_ZOOM }, pointer = stage.getPointerPosition()) {
  if (!pointer) return null;
  const oldScale = stage.scaleX();
  const scale = Math.min(limits.max, Math.max(limits.min, oldScale * factor));
  const anchor = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  };
  return {
    scale,
    position: { x: pointer.x - anchor.x * scale, y: pointer.y - anchor.y * scale },
  };
}