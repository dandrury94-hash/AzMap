import { ResourceType, RelationshipType } from '@azmap/shared'
import type { GraphNode, GraphEdge } from '@azmap/shared'

export type MgTreeNode = {
  id: string
  name: string
  childMgs: MgTreeNode[]
  subs: Array<{ id: string; name: string }>
  /** True when this node or any descendant has at least one subscription. */
  hasAnySubs: boolean
}

/**
 * Derives the management group tree from the canonical graph.
 *
 * Traverses Contains edges between ManagementGroup nodes to build parent→child
 * relationships, and Contains edges from ManagementGroups to Subscriptions to
 * build the subscription leaf lists. Root MGs are those with no MG parent.
 *
 * This is the single source of truth for MG hierarchy derivation — both the
 * sidebar and TenancyTopology page import from here rather than each computing
 * their own version.
 */
export function buildMgTree(nodes: GraphNode[], edges: GraphEdge[]): MgTreeNode[] {
  const mgIds  = new Set(nodes.filter(n => n.type === ResourceType.ManagementGroup).map(n => n.id))
  const subIds = new Set(nodes.filter(n => n.type === ResourceType.Subscription).map(n => n.id))
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  const childMgsOf  = new Map<string, string[]>()
  const childSubsOf = new Map<string, string[]>()
  const mgParentOf  = new Map<string, string>()

  for (const e of edges) {
    if (e.relationshipType !== RelationshipType.Contains) continue
    if (!mgIds.has(e.source)) continue
    if (mgIds.has(e.target)) {
      if (!childMgsOf.has(e.source)) childMgsOf.set(e.source, [])
      childMgsOf.get(e.source)!.push(e.target)
      mgParentOf.set(e.target, e.source)
    } else if (subIds.has(e.target)) {
      if (!childSubsOf.has(e.source)) childSubsOf.set(e.source, [])
      childSubsOf.get(e.source)!.push(e.target)
    }
  }

  const rootMgIds = [...mgIds].filter(id => !mgParentOf.has(id))

  function buildNode(id: string): MgTreeNode {
    const n        = nodeMap.get(id)!
    const childMgs = (childMgsOf.get(id) ?? []).map(buildNode)
    const subs     = (childSubsOf.get(id) ?? []).map(sid => ({
      id:   sid,
      name: nodeMap.get(sid)?.name ?? sid,
    }))
    return {
      id,
      name: n.name,
      childMgs,
      subs,
      hasAnySubs: subs.length > 0 || childMgs.some(c => c.hasAnySubs),
    }
  }

  return rootMgIds.map(buildNode)
}
