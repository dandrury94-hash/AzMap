import { EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

interface BusEdgeData {
  forkY: number
}

// Custom edge that draws an orthogonal bus-and-fork path:
//   source → vertical to forkY → horizontal to targetX → vertical to target
// This ensures every edge has a geometrically unique path so no two edges overlay.
export function BusEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  markerEnd,
  label,
  labelStyle,
}: EdgeProps) {
  const forkY = (data as BusEdgeData | undefined)?.forkY ?? (sourceY + targetY) / 2
  const r     = 5  // corner radius

  const dx = targetX - sourceX
  let d: string

  if (Math.abs(dx) < 0.5) {
    // Source and target share the same x — pure vertical line
    d = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
  } else {
    const signX = dx > 0 ? 1 : -1
    const dy1 = forkY - sourceY
    const dy2 = targetY - forkY
    // Clamp radius so it never exceeds half the available segment length
    const r1 = Math.min(r, Math.abs(dy1) / 2, Math.abs(dx) / 2)
    const r2 = Math.min(r, Math.abs(dy2) / 2, Math.abs(dx) / 2)

    d = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${forkY - r1}`,
      `Q ${sourceX} ${forkY} ${sourceX + signX * r1} ${forkY}`,
      `L ${targetX - signX * r2} ${forkY}`,
      `Q ${targetX} ${forkY} ${targetX} ${forkY + r2}`,
      `L ${targetX} ${targetY}`,
    ].join(' ')
  }

  return (
    <>
      <path id={id} d={d} fill="none" style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nopan"
            style={{
              position:  'absolute',
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${forkY}px)`,
              pointerEvents: 'all',
              ...labelStyle,
            }}
          >
            <span style={{ background: '#030712', padding: '0 3px', borderRadius: 2 }}>
              {label as string}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
