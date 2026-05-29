import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export function RelationshipEdge({
  id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  style, label, labelStyle, animated,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  // Replicate React Flow's built-in edge animation for ConnectedTo edges.
  // The @keyframes react-flow__dashdraw is defined in @xyflow/react's CSS.
  const pathStyle: React.CSSProperties = animated ? {
    strokeDasharray: '5',
    animation: 'react-flow__dashdraw 0.5s linear infinite',
  } : {}

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ ...style, ...pathStyle }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            className="nopan"
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              ...labelStyle,
            }}
          >
            <span style={{ background: '#111827', padding: '0 3px', borderRadius: 2, whiteSpace: 'nowrap' }}>
              {label as string}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
