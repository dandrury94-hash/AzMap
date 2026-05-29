import type { Edge, Node } from '@xyflow/react'
import type { MgTreeNode } from './mgTree'

// ── Constants ────────────────────────────────────────────────────────────────
const MG_W      = 152  // card width
const MG_H      = 30   // card height
const V_GAP     = 52   // vertical gap between MG rows
const PAD_BELOW = 56   // clearance between last MG row and first subscription swimlane

// ── Public API ────────────────────────────────────────────────────────────────
// subCentres: map from subscription node id → x-centre in the (unshifted) subscription
// layout. Only visible (rendered) subscriptions should be present — the map implicitly
// encodes which subscriptions are currently on the canvas.
// MG nodes with no visible subscription descendants anywhere in their subtree are
// omitted from the canvas (they have no meaningful position to derive).
export function buildMgCanvasLayout(
  roots:           MgTreeNode[],
  deselectedMgIds: string[],
  subCentres:      Map<string, number>,
): { nodes: Node[]; edges: Edge[]; sectionHeight: number } {
  const deselected = new Set(deselectedMgIds)
  const outNodes: Node[] = []
  const outEdges: Edge[] = []

  // ── 1. BFS: assign a depth level to every visible MG ─────────────────────
  const depthMap = new Map<string, number>()
  const queue: [MgTreeNode, number][] = []
  for (const root of roots) {
    if (!deselected.has(root.id)) queue.push([root, 0])
  }
  while (queue.length > 0) {
    const [node, d] = queue.shift()!
    depthMap.set(node.id, d)
    for (const child of node.childMgs) {
      if (!deselected.has(child.id)) queue.push([child, d + 1])
    }
  }
  const maxDepth    = depthMap.size > 0 ? Math.max(...depthMap.values()) : 0
  const rowY        = (d: number) => d * (MG_H + V_GAP)
  const sectionHeight = rowY(maxDepth) + MG_H + PAD_BELOW

  // All MG→Sub edges share the same fork y: the midpoint of the PAD_BELOW gap.
  // This keeps sub connectors at a consistent level regardless of source MG depth.
  const subForkY = sectionHeight - PAD_BELOW / 2

  // ── 2. Collect all visible sub x-centres for an MG's subtree ─────────────
  function subtreeSubCentres(node: MgTreeNode): number[] {
    if (deselected.has(node.id)) return []
    const out: number[] = []
    for (const sub of node.subs) {
      const cx = subCentres.get(sub.id)
      if (cx !== undefined) out.push(cx)
    }
    for (const child of node.childMgs) {
      for (const cx of subtreeSubCentres(child)) out.push(cx)
    }
    return out
  }

  // ── 3. Compute each MG's x-centre: midpoint of its leftmost/rightmost sub ─
  // Returns null (and omits from mgCxMap) for orphaned MGs (no visible subs).
  const mgCxMap = new Map<string, number>()

  function computeCx(node: MgTreeNode): void {
    if (deselected.has(node.id)) return
    const centres = subtreeSubCentres(node)
    if (centres.length === 0) return   // orphan — no position derivable
    mgCxMap.set(node.id, (Math.min(...centres) + Math.max(...centres)) / 2)
    for (const child of node.childMgs) computeCx(child)
  }
  for (const root of roots) {
    if (!deselected.has(root.id)) computeCx(root)
  }

  // ── 4. Emit nodes and edges (depth-first) ─────────────────────────────────
  function emit(node: MgTreeNode): void {
    if (deselected.has(node.id)) return
    const cx = mgCxMap.get(node.id)
    if (cx === undefined) return   // orphaned

    const d       = depthMap.get(node.id)!
    const y       = rowY(d)
    // Fork y for MG→childMG edges sits between this row's bottom and the next row's top.
    const mgForkY = y + MG_H + V_GAP / 2

    outNodes.push({
      id:         node.id,
      type:       'azureMgNode',
      position:   { x: cx - MG_W / 2, y },
      data:       { label: node.name },
      width:      MG_W,
      height:     MG_H,
      draggable:  false,
      selectable: false,
    })

    // ── Child MG edges ───────────────────────────────────────────────────────
    // Emit ONE mgBusEdge covering all visible child MGs so the trunk (source →
    // forkY) is drawn only once rather than N overlapping times.
    const visibleChildren = node.childMgs.filter(
      c => !deselected.has(c.id) && mgCxMap.has(c.id),
    )
    if (visibleChildren.length > 0) {
      outEdges.push({
        id:     `mg-mgs-${node.id}`,
        source: node.id,
        target: visibleChildren[0].id,
        type:   'mgBusEdge',
        data:   { forkY: mgForkY, subCxs: visibleChildren.map(c => mgCxMap.get(c.id)!) },
        style:  { stroke: '#4f46e5', strokeWidth: 1.5 },
      })
    }
    for (const child of node.childMgs) {
      if (!deselected.has(child.id) && mgCxMap.has(child.id)) emit(child)
    }

    // ── MG → Subscription "Child of" edges ───────────────────────────────────
    // Same pattern: one mgBusEdge per MG covers all its subscriptions.
    const visibleSubs = node.subs.filter(sub => subCentres.has(sub.id))
    if (visibleSubs.length > 0) {
      outEdges.push({
        id:         `mg-subs-${node.id}`,
        source:     node.id,
        target:     visibleSubs[0].id,
        type:       'mgBusEdge',
        data:       { forkY: subForkY, subCxs: visibleSubs.map(sub => subCentres.get(sub.id)!) },
        label:      'Child of',
        labelStyle: { fontSize: 9, fill: '#6b7280', fontFamily: 'inherit' },
        style:      { stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '5 3' },
      })
    }
  }

  for (const root of roots) emit(root)

  return { nodes: outNodes, edges: outEdges, sectionHeight }
}
