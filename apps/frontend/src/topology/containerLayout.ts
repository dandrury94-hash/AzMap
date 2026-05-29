import type { Node } from '@xyflow/react'
import type { GraphEdge, GraphNode } from '@azmap/shared'
import { RelationshipType, ResourceType } from '@azmap/shared'

// ─── Layout constants ────────────────────────────────────────────────────────
const P               = 36   // padding inside a container
const H               = 44   // container header height (top-header containers only)
const G               = 24   // horizontal gap between siblings
const CHAIN_H_GAP     = 100  // horizontal gap between nodes in a chain (wider to fit edge labels)
const ROW_GAP         = 32   // gap between the container-kids block and the leaf-kids block
const LEAF_W          = 200  // leaf node width
const LEAF_H          = 64   // leaf node height
const LEAF_ROW_GAP    = 12   // vertical gap between rows of leaf nodes
const CONT_ROW_GAP    = G    // vertical gap between rows of container kids
const EMPTY_W         = 200  // minimum content width for an empty intrinsic container
const EMPTY_H         = 44   // minimum height for an empty intrinsic container
const ROOT_GAP        = G * 2  // gap between root-level swimlanes (arranged horizontally)
const CHAIN_GAP       = 20   // px between chain groups in a RG leaf section
const SWIMLANE_W      = 48   // left label-strip width; must match AzureSwimLane.tsx
const SWIMLANE_PAD    = P / 2  // gap between strip right-edge and first region card
const REGION_OVERHANG = 28   // px region columns protrude above and below the swimlane

// Strip geometry — must stay in sync with AzureSwimLane.tsx so the computed
// minimum swimlane height exactly fits the strip content.
const STRIP_ICON_AREA  = 36   // paddingTop(10) + icon-box(20) + gap-to-text(6)
const STRIP_PAD_BOTTOM = 8    // paddingBottom in the strip
const STRIP_CHAR_H     = 9    // font-size in px (lineHeight:1 in component)
const STRIP_TYPE_CHARS = 12   // 'Subscription'.length — the swimlane type-label width

// Grid wrapping limits.
// Swimlane children (regions) are never wrapped — their overhang maths assumes a
// single horizontal row. All other containers wrap at these column counts.
const MAX_LEAF_COLS = 4   // leaf nodes per row inside any container
const MAX_CONT_COLS = 2   // container kids per row inside non-swimlane containers

// ResourceTypes that render as a container even when empty.
const INTRINSIC_CONTAINER_TYPES = new Set<ResourceType>([
  ResourceType.ManagementGroup,
  ResourceType.Subscription,
  ResourceType.Region,
  ResourceType.ResourceGroup,
  ResourceType.VirtualNetwork,
  ResourceType.Subnet,
])

// Subscription → swimlane (vertical left label strip).
// ManagementGroup is excluded: MG nodes are handled by mgLayout.ts and never
// reach buildContainerLayout.
const SWIMLANE_TYPES = new Set<ResourceType>([
  ResourceType.Subscription,
])

// Region → transparent column with visible card border, overflows swimlane top/bottom.
const REGION_COLUMN_TYPES = new Set<ResourceType>([
  ResourceType.Region,
])

type Dims = { w: number; h: number }

export type AzureFlowNodeData = {
  label: string
  resourceType: ResourceType
  subtitle?: string
}

function makeData(n: GraphNode): AzureFlowNodeData {
  const ap = n.metadata?.['addressPrefix']
  const pi = n.metadata?.['privateIp']
  const as = n.metadata?.['addressSpace']
  return {
    label: n.name,
    resourceType: n.type,
    subtitle: typeof ap === 'string' ? ap
            : typeof pi === 'string' ? pi
            : typeof as === 'string' ? as
            : undefined,
  }
}

// Split an array into rows of at most maxCols items each.
function chunk<T>(items: T[], maxCols: number): T[][] {
  if (items.length === 0) return []
  const rows: T[][] = []
  for (let i = 0; i < items.length; i += maxCols) rows.push(items.slice(i, i + maxCols))
  return rows
}

export type LayoutConfig = {
  chainLayoutEnabled?: boolean
  maxChainDepth?:      number   // 0 = unlimited
  maxLeafCols?:        number
}

export function buildContainerLayout(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  config: LayoutConfig = {},
): Node[] {
  const resolvedChainEnabled = config.chainLayoutEnabled ?? true
  const resolvedMaxDepth     = config.maxChainDepth      ?? 0
  const resolvedMaxLeafCols  = config.maxLeafCols        ?? MAX_LEAF_COLS
  // ── 1. Build containment maps ─────────────────────────────────────────────
  const childrenOf = new Map<string, string[]>()
  const parentOf   = new Map<string, string>()

  for (const e of graphEdges) {
    if (e.relationshipType !== RelationshipType.Contains) continue
    if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
    childrenOf.get(e.source)!.push(e.target)
    parentOf.set(e.target, e.source)
  }

  const nodeMap = new Map(graphNodes.map(n => [n.id, n]))

  // Canonical region ordering: sort each subscription's region children
  // alphabetically by name so the same region always appears in the same
  // column position across every subscription swimlane.
  for (const [parentId, kids] of childrenOf) {
    const parentNode = nodeMap.get(parentId)
    if (parentNode && SWIMLANE_TYPES.has(parentNode.type)) {
      kids.sort((a, b) => (nodeMap.get(a)?.name ?? '').localeCompare(nodeMap.get(b)?.name ?? ''))
    }
  }

  // ── VNet-affinity + type-tier sort for ResourceGroup children ────────────
  // Primary  (B): group leaf nodes by which VNet they connect to most,
  //               matching the VNet's left-to-right column position.
  // Secondary (A): within each affinity group, networking resources first,
  //               then compute/app, then data/storage, then everything else.

  // Which VNets exist, and which subnets belong to each VNet?
  const vnetIds = new Set(
    graphNodes.filter(n => n.type === ResourceType.VirtualNetwork).map(n => n.id),
  )
  const subnetToVnet = new Map<string, string>()
  for (const e of graphEdges) {
    if (e.relationshipType === RelationshipType.Contains && vnetIds.has(e.source))
      subnetToVnet.set(e.target, e.source)
  }

  // Undirected neighbor map built from all non-Contains edges.
  const neighborMap = new Map<string, string[]>()
  for (const e of graphEdges) {
    if (e.relationshipType === RelationshipType.Contains) continue
    if (!neighborMap.has(e.source)) neighborMap.set(e.source, [])
    if (!neighborMap.has(e.target)) neighborMap.set(e.target, [])
    neighborMap.get(e.source)!.push(e.target)
    neighborMap.get(e.target)!.push(e.source)
  }

  // Resource type tiers — lower number = rendered closer to the VNets above.
  const TYPE_TIER: Partial<Record<ResourceType, number>> = {
    // Tier 0 — networking / security / connectivity
    [ResourceType.NetworkSecurityGroup]:     0,
    [ResourceType.ApplicationSecurityGroup]: 0,
    [ResourceType.RouteTable]:               0,
    [ResourceType.PublicIpAddress]:          0,
    [ResourceType.PublicIpPrefix]:           0,
    [ResourceType.NatGateway]:               0,
    [ResourceType.AzureFirewall]:            0,
    [ResourceType.FirewallPolicy]:           0,
    [ResourceType.LoadBalancer]:             0,
    [ResourceType.ApplicationGateway]:       0,
    [ResourceType.VpnGateway]:              0,
    [ResourceType.LocalNetworkGateway]:     0,
    [ResourceType.GatewayConnection]:       0,
    [ResourceType.ExpressRouteCircuit]:     0,
    [ResourceType.PrivateEndpoint]:         0,
    [ResourceType.BastionHost]:             0,
    [ResourceType.DnsZone]:                0,
    [ResourceType.PrivateDnsZone]:         0,
    [ResourceType.NetworkInterface]:        0,
    // Tier 1 — compute / app platform
    [ResourceType.VirtualMachine]:          1,
    [ResourceType.VirtualMachineScaleSet]:  1,
    [ResourceType.KubernetesCluster]:       1,
    [ResourceType.ContainerGroup]:          1,
    [ResourceType.ContainerRegistry]:       1,
    [ResourceType.AppService]:              1,
    [ResourceType.AppServicePlan]:          1,
    // Tier 2 — data / storage / identity
    [ResourceType.StorageAccount]:          2,
    [ResourceType.SqlServer]:               2,
    [ResourceType.SqlDatabase]:             2,
    [ResourceType.CosmosDbAccount]:         2,
    [ResourceType.PostgreSqlServer]:        2,
    [ResourceType.MySqlServer]:             2,
    [ResourceType.RedisCache]:              2,
    [ResourceType.KeyVault]:                2,
    [ResourceType.UserAssignedIdentity]:    2,
    [ResourceType.RecoveryServicesVault]:   2,
    // Tier 3 — everything else (monitoring, integration, analytics, AI, IoT)
  }

  // Returns the VNet ID this node connects to most (directly or via subnet).
  function vnetAffinityOf(nodeId: string): string | null {
    const counts = new Map<string, number>()
    for (const nbId of neighborMap.get(nodeId) ?? []) {
      const vnetId = vnetIds.has(nbId) ? nbId : (subnetToVnet.get(nbId) ?? null)
      if (vnetId) counts.set(vnetId, (counts.get(vnetId) ?? 0) + 1)
    }
    if (counts.size === 0) return null
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
  }

  for (const [parentId, kids] of childrenOf) {
    const parentNode = nodeMap.get(parentId)
    if (!parentNode || parentNode.type !== ResourceType.ResourceGroup) continue

    // Snapshot VNet column order before sorting (index = left-to-right position).
    const vnetOrder = new Map<string, number>()
    let vnetIdx = 0
    for (const kid of kids) {
      if (vnetIds.has(kid)) vnetOrder.set(kid, vnetIdx++)
    }
    const noAffinity = vnetOrder.size // sentinel: further right than any real VNet

    kids.sort((a, b) => {
      const ga = nodeMap.get(a)!
      const gb = nodeMap.get(b)!
      const aIsCont = INTRINSIC_CONTAINER_TYPES.has(ga.type) || (childrenOf.get(a)?.length ?? 0) > 0
      const bIsCont = INTRINSIC_CONTAINER_TYPES.has(gb.type) || (childrenOf.get(b)?.length ?? 0) > 0
      // Containers always precede leaves; relative container order is preserved.
      if (aIsCont !== bIsCont) return aIsCont ? -1 : 1
      if (aIsCont) return 0

      // Primary: VNet affinity column (left-to-right).
      const aVnet = vnetAffinityOf(a)
      const bVnet = vnetAffinityOf(b)
      const aCol  = aVnet !== null ? (vnetOrder.get(aVnet) ?? noAffinity) : noAffinity
      const bCol  = bVnet !== null ? (vnetOrder.get(bVnet) ?? noAffinity) : noAffinity
      if (aCol !== bCol) return aCol - bCol

      // Secondary: resource type tier.
      const aTier = TYPE_TIER[ga.type] ?? 3
      const bTier = TYPE_TIER[gb.type] ?? 3
      if (aTier !== bTier) return aTier - bTier

      // Tertiary: alphabetical.
      return ga.name.localeCompare(gb.name)
    })
  }

  // ── Chain layout precomputation for ResourceGroup leaf sections ───────────
  // Leaf nodes in an RG are arranged into connected chains (anchor on the left,
  // connected resources extending right) rather than a flat wrapping grid.
  // First child of each node is placed inline (same row = horizontal edge);
  // subsequent children stack directly below their parent — as close as possible.
  // Nodes with no leaf-to-leaf edges fall into a remainder grid at the bottom.

  const CHAIN_ANCHOR: Partial<Record<ResourceType, number>> = {
    [ResourceType.VirtualMachine]:          0,
    [ResourceType.VirtualMachineScaleSet]:  0,
    [ResourceType.KubernetesCluster]:       0,
    [ResourceType.ContainerGroup]:          0,
    [ResourceType.AppService]:              0,
    [ResourceType.AppServicePlan]:          0,
    [ResourceType.AzureFirewall]:           1,
    [ResourceType.VpnGateway]:             1,
    [ResourceType.LocalNetworkGateway]:    1,
    [ResourceType.LoadBalancer]:           1,
    [ResourceType.ApplicationGateway]:     1,
    [ResourceType.BastionHost]:            1,
    [ResourceType.NatGateway]:             1,
    [ResourceType.ExpressRouteCircuit]:    1,
    [ResourceType.NetworkInterface]:       2,
    [ResourceType.PrivateEndpoint]:        2,
    [ResourceType.GatewayConnection]:      2,
    [ResourceType.PublicIpAddress]:        3,
    [ResourceType.PublicIpPrefix]:         3,
    [ResourceType.FirewallPolicy]:         3,
    [ResourceType.NetworkSecurityGroup]:   4,
    [ResourceType.RouteTable]:             4,
  }

  type LeafChainLayout = {
    placements: Map<string, { x: number; y: number }>
    remainder:  string[]
    sectionW:   number
    sectionH:   number
  }

  const rgLeafLayouts = new Map<string, LeafChainLayout>()

  for (const [parentId, kids] of childrenOf) {
    if (!resolvedChainEnabled) break   // skip entire precomputation when chain layout is off

    const parentNode = nodeMap.get(parentId)
    if (!parentNode || parentNode.type !== ResourceType.ResourceGroup) continue

    const leafKids = kids.filter(k => {
      const gn = nodeMap.get(k)
      return gn && !INTRINSIC_CONTAINER_TYPES.has(gn.type) && (childrenOf.get(k)?.length ?? 0) === 0
    })
    if (leafKids.length === 0) continue

    const leafSet = new Set(leafKids)

    // Leaf-only adjacency.
    const leafAdj = new Map<string, string[]>()
    for (const id of leafKids) {
      leafAdj.set(id, (neighborMap.get(id) ?? []).filter(nb => leafSet.has(nb)))
    }

    // Connected components via BFS.
    const visited = new Set<string>()
    const components: string[][] = []
    for (const id of leafKids) {
      if (visited.has(id)) continue
      const comp: string[] = []
      const q = [id]; visited.add(id)
      while (q.length) {
        const cur = q.shift()!; comp.push(cur)
        for (const nb of leafAdj.get(cur) ?? []) {
          if (!visited.has(nb)) { visited.add(nb); q.push(nb) }
        }
      }
      components.push(comp)
    }

    // Nodes with no leaf-to-leaf edges → remainder grid.
    const remainder: string[] = []
    const chains: string[][] = []
    for (const comp of components) {
      if (comp.every(id => (leafAdj.get(id) ?? []).length === 0)) remainder.push(...comp)
      else chains.push(comp)
    }

    // Pick the root (leftmost anchor) of a chain: lowest CHAIN_ANCHOR priority.
    const chainRoot = (comp: string[]) => comp.reduce((best, id) => {
      const bp = CHAIN_ANCHOR[nodeMap.get(best)!.type] ?? 5
      const cp = CHAIN_ANCHOR[nodeMap.get(id)!.type]  ?? 5
      return cp < bp ? id : best
    })

    // Sort chains so compute-anchored chains appear first (topmost).
    chains.sort((a, b) => {
      const ap = CHAIN_ANCHOR[nodeMap.get(chainRoot(a))!.type] ?? 5
      const bp = CHAIN_ANCHOR[nodeMap.get(chainRoot(b))!.type] ?? 5
      return ap - bp || chainRoot(a).localeCompare(chainRoot(b))
    })

    const placements = new Map<string, { x: number; y: number }>()
    let currentY = 0
    let maxX     = 0

    for (const comp of chains) {
      const root = chainRoot(comp)

      // BFS spanning tree from root. Nodes that exceed maxChainDepth are
      // pushed to the remainder grid rather than placed in the chain.
      const treeKids      = new Map<string, string[]>()
      const depthOf       = new Map<string, number>([[root, 0]])
      const tv            = new Set([root])
      const bfsQ          = [root]
      const depthRemainder: string[] = []
      while (bfsQ.length) {
        const cur      = bfsQ.shift()!
        const curDepth = depthOf.get(cur)!
        const children: string[] = []
        for (const nb of leafAdj.get(cur) ?? []) {
          if (!tv.has(nb)) {
            tv.add(nb)
            if (resolvedMaxDepth > 0 && curDepth + 1 >= resolvedMaxDepth) {
              depthRemainder.push(nb)
            } else {
              children.push(nb)
              depthOf.set(nb, curDepth + 1)
              bfsQ.push(nb)
            }
          }
        }
        // Lower anchor priority = first child = placed inline (horizontal edge).
        children.sort((a, b) => {
          const ap = CHAIN_ANCHOR[nodeMap.get(a)!.type] ?? 5
          const bp = CHAIN_ANCHOR[nodeMap.get(b)!.type] ?? 5
          return ap - bp || nodeMap.get(a)!.name.localeCompare(nodeMap.get(b)!.name)
        })
        treeKids.set(cur, children)
      }

      // Post-order: count rows occupied by each subtree.
      const subH = new Map<string, number>()
      const countRows = (id: string): number => {
        const ks = treeKids.get(id) ?? []
        const h = ks.length === 0 ? 1 : ks.reduce((s, k) => s + countRows(k), 0)
        subH.set(id, h); return h
      }
      countRows(root)

      // Pre-order: assign pixel (x, y) relative to the leaf section origin.
      const placeNode = (id: string, col: number, startRow: number): void => {
        placements.set(id, {
          x: col * (LEAF_W + CHAIN_H_GAP),
          y: currentY + startRow * (LEAF_H + LEAF_ROW_GAP),
        })
        maxX = Math.max(maxX, col * (LEAF_W + CHAIN_H_GAP))
        let r = startRow
        for (const kid of treeKids.get(id) ?? []) {
          placeNode(kid, col + 1, r)
          r += subH.get(kid)!
        }
      }
      placeNode(root, 0, 0)

      const totalRows = subH.get(root)!
      currentY += totalRows * LEAF_H + Math.max(0, totalRows - 1) * LEAF_ROW_GAP + CHAIN_GAP
      remainder.push(...depthRemainder)
    }

    if (chains.length > 0) currentY -= CHAIN_GAP

    rgLeafLayouts.set(parentId, {
      placements,
      remainder,
      sectionW: chains.length > 0 ? maxX + LEAF_W : 0,
      sectionH: currentY,
    })
  }

  const roots   = graphNodes.map(n => n.id).filter(id => !parentOf.has(id))

  // ── 2. Uniform swimlane minimum height ────────────────────────────────────
  // All subscription cards must be the same height so the canvas looks uniform.
  // The floor is set by the longest subscription name: the strip needs
  //   STRIP_ICON_AREA + max(name.length, type_label.length) × STRIP_CHAR_H + STRIP_PAD_BOTTOM
  // pixels to display both vertical text columns without clipping.
  const minSwimLaneH = graphNodes
    .filter(n => SWIMLANE_TYPES.has(n.type))
    .reduce((max, n) => {
      const textH = Math.max(STRIP_TYPE_CHARS, n.name.length) * STRIP_CHAR_H
      return Math.max(max, STRIP_ICON_AREA + textH + STRIP_PAD_BOTTOM)
    }, 0)

  // ── 3. Classify nodes ─────────────────────────────────────────────────────
  function isContainer(id: string): boolean {
    const gn = nodeMap.get(id)!
    return INTRINSIC_CONTAINER_TYPES.has(gn.type) || (childrenOf.get(id) ?? []).length > 0
  }

  function isSwimLane(id: string):    boolean { return SWIMLANE_TYPES.has(nodeMap.get(id)!.type) }
  function isRegionColumn(id: string): boolean { return REGION_COLUMN_TYPES.has(nodeMap.get(id)!.type) }

  function lpad(id: string): number {
    return isSwimLane(id) ? SWIMLANE_W + SWIMLANE_PAD : P
  }

  // ── 3. Recursive size computation (bottom-up) ─────────────────────────────
  //
  // Swimlane height is derived from region *content* height (region dims minus
  // the overhang on each side) so the protrusion is symmetric top and bottom:
  //
  //   swimlane_h  = max(region content heights)
  //   region_h    = content_h + 2 × REGION_OVERHANG
  //   region_y    = −REGION_OVERHANG (within the swimlane)
  //
  // Regions inside a swimlane always stay in one horizontal row — wrapping them
  // would break the symmetric-overhang invariant.
  //
  // All other containers use grid layout: container kids wrap at MAX_CONT_COLS,
  // leaf kids wrap at MAX_LEAF_COLS.
  const sizeCache = new Map<string, Dims>()

  function dims(id: string): Dims {
    if (sizeCache.has(id)) return sizeCache.get(id)!

    const children = childrenOf.get(id) ?? []
    const gn       = nodeMap.get(id)!
    const lp       = lpad(id)
    const sl       = isSwimLane(id)
    const rc       = isRegionColumn(id)

    // ── Leaf node or empty intrinsic container ─────────────────────────────
    if (children.length === 0) {
      const intrinsic = INTRINSIC_CONTAINER_TYPES.has(gn.type)
      const w = intrinsic ? lp + EMPTY_W + P : LEAF_W
      let   h = intrinsic ? EMPTY_H          : LEAF_H
      if (rc) h += 2 * REGION_OVERHANG
      if (sl) h = Math.max(h, minSwimLaneH)   // empty subscription still matches uniform height
      sizeCache.set(id, { w, h })
      return { w, h }
    }

    const containerKids = children.filter(c => isContainer(c))
    const leafKids      = children.filter(c => !isContainer(c))

    // ── Swimlane: single-row region layout ────────────────────────────────
    if (sl) {
      const row1 = containerKids.map(c => dims(c))
      const row2 = leafKids.map(c => dims(c))

      const w1 = row1.length > 0 ? row1.reduce((s, d) => s + d.w, 0) + G * (row1.length - 1) : 0
      const w2 = row2.length > 0 ? row2.reduce((s, d) => s + d.w, 0) + G * (row2.length - 1) : 0

      // Height uses content heights (strip the overhang from region dims).
      const contentH1 = row1.length > 0
        ? Math.max(...containerKids.map((c, i) =>
            isRegionColumn(c) ? row1[i].h - 2 * REGION_OVERHANG : row1[i].h))
        : 0
      const contentH2 = row2.length > 0 ? Math.max(...row2.map(d => d.h)) : 0
      const both = contentH1 > 0 && contentH2 > 0

      const contentH = contentH1 + (both ? ROW_GAP : 0) + contentH2
      const swimH = Math.max(contentH, minSwimLaneH)

      // When minSwimLaneH enlarges the swimlane beyond its region content, stretch
      // each region column so it fills the swimlane with equal overhang top and bottom.
      if (swimH > contentH1) {
        for (const cid of containerKids) {
          if (isRegionColumn(cid)) {
            const cached = sizeCache.get(cid)!
            sizeCache.set(cid, { w: cached.w, h: swimH + 2 * REGION_OVERHANG })
          }
        }
      }

      const d = { w: lp + Math.max(w1, w2) + P, h: swimH }
      sizeCache.set(id, d)
      return d
    }

    // ── Non-swimlane: grid layout for containers; chain layout for RG leaves ──
    const contRows = chunk(containerKids, MAX_CONT_COLS)

    const contW = contRows.length > 0
      ? Math.max(...contRows.map(row => row.reduce((s, c) => s + dims(c).w, 0) + G * (row.length - 1)))
      : 0
    const contH = contRows.reduce((total, row, i) =>
      total + Math.max(...row.map(c => dims(c).h)) + (i > 0 ? CONT_ROW_GAP : 0), 0)

    // Leaf section: RG nodes use precomputed chain layout; others use simple grid.
    const rgLayout = rgLeafLayouts.get(id)
    let leafW = 0
    let leafH = 0
    if (rgLayout && leafKids.length > 0) {
      const remCount = rgLayout.remainder.length
      const remCols  = Math.min(remCount, resolvedMaxLeafCols)
      const remRows  = Math.ceil(remCount / resolvedMaxLeafCols)
      const remW = remCount > 0 ? remCols * LEAF_W + (remCols - 1) * G : 0
      const remH = remCount > 0 ? remRows * LEAF_H + (remRows - 1) * LEAF_ROW_GAP : 0
      leafW = Math.max(rgLayout.sectionW, remW)
      leafH = rgLayout.sectionH
            + (rgLayout.sectionH > 0 && remH > 0 ? ROW_GAP : 0)
            + remH
    } else if (leafKids.length > 0) {
      const leafRows = chunk(leafKids, resolvedMaxLeafCols)
      leafW = Math.max(...leafRows.map(row => row.length * LEAF_W + G * (row.length - 1)))
      leafH = leafRows.length * LEAF_H + (leafRows.length - 1) * LEAF_ROW_GAP
    }

    const innerW = Math.max(contW, leafW)
    const innerH = contH + (contH > 0 && leafH > 0 ? ROW_GAP : 0) + leafH

    // Region columns have no header band but add the symmetric overhang.
    const baseH = innerH + P * 2 + (rc ? 0 : H)
    const finalH = rc ? baseH + 2 * REGION_OVERHANG : baseH

    const d = { w: lp + innerW + P, h: finalH }
    sizeCache.set(id, d)
    return d
  }

  // ── 4. Position nodes (top-down, depth-first) ─────────────────────────────
  const result: Node[] = []

  function layout(id: string, x: number, y: number, parentId?: string) {
    const gn     = nodeMap.get(id)!
    const children = childrenOf.get(id) ?? []
    const { w, h } = dims(id)
    const asCont = isContainer(id)
    const sl     = isSwimLane(id)
    const rc     = isRegionColumn(id)
    const lp     = lpad(id)

    result.push({
      id,
      type: sl ? 'azureSwimLane' : rc ? 'azureRegionColumn' : asCont ? 'azureContainer' : 'azureNode',
      position: { x, y },
      data: makeData(gn),
      // Region columns overflow the swimlane — omit extent:'parent' so React Flow
      // does not clip them to the subscription boundary.
      ...(parentId !== undefined
        ? rc ? { parentId } : { parentId, extent: 'parent' as const }
        : {}),
      ...(asCont ? { style: { width: w, height: h } } : {}),
    })

    if (children.length === 0) return

    const containerKids = children.filter(c => isContainer(c))
    const leafKids      = children.filter(c => !isContainer(c))

    // ── Swimlane: single-row regions ──────────────────────────────────────
    if (sl) {
      const row1Dims = containerKids.map(c => dims(c))
      let cx = lp
      const cy1 = -REGION_OVERHANG
      containerKids.forEach((cid, i) => {
        layout(cid, cx, cy1, id)
        cx += row1Dims[i].w + G
      })

      // Leaf kids (rare inside a swimlane) go below the region content area.
      const contentH1 = row1Dims.length > 0
        ? Math.max(...containerKids.map((c, i) =>
            isRegionColumn(c) ? row1Dims[i].h - 2 * REGION_OVERHANG : row1Dims[i].h))
        : 0
      const cy2 = contentH1 + (contentH1 > 0 && leafKids.length > 0 ? ROW_GAP : 0)
      cx = lp
      leafKids.forEach(cid => {
        layout(cid, cx, cy2, id)
        cx += LEAF_W + G
      })
      return
    }

    // ── Non-swimlane: grid layout ─────────────────────────────────────────
    // Children start below the overhang label area (region columns) or below
    // the header band (regular containers).
    const cyStart = rc ? REGION_OVERHANG + P : H + P

    // Container kids: wrap into rows of MAX_CONT_COLS.
    const contRows = chunk(containerKids, MAX_CONT_COLS)
    let cy = cyStart
    let contH = 0

    for (let r = 0; r < contRows.length; r++) {
      if (r > 0) { cy += CONT_ROW_GAP; contH += CONT_ROW_GAP }
      const row = contRows[r]
      let cx = lp
      let rowH = 0
      for (const cid of row) {
        layout(cid, cx, cy, id)
        const d = dims(cid)
        cx  += d.w + G
        rowH = Math.max(rowH, d.h)
      }
      cy    += rowH
      contH += rowH
    }

    // Leaf kids: chain layout for RG nodes, flat grid for other containers.
    if (leafKids.length > 0) {
      const rgLayout   = rgLeafLayouts.get(id)
      const hasLeaf    = rgLayout ? (rgLayout.sectionH > 0 || rgLayout.remainder.length > 0) : true
      const leafCyBase = cyStart + contH + (contH > 0 && hasLeaf ? ROW_GAP : 0)

      if (rgLayout) {
        for (const [leafId, pos] of rgLayout.placements) {
          layout(leafId, lp + pos.x, leafCyBase + pos.y, id)
        }
        if (rgLayout.remainder.length > 0) {
          const remBase = leafCyBase + rgLayout.sectionH
                        + (rgLayout.sectionH > 0 ? ROW_GAP : 0)
          const remRows = chunk(rgLayout.remainder, resolvedMaxLeafCols)
          let remCy = remBase
          for (const row of remRows) {
            let cx = lp
            for (const remId of row) {
              layout(remId, cx, remCy, id)
              cx += LEAF_W + G
            }
            remCy += LEAF_H + LEAF_ROW_GAP
          }
        }
      } else {
        const leafRows = chunk(leafKids, resolvedMaxLeafCols)
        let leafCy = leafCyBase
        for (const row of leafRows) {
          let cx = lp
          for (const cid of row) {
            layout(cid, cx, leafCy, id)
            cx += LEAF_W + G
          }
          leafCy += LEAF_H + LEAF_ROW_GAP
        }
      }
    }
  }

  // ── 5. Arrange root nodes ─────────────────────────────────────────────────
  //
  // All roots are arranged horizontally so subscription swimlanes sit side-by-side.
  // This allows "Child of" edges from the MG org chart above to drop straight down
  // to the correct subscription rather than passing diagonally over siblings.
  let rx = 0
  for (const root of roots) {
    layout(root, rx, 0, undefined)
    rx += dims(root).w + ROOT_GAP
  }

  return result
}
