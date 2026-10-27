import { useRef } from 'react';
import { Circle, Layer, Line } from 'react-konva';
import { toPx } from '../utils/coords';
import { useDrawTool } from '../hooks/useDrawTools';

const BLUE = '#0d6efd';
const RED = '#dc3545';
const GREEN = '#198754';

export default function DraftLayer({ stageRef, scale, onNotice }) {
    const layerRef = useRef(null);
    const { draft } = useDrawTool({ layerRef, onNotice })
    const r = (px) => px / scale; // markers keep the same on-screen size at any zoom

    return (
        <Layer ref={layerRef} listening={false}>
            {draft?.kind === 'rect' && (
                <Line
                    points={toPx(draft.polygon)}
                    closed
                    fill={draft.ok ? 'rgba(13, 110, 253, 0.15)' : 'rgba(220, 53, 69, 0.2)'}
                    stroke={draft.ok ? BLUE : RED}
                    strokeWidth={2}
                    strokeScaleEnabled={false}
                    dash={[6, 4]}
                />
            )}

            {draft?.kind === 'poly' && (
                <>
                    <Line
                        points={toPx(draft.cursor ? [...draft.points, draft.cursor] : draft.points)}
                        stroke={BLUE} strokeWidth={2} strokeScaleEnabled={false} dash={[6, 4]} lineJoin="round"
                    />
                    {draft.points.length >= 2 && draft.cursor && (
                        // faint line showing where the shape would close
                        <Line
                            points={toPx([draft.cursor, draft.points[0]])}
                            stroke={BLUE} opacity={0.35} strokeWidth={1} strokeScaleEnabled={false} dash={[4, 4]}
                        />
                    )}
                    {draft.points.map(([x, y], i) => (
                        <Circle
                            key={i}
                            x={toPx([[x, y]])[0]} y={toPx([[x, y]])[1]}
                            radius={i === 0 ? r(draft.closing ? 8 : 6) : r(3.5)}
                            fill={i === 0 && draft.closing ? GREEN : '#fff'}
                            stroke={i === 0 && draft.closing ? GREEN : BLUE}
                            strokeWidth={2}
                            strokeScaleEnabled={false}
                        />
                    ))}
                </>
            )}
        </Layer>
    );
}