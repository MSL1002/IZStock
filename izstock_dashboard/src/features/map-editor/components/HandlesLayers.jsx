// features/map-editor/components/HandlesLayer.jsx
import { useEffect, useRef, useState } from 'react';
import { Circle, Layer, Line, Rect, Transformer } from 'react-konva';
import {
  DEFAULT_PX_PER_UNIT as PX, DEFAULT_SNAP, pointToPx, pointerToStore, toUnits,
  rectNodeToPolygon, snapPoint, toPx,
} from '../utils/coords';
import { bounds, distToSegment, isAxisAlignedRect } from '../utils/geometry';

const BLUE = '#0d6efd';
const PREVIEW_FILL = 'rgba(13, 110, 253, 0.1)';
const MIN_VERTICES = 3;

const setCursor = (e, value) => { e.target.getStage().container().style.cursor = value; };

export default function HandlesLayer({ type, entity, enabled, scale, onPolygon }) {
    const useRectHandles =
        enabled && entity && type !== 'section' && isAxisAlignedRect(entity.polygon);
    const useVertexHandles = enabled && entity && !useRectHandles;

    // key = entity id, so handle state never leaks from one selection to the next
    return (
        <Layer>
            {useRectHandles && (
                <RectHandles key={entity.id} type={type} entity={entity} onPolygon={onPolygon} />
            )}
            {useVertexHandles && (
                <VertexHandles key={entity.id} type={type} entity={entity} scale={scale} onPolygon={onPolygon} />
            )}
        </Layer>
    );
}

/* ---------- aisles and shelves: resize with a Transformer ---------- */

function RectHandles({ type, entity, onPolygon }) {
    const rectRef = useRef(null);
    const trRef = useRef(null);
    const box = bounds(entity.polygon);

    useEffect(() => {
        trRef.current.nodes([rectRef.current]);
        trRef.current.getLayer().batchDraw();
    }, []);

    const handleEnd = () => {
        const node = rectRef.current;
        const polygon = rectNodeToPolygon(node);
        // Put the proxy back at the entity's current geometry. If the polygon changed,
        // React moves it again on the next render; if not, it must not stay scaled.
        node.setAttrs({
            x: box.minX * PX, y: box.minY * PX,
            width: box.width * PX, height: box.height * PX,
            scaleX: 1, scaleY: 1,
        });
        if (polygon) onPolygon(type, entity.id, polygon); // null = collapsed to nothing: ignore
    };

    return (
        <>
            {/* Invisible stand-in the Transformer holds on to. Not listening, so clicks and
          drags still reach the real shape underneath. The faint fill doubles as the
          live resize preview. */}
            <Rect
                ref={rectRef}
                x={box.minX * PX} y={box.minY * PX}
                width={box.width * PX} height={box.height * PX}
                fill={PREVIEW_FILL} stroke={BLUE} strokeWidth={1} dash={[4, 3]} strokeScaleEnabled={false}
                listening={false}
                onTransformEnd={handleEnd}
            />
            <Transformer
                ref={trRef}
                rotateEnabled={false}
                flipEnabled={false}
                keepRatio={false}
                ignoreStroke
                anchorSize={9}
                anchorCornerRadius={2}
                anchorStroke={BLUE}
                anchorFill="#ffffff"
                borderStroke={BLUE}
                boundBoxFunc={(oldBox, newBox) =>
                    Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox
                }
            />
        </>
    );
}

/* ---------- sections and irregular shapes: drag corners ---------- */

function VertexHandles({ type, entity, scale, onPolygon }) {
    const [preview, setPreview] = useState(null); // polygon in store units while a corner is dragged
    const [edgeDrag, setEdgeDrag] = useState(null); // { i, stage } while pulling a corner out of edge i
    const poly = entity.polygon;
    const px = (n) => n / scale; // handles keep the same on-screen size at any zoom

    const withInserted = (i, p) => [...poly.slice(0, i + 1), p, ...poly.slice(i + 1)];

    useEffect(() => {
    if (!edgeDrag) return undefined;
    const { i, stage } = edgeDrag;
    let last = null;

    const onMove = () => {
        const p = pointerToStore(stage); // snapped, clamped to >= 0
        if (!p) return;
        last = p;
        setPreview(withInserted(i, p));
    };

    const onUp = () => {
        // This release must not count as a click on empty canvas (it would deselect)
        stage.setAttr('skipClickUntil', Date.now() + 100);
        setPreview(null);
        setEdgeDrag(null);
        if (!last) return;
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const onNeighbor = [a, b].some((q) => q[0] === last[0] && q[1] === last[1]);
        if (!onNeighbor && distToSegment(last, a, b) >= DEFAULT_SNAP / 2) {
            commit(withInserted(i, last));
        }
    };

    stage.on('mousemove.edge touchmove.edge', onMove);
    window.addEventListener('mouseup', onUp, true);
    window.addEventListener('touchend', onUp, true);
    return () => {
    stage.off('.edge');
    window.removeEventListener('mouseup', onUp, true);
    window.removeEventListener('touchend', onUp, true);
    };
    // poly and commit can't change mid-drag, so the effect only restarts per drag
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [edgeDrag]);

    // Snap the node to the grid (and to >= 0) as it moves, then return its store position
    const snapNode = (node) => {
        const p = snapPoint(toUnits([node.x(), node.y()]));
        node.position({ x: p[0] * PX, y: p[1] * PX });
        return p;
    };
    const withPoint = (i, p) => poly.map((q, k) => (k === i ? p : q));
    const commit = (next) => onPolygon(type, entity.id, next);

    const insertAfter = (i) => {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const mid = [Math.round((a[0] + b[0]) / 2), Math.round((a[1] + b[1]) / 2)];
        const next = [...poly];
        next.splice(i + 1, 0, mid);
        commit(next);
    };

    const removeAt = (i) => {
        if (poly.length > MIN_VERTICES) commit(poly.filter((_, k) => k !== i));
    };

    return (
        <>
            {preview && (
                <Line
                    points={toPx(preview)} closed
                    fill={PREVIEW_FILL} stroke={BLUE} strokeWidth={2} dash={[6, 4]} strokeScaleEnabled={false}
                    listening={false}
                />
            )}

            {/* every side is draggable: press anywhere on it and pull out a new corner */}
            {poly.map((a, i) => {
                const b = poly[(i + 1) % poly.length];
                const start = (e) => {
                    e.cancelBubble = true; // stops the Stage from panning instead
                    setEdgeDrag({ i, stage: e.target.getStage() });
                };
                return (
                    <Line
                    key={`e${i}`}
                    points={toPx([a, b])}
                    stroke="rgba(0, 0, 0, 0)" strokeWidth={1}
                    hitStrokeWidth={14}          // generous grab area, in screen px
                    strokeScaleEnabled={false}
                    onMouseDown={start} onTouchStart={start}
                    onMouseEnter={(e) => setCursor(e, 'crosshair')}
                    onMouseLeave={(e) => setCursor(e, '')}
                    />
                );
            })}

            {/* corners: drag to move, double-click to remove */}
            {poly.map((p, i) => {
                const [x, y] = pointToPx(p);
                return (
                    <Circle
                        key={`v${i}`} x={x} y={y} radius={px(6)}
                        fill="#ffffff" stroke={BLUE} strokeWidth={2} strokeScaleEnabled={false}
                        draggable
                        onDragMove={(e) => setPreview(withPoint(i, snapNode(e.target)))}
                        onDragEnd={(e) => {
                            const point = snapNode(e.target);
                            setPreview(null);
                            commit(withPoint(i, point));
                        }}
                        onDblClick={() => removeAt(i)} onDblTap={() => removeAt(i)}
                        onMouseEnter={(e) => setCursor(e, 'move')} onMouseLeave={(e) => setCursor(e, '')}
                    />
                );
            })}
        </>
    );
}