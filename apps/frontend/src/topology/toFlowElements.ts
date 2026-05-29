import type { Edge } from '@xyflow/react'
import type { GraphEdge } from '@azmap/shared'
import { RelationshipType } from '@azmap/shared'

export type EdgeMeta = {
  stroke:          string
  strokeDasharray?: string
  label:           string
}

export const EDGE_META: Record<RelationshipType, EdgeMeta> = {
  [RelationshipType.Contains]:    { stroke: 'transparent',           label: 'Contains'      },
  [RelationshipType.AttachedTo]:  { stroke: '#3b82f6',               label: 'Attached To'   },
  [RelationshipType.ConnectedTo]: { stroke: '#10b981',               label: 'Connected To'  },
  [RelationshipType.SecuredBy]:   { stroke: '#ef4444',               label: 'Secured By'    },
  [RelationshipType.RoutesTo]:    { stroke: '#f59e0b', strokeDasharray: '5 5', label: 'Routes To'     },
  [RelationshipType.PeeredWith]:  { stroke: '#06b6d4', strokeDasharray: '6 3', label: 'Peered With'   },
  [RelationshipType.DependsOn]:   { stroke: '#6b7280', strokeDasharray: '3 3', label: 'Depends On'    },
  [RelationshipType.FailsOverTo]: { stroke: '#e879f9', strokeDasharray: '6 3', label: 'Fails Over To' },
}

export function toFlowEdges(graphEdges: GraphEdge[]): Edge[] {
  // ── Non-peering edges ─────────────────────────────────────────────────────
  const nonPeering: Edge[] = graphEdges
    .filter(e => e.relationshipType !== RelationshipType.Contains
              && e.relationshipType !== RelationshipType.PeeredWith)
    .map(e => ({
      id:         e.id,
      source:     e.source,
      target:     e.target,
      type:       'relationshipEdge',
      label:      EDGE_META[e.relationshipType].label,
      labelStyle: { fill: '#9ca3af', fontSize: 10 },
      style:      { stroke: EDGE_META[e.relationshipType].stroke, strokeDasharray: EDGE_META[e.relationshipType].strokeDasharray },
      animated:   e.relationshipType === RelationshipType.ConnectedTo,
    }))

  // ── Peering edges: canonicalise (smaller id = source), deduplicate, sort ──
  // Canonical direction ensures a stable handle name on each VNet regardless
  // of which Azure-side of the peering this graph edge came from.
  const peerMap = new Map<string, GraphEdge>()
  for (const e of graphEdges) {
    if (e.relationshipType !== RelationshipType.PeeredWith) continue
    const [src, tgt] = e.source < e.target ? [e.source, e.target] : [e.target, e.source]
    const key = `${src}|${tgt}`
    if (!peerMap.has(key)) peerMap.set(key, { ...e, source: src, target: tgt })
  }

  const peeringEdges = [...peerMap.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target),
  )

  const peerMeta = EDGE_META[RelationshipType.PeeredWith]
  const peering: Edge[] = peeringEdges.map((e, laneIndex) => ({
    id:             e.id,
    source:         e.source,
    target:         e.target,
    type:           'peeringEdge',
    // Each VNet has one handle per peer; naming is peer-src-{peerId} on the
    // source side and peer-tgt-{peerId} on the target side so they never clash.
    sourceHandle:   `peer-src-${e.target}`,
    targetHandle:   `peer-tgt-${e.source}`,
    data:           { laneIndex },
    label:          (e.metadata?.peeringName as string | undefined) ?? peerMeta.label,
    labelStyle:     { fill: '#6b7280', fontSize: 10 },
    labelBgStyle:   { fill: '#111827', fillOpacity: 0.85 },
    style:          { stroke: peerMeta.stroke, strokeDasharray: peerMeta.strokeDasharray },
    animated:       false,
  }))

  return [...nonPeering, ...peering]
}
