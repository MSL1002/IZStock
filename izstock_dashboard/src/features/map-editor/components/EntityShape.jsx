// features/map-editor/components/EntityShape.jsx
import { memo, useMemo } from 'react';
import { Group, Line, Text } from 'react-konva';
import { DEFAULT_PX_PER_UNIT as PX, dragDeltaToUnits, toPx } from '../utils/coords';
import { bounds } from '../utils/geometry';

const SELECTED = '#0d6efd';
const ISSUE = '#dc3545';

function hexToRgba(hex, alpha) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex ?? '') ? hex : '#adb5bd';
  const n = parseInt(safe.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function look(type, entity, itemCount) {
  if (type === 'section') {
    return { fill: hexToRgba(entity.color, 0.35), stroke: '#495057', width: 1.5 };
  }
  if (type === 'aisle') {
    return { fill: 'rgba(255, 255, 255, 0.7)', stroke: '#868e96', width: 1.5 };
  }
  // shelves holding inventory are tinted amber
  return { fill: itemCount > 0 ? '#ffc078' : '#ced4da', stroke: '#495057', width: 1 };
}

function EntityShape({
  type, entity, selected, hasIssue, itemCount,
  interactive, draggable, onSelect, onMoveEnd,
}) {
  const points = useMemo(() => toPx(entity.polygon), [entity.polygon]);
  const box = useMemo(() => bounds(entity.polygon), [entity.polygon]);
  const base = look(type, entity, itemCount);

  // An issue (red) outranks selection (blue) so problems are never hidden.
  const stroke = hasIssue ? ISSUE : selected ? SELECTED : base.stroke;
  const strokeWidth = selected ? 3 : hasIssue ? 2.5 : base.width;

  const handleSelect = (e) => {
    e.cancelBubble = true; // don't let the Stage treat this as a click on empty space
    onSelect(type, entity.id);
  };

  const handleDragEnd = (e) => {
    e.cancelBubble = true;
    const node = e.target;                     // the Group
    const { dx, dy } = dragDeltaToUnits(node);
    node.position({ x: 0, y: 0 });             // the reducer now owns the position
    onMoveEnd(type, entity.id, dx, dy);
  };

  return (
    <Group
      listening={interactive}
      draggable={draggable}
      onClick={handleSelect}
      onTap={handleSelect}
      onDragStart={handleSelect}
      onDragEnd={handleDragEnd}
    >
      <Line
        points={points}
        closed
        fill={base.fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeScaleEnabled={false}   // constant line width at any zoom
        lineJoin="round"
        perfectDrawEnabled={false}
      />
      {type === 'aisle' && (
        <Text
          x={box.minX * PX} y={box.minY * PX}
          width={box.width * PX} height={box.height * PX}
          text={String(entity.aisleNumber ?? '')}
          align="center" verticalAlign="middle"
          fontSize={16} fontStyle="bold" fill="#212529"
          listening={false}
        />
      )}
      {type === 'section' && (
        <Text
          x={box.minX * PX + 6} y={box.minY * PX + 4}
          text={entity.name ?? ''}
          fontSize={14} fontStyle="bold" fill="#343a40"
          listening={false}
        />
      )}
    </Group>
  );
}

export default memo(EntityShape);