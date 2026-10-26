import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import { Button, ButtonGroup } from 'react-bootstrap';
import { useMapEditor } from '../MapEditorProvider';
import { useElementSize } from '../hooks/useElementSize';
import { useStageZoomPan } from '../hooks/useStageZoomPan';
import { bounds, findContainer } from '../utils/geometry';
import GridLayer from './GridLayer';
import EntityShape from './EntityShape';

const KEY = { section: 'sections', aisle: 'aisles', shelf: 'shelves' };
const PARENT = { shelf: { field: 'aisleId', pool: 'aisles' }, aisle: { field: 'sectionId', pool: 'sections' } };

function contentBounds(map) {
  const pts = [];
  for (const k of Object.values(KEY)) {
    for (const e of Object.values(map[k])) for (const p of e.polygon) pts.push(p);
  }
  return pts.length ? bounds(pts) : null;
}

export default function EditorCanvas() {
  const { state, status, actions, issueIndex, readOnly } = useMapEditor();
  const { map, selection, tool, shelfItemCounts } = state;

  const containerRef = useRef(null);
  const size = useElementSize(containerRef);
  const { stageRef, scale, onWheel, zoomBy, fit } = useStageZoomPan();

  // Latest map for event handlers, without making the handlers change identity
  const mapRef = useRef(map);
  mapRef.current = map;

  /* ---------- derived ---------- */

  const sections = useMemo(() => Object.values(map.sections), [map.sections]);
  const aisles = useMemo(() => Object.values(map.aisles), [map.aisles]);
  const shelves = useMemo(() => Object.values(map.shelves), [map.shelves]);

  const content = useMemo(() => contentBounds(map), [map]);
  const world = useMemo(() => ({
    w: Math.max(60, Math.ceil((content?.maxX ?? 0) + 10)),
    h: Math.max(40, Math.ceil((content?.maxY ?? 0) + 10)),
  }), [content]);

  /* ---------- fit once per load ---------- */

  const fitted = useRef(false);
  useEffect(() => {
    if (status !== 'ready') { fitted.current = false; return; }
    if (!fitted.current && size.width > 0 && size.height > 0) {
      fit(content, size);
      fitted.current = true;
    }
  }, [status, size, content, fit]);

  /* ---------- handlers (stable identities so EntityShape memoizes) ---------- */

  const onSelect = useCallback(
    (type, id) => actions.select({ type, id }),
    [actions]
  );

  // After a drag: if a shelf/aisle now sits inside a different parent, reparent it.
  // If it's inside none, leave the parent alone: validation will flag OUTSIDE_PARENT.
  const onMoveEnd = useCallback((type, id, dx, dy) => {
    const m = mapRef.current;
    const entity = m[KEY[type]][id];
    let newParentId;

    if (entity && PARENT[type]) {
      const { field, pool } = PARENT[type];
      const moved = entity.polygon.map(([x, y]) => [x + dx, y + dy]);
      const found = findContainer(moved, Object.values(m[pool]));
      if (found && found !== entity[field]) newParentId = found;
    }
    actions.moveEntity(type, id, dx, dy, newParentId);
  }, [actions]);

  const onStageClick = (e) => {
    // Only a click on empty canvas (target is the Stage itself) clears selection
    if (tool === 'select' && e.target === e.target.getStage()) actions.select(null);
  };

  /* ---------- render ---------- */

  const interactive = tool === 'select';
  const draggable = interactive && !readOnly;

  const renderShapes = (type, list) =>
    list.map((entity) => (
      <EntityShape
        key={entity.id}
        type={type}
        entity={entity}
        selected={selection?.type === type && selection.id === entity.id}
        hasIssue={issueIndex.has(`${type}:${entity.id}`)}
        itemCount={type === 'shelf' ? shelfItemCounts[entity.id] ?? 0 : 0}
        interactive={interactive}
        draggable={draggable}
        onSelect={onSelect}
        onMoveEnd={onMoveEnd}
      />
    ));

  const showStage = status === 'ready' && size.width > 0 && size.height > 0;

  return (
    <div
      ref={containerRef}
      className="position-relative w-100 h-100 bg-light overflow-hidden"
      style={{ minHeight: 0, cursor: interactive ? 'default' : 'crosshair' }}
    >
      {showStage && (
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          draggable={interactive}   // drag empty canvas to pan; shapes capture their own drags
          onWheel={onWheel}
          onClick={onStageClick}
          onTap={onStageClick}
        >
          <GridLayer widthUnits={world.w} heightUnits={world.h} scale={scale} />
          <Layer>
            {renderShapes('section', sections)}
            {renderShapes('aisle', aisles)}
            {renderShapes('shelf', shelves)}
          </Layer>
          {/* DraftLayer (in-progress drawing, via useDrawTool) goes here */}
        </Stage>
      )}

      <div className="position-absolute top-0 end-0 m-2 d-flex align-items-center gap-2">
        <span className="badge text-bg-light border">{Math.round(scale * 100)}%</span>
        <ButtonGroup size="sm">
          <Button variant="light" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>−</Button>
          <Button variant="light" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>+</Button>
          <Button variant="light" onClick={() => fit(content, size)}>Fit</Button>
        </ButtonGroup>
      </div>
    </div>
  );
}