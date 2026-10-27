import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapEditor } from '../MapEditorProvider';
import { pointerToStore, rectToPolygon, DEFAULT_PX_PER_UNIT as PX } from '../utils/coords';
import { checkRect, checkSection } from '../utils/drawRules';
import { makeAisle, makeSection, makeShelf } from '../utils/newEntity';

const CLOSE_PX = 12; // click this close (in screen px) to the first corner to finish a section
const same = (a, b) => Boolean(a && b && a[0] === b[0] && a[1] === b[1]);
const isTyping = (el) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName);

// draft is one of:
//   { kind: 'rect', polygon, ok }
//   { kind: 'poly', points, cursor, closing }
export function useDrawTool({ layerRef, onNotice }) {
  const { state, actions, readOnly } = useMapEditor();
  const { tool, map } = state;
  const [draft, setDraft] = useState(null);

  // Handlers are registered once, so they read the latest values from here
  const live = useRef({});
  live.current = { tool, map, readOnly, actions, onNotice };

  const startRef = useRef(null);   // rectangle drag start
  const endRef = useRef(null);     // last snapped pointer while dragging
  const pointsRef = useRef([]);    // section corners placed so far
  const cursorRef = useRef(null);

  const reset = useCallback(() => {
    startRef.current = null;
    endRef.current = null;
    pointsRef.current = [];
    cursorRef.current = null;
    setDraft(null);
  }, []);

  // Switching tools (or Esc, which switches to Select) abandons any draft
  useEffect(() => { reset(); }, [tool, readOnly, reset]);

  useEffect(() => {
    const stage = layerRef.current?.getStage();
    if(!stage) return undefined;

    const drawing = () => live.current.tool !== 'select' && !live.current.readOnly;

    /* ----- section polygon helpers ----- */

    const nearFirst = (p) => {
      const first = pointsRef.current[0];
      const radius = Math.max(CLOSE_PX / (PX * stage.scaleX()), 0.01);
      return Math.hypot(p[0] - first[0], p[1] - first[1]) < radius;
    };

    const showPoly = () => {
      const points = pointsRef.current;
      const cursor = cursorRef.current;
      setDraft({
        kind: 'poly', points, cursor,
        closing: Boolean(points.length >= 3 && cursor && nearFirst(cursor)),
      });
    };

    const closeSection = () => {
      const points = pointsRef.current;
      const { map: m, actions: a, onNotice: notify } = live.current;
      if (points.length < 3) { notify?.('A section needs at least 3 corners.'); return; }
      const error = checkSection(points, m);
      if (error) { notify?.(error); return; } // keep the draft so Backspace can fix it
      a.addEntity('section', makeSection(points, m));
      reset();
    };

    /* ----- rectangle helpers ----- */

    const finishRect = () => {
      const start = startRef.current;
      if (!start) return; // already finished (stage and window both report mouse-up)
      const end = endRef.current ?? start;
      startRef.current = null;
      endRef.current = null;
      setDraft(null);

      const { tool: t, map: m, actions: a, onNotice: notify } = live.current;
      const polygon = rectToPolygon(start, end);
      if (!polygon) return; // too small: that was a click, not a drag
      const { parentId, error } = checkRect(t, polygon, m);
      if (error) { notify?.(error); return; }
      a.addEntity(t, t === 'aisle' ? makeAisle(polygon, parentId, m) : makeShelf(polygon, parentId, m));
    };

    /* ----- Konva events ----- */

    const onDown = (e) => {
      if (!drawing() || e.evt.button > 0 || live.current.tool === 'section') return;
      const p = pointerToStore(stage);
      if (!p) return;
      startRef.current = p;
      endRef.current = p;
    };

    const onMove = () => {
      if (!drawing()) return;
      const p = pointerToStore(stage);
      if (!p) return;

      if (startRef.current) {
        if (same(p, endRef.current)) return; // grid-snapped, so this skips most moves
        endRef.current = p;
        const polygon = rectToPolygon(startRef.current, p);
        if (!polygon) { setDraft(null); return; }
        const { tool: t, map: m } = live.current;
        setDraft({ kind: 'rect', polygon, ok: !checkRect(t, polygon, m).error });
      } else if (live.current.tool === 'section' && pointsRef.current.length) {
        if (same(p, cursorRef.current)) return;
        cursorRef.current = p;
        showPoly();
      }
    };

    const onClick = (e) => {
      if (!drawing() || live.current.tool !== 'section' || e.evt.button > 0) return;
      const p = pointerToStore(stage);
      if (!p) return;
      const points = pointsRef.current;
      if (points.length >= 3 && nearFirst(p)) { closeSection(); return; }
      if (same(p, points[points.length - 1])) return; // second click of a double-click
      pointsRef.current = [...points, p];
      cursorRef.current = p;
      showPoly();
    };

    const onDblClick = () => {
      if (drawing() && live.current.tool === 'section' && pointsRef.current.length >= 3) closeSection();
    };

    // Release can happen outside the canvas, so listen on the window too (finishRect is idempotent)
    const onUp = () => {
      if (!startRef.current) return;
      const p = pointerToStore(stage); // null after a touch ends; the last move position is kept
      if (p) endRef.current = p;
      finishRect();
    };

    const onKey = (e) => {
      if (live.current.tool !== 'section' || !pointsRef.current.length) return;
      if (isTyping(e.target) || document.querySelector('.modal.show')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        closeSection();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pointsRef.current = pointsRef.current.slice(0, -1);
        if (pointsRef.current.length) showPoly(); else reset();
      }
    };

    stage.on('mousedown.draw touchstart.draw', onDown);
    stage.on('mousemove.draw touchmove.draw', onMove);
    stage.on('click.draw tap.draw', onClick);
    stage.on('dblclick.draw dbltap.draw', onDblClick);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchend', onUp);
    window.addEventListener('keydown', onKey);

    return () => {
      stage.off('.draw');
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchend', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [layerRef, reset]);

  return { draft };
}