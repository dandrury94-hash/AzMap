import { EdgeLabelRenderer } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface MgBusEdgeData {
  forkY:   number    // absolute canvas y of the horizontal bus segment
  subCxs:  number[]  // absolute canvas x-centres of every target in this group
}

/**
 * MgBusEdge — shared-trunk bus renderer for MG hierarchy connectors.
 *
 * Instead of drawing N overlapping BusEdge paths (one per child) from the
 * same source at the same forkY, this component draws the complete bus in a
 * single pass:
 *
 *   MG source handle
 *        │  trunk (drawn once)
 *   ─────┴────────────────  bus (min cx → max cx)
 *        │        │    │    tines (one per target)
 *       sub1     sub2  sub3
 *
 * React Flow's canonical source → target pair is used only for bookkeeping
 * (hit-testing, selection). The actual rendered geometry is driven entirely
 * by sourceX/sourceY/targetY + data.forkY + data.subCxs.
 *
 * All targets in a group share the same targetY (they are in the same MG
 * depth row or all root-level swimlanes), so the canonical targetY is
 * correct for every tine.
 */
export function MgBusEdge({
  id,
  sourceX,
  sourceY,
  targetY,
  data,
  style,
  label,
  labelStyle,
}: EdgeProps) {
  const { forkY, subCxs } = (data ?? {}) as Partial<MgBusEdgeData>
  if (!subCxs || subCxs.length === 0) return null

  const stroke        = (style?.stroke      as string | undefined) ?? '#4f46e5'
  const strokeWidth   = (style?.strokeWidth as number | undefined) ?? 1
  // CSSProperties does not type strokeDasharray, access via index
  const dashArray     = (style as Record<string, unknown> | undefined)?.strokeDasharray as string | undefined

  const busLeft  = Math.min(sourceX, ...subCxs)
  const busRight = Math.max(sourceX, ...subCxs)

  // Solid filled arrowhead at each tine tip (avoids SVG <marker>/<defs>).
  const AW = 4  // arrowhead half-width
  const AH = 7  // arrowhead height

  return (
    <>
      {/* Trunk: MG bottom → bus level */}
      <line
        x1={sourceX} y1={sourceY}
        x2={sourceX} y2={forkY}
        stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray}
      />

      {/* Horizontal bus spanning all targets */}
      <line
        x1={busLeft} y1={forkY}
        x2={busRight} y2={forkY}
        stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray}
      />

      {/* Tines — one per target, with inline arrowhead */}
      {subCxs.map((cx, i) => (
        <g key={i}>
          <line
            x1={cx} y1={forkY}
            x2={cx} y2={targetY - AH}
            stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={dashArray}
          />
          <polygon
            points={`${cx - AW},${targetY - AH} ${cx + AW},${targetY - AH} ${cx},${targetY}`}
            fill={stroke}
          />
        </g>
      ))}

      {/* "Child of" label — positioned on the trunk */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nopan"
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${sourceX + 14}px,${(sourceY + forkY) / 2}px)`,
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
