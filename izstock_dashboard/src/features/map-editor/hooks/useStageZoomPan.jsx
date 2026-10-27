import { useCallback, useRef, useState } from 'react';
import { DEFAULT_PX_PER_UNIT as PX, MIN_ZOOM, MAX_ZOOM, zoomAtPointer } from '../utils/coords';

const MARGIN = 48;      // px of breathing room around fitted content
const MAX_FIT_ZOOM = 2; // don't blow a tiny map up to fill the screen
const MIN_FOCUS_ZOOM = .8;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function useStageZoomPan() {
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  const apply = useCallback(({ scale: s, position }) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.scale({ x: s, y: s });
    stage.position(position);
    setScale(s);
  }, []);

  // Wheel: zoom around the cursor
  const onWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const view = zoomAtPointer(stage, e.evt.deltaY < 0 ? 1.1 : 1 / 1.1);
    if (view) apply(view);
  }, [apply]);

  // Buttons: zoom around the canvas center
  const zoomBy = useCallback((factor) => {
    const stage = stageRef.current;
    if (!stage) return;
    const center = { x: stage.width() / 2, y: stage.height() / 2 };
    const view = zoomAtPointer(stage, factor, undefined, center);
    if (view) apply(view);
  }, [apply]);

  // box: { minX, minY, maxX, maxY } in store units, or null for an empty map
  const fit = useCallback((box, size) => {
    if (!box) {
      apply({ scale: 1, position: { x: MARGIN, y: MARGIN } });
      return;
    }
    const bw = Math.max((box.maxX - box.minX) * PX, 1);
    const bh = Math.max((box.maxY - box.minY) * PX, 1);
    const s = clamp(
      Math.min((size.width - 2 * MARGIN) / bw, (size.height - 2 * MARGIN) / bh),
      MIN_ZOOM,
      MAX_FIT_ZOOM
    );
    apply({
      scale: s,
      position: {
        x: (size.width - bw * s) / 2 - box.minX * PX * s,
        y: (size.height - bh * s) / 2 - box.minY * PX * s,
      },
    });
  }, [apply]);

  const focusOn = useCallback((box, size, padding=3) => {
    const stage = stageRef.current;
    if(!stage || !box || size.width === 0 || size.height === 0) return;

    const bw = Math.max((box.maxX - box.minX + 2 * padding) * PX, 1);
    const bh = Math.max((box.maxY - box.minY + 2 * padding) * PX, 1);
    const fitScale = Math.min(size.width / bw, size.height / bh);
    const s = clamp(Math.min(Math.max(stage.scaleX(), MIN_FOCUS_ZOOM), fitScale), MIN_ZOOM, MAX_ZOOM);

    const cx = ((box.minX + box.maxX) / 2) * PX;
    const cy = ((box.minY + box.maxY) / 2) * PX;
    apply({
      scale: s,
      position: { x: size.width / 2 - cx * s, y: size.height / 2 - cy * s },
    }); 
  }, [apply]);

  return { stageRef, scale, onWheel, zoomBy, fit, focusOn };
}