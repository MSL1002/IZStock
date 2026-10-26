import { memo } from 'react';
import { Layer, Rect, Shape } from 'react-konva';
import { DEFAULT_PX_PER_UNIT as PX } from '../utils/coords';

function drawLines(ctx, widthUnits, heightUnits, every) {
  ctx.beginPath();
  for (let x = 0; x <= widthUnits; x += every) {
    ctx.moveTo(x * PX, 0);
    ctx.lineTo(x * PX, heightUnits * PX);
  }
  for (let y = 0; y <= heightUnits; y += every) {
    ctx.moveTo(0, y * PX);
    ctx.lineTo(widthUnits * PX, y * PX);
  }
}

function GridLayer({ widthUnits, heightUnits, scale }) {
  // Zoomed far out, 1-unit lines turn into a gray smear, so thin the grid out.
  const step = scale < 0.5 ? 5 : 1;

  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={widthUnits * PX} height={heightUnits * PX} fill="#ffffff" />
      <Shape
        stroke="#eceff1"
        strokeWidth={1}
        strokeScaleEnabled={false}
        sceneFunc={(ctx, shape) => {
          drawLines(ctx, widthUnits, heightUnits, step);
          ctx.fillStrokeShape(shape);
        }}
      />
      <Shape
        stroke="#cfd8dc"
        strokeWidth={1}
        strokeScaleEnabled={false}
        sceneFunc={(ctx, shape) => {
          drawLines(ctx, widthUnits, heightUnits, step * 5);
          ctx.fillStrokeShape(shape);
        }}
      />
      {/* store border / origin */}
      <Rect
        x={0} y={0} width={widthUnits * PX} height={heightUnits * PX}
        stroke="#90a4ae" strokeWidth={2} strokeScaleEnabled={false}
      />
    </Layer>
  );
}

export default memo(GridLayer);