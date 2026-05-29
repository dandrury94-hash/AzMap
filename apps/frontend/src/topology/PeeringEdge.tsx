import { EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

const R = 6  // corner rounding radius

interface PeeringEdgeData {
  busY?:     number   // absolute canvas Y for this lane, computed by Topology.tsx
  laneIndex?: number  // kept for reference; Topology derives busY from it
}

export function PeeringEdge({
  id, sourceX, sourceY, targetX, targetY, data, style, markerEnd, label, labelStyle,
}: EdgeProps) {
  // busY is the absolute canvas Y of this lane's horizontal bus segment.
  // It is always above the swimlane section so it never intersects card headers.
  const { busY = sourceY - 30 } = (data ?? {}) as PeeringEdgeData
  const dx = targetX - sourceX

  let d: string
  let labelX: number
  const labelY = busY

  if (Math.abs(dx) < 1) {
    // Degenerate: handles share the same X (shouldn't happen with per-peer handles).
    d      = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`
    labelX = sourceX
  } else {
    const sign = dx > 0 ? 1 : -1
    // Clamp corner radius so it never exceeds half the tine height or half the span.
    const r1 = Math.min(R, Math.abs(sourceY - busY) / 2, Math.abs(dx) / 2)
    const r2 = Math.min(R, Math.abs(targetY - busY) / 2, Math.abs(dx) / 2)

    d = [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${busY + r1}`,
      `Q ${sourceX} ${busY} ${sourceX + sign * r1} ${busY}`,
      `L ${targetX - sign * r2} ${busY}`,
      `Q ${targetX} ${busY} ${targetX} ${busY + r2}`,
      `L ${targetX} ${targetY}`,
    ].join(' ')

    labelX = (sourceX + targetX) / 2
  }

  return (
    <>
      <path id={id} d={d} fill="none" style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nopan"
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
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
