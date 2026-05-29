import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReactFlow, Background, Controls, MiniMap, BackgroundVariant } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { GraphNode } from '@azmap/shared'
import { RelationshipType, ResourceType } from '@azmap/shared'
import '@xyflow/react/dist/style.css'

import { useGraphStore } from '../store/graphStore'
import { useViewStore } from '../store/viewStore'
import { useSettingsStore } from '../store/settingsStore'
import { buildMgTree } from '../topology/mgTree'
import { buildContainerLayout } from '../topology/containerLayout'
import { buildMgCanvasLayout } from '../topology/mgLayout'
import { toFlowEdges } from '../topology/toFlowElements'
import { AzureNode } from '../topology/AzureNode'
import { AzureContainer } from '../topology/AzureContainer'
import { AzureSwimLane } from '../topology/AzureSwimLane'
import { AzureRegionColumn } from '../topology/AzureRegionColumn'
import { AzureMgNode } from '../topology/AzureMgNode'
import { BusEdge } from '../topology/BusEdge'
import { RelationshipEdge } from '../topology/RelationshipEdge'
import { MgBusEdge } from '../topology/MgBusEdge'
import { PeeringEdge } from '../topology/PeeringEdge'
import { NodeDetailPanel } from '../topology/NodeDetailPanel'
import { Legend } from '../topology/Legend'
import { PanOverlay } from '../topology/PanOverlay'

// ── Peering bus zone geometry ─────────────────────────────────────────────────
// Bus lanes sit in a reserved strip between the MG section and the swimlanes.
// Each lane runs at an absolute canvas Y so the horizontal bus segments are
// guaranteed to be above every card header regardless of nesting depth.
const PEER_LANE_STEP = 16  // vertical gap between parallel bus lanes
const PEER_BUS_PAD   = 28  // padding above lane 0 and below the last lane

const nodeTypes = {
  azureNode:         AzureNode,
  azureContainer:    AzureContainer,
  azureSwimLane:     AzureSwimLane,
  azureRegionColumn: AzureRegionColumn,
  azureMgNode:       AzureMgNode,
}

const edgeTypes = {
  busEdge:          BusEdge,
  mgBusEdge:        MgBusEdge,
  peeringEdge:      PeeringEdge,
  relationshipEdge: RelationshipEdge,
}

export function Topology() {
  const navigate              = useNavigate()
  const graphNodes            = useGraphStore(s => s.nodes)
  const graphEdges            = useGraphStore(s => s.edges)
  const deselectedSubIds      = useViewStore(s => s.deselectedSubIds)
  const deselectedMgIds       = useViewStore(s => s.deselectedMgIds)
  const deselectedRegionNames = useViewStore(s => s.deselectedRegionNames)

  // ── Settings ──────────────────────────────────────────────────────────────
  const hiddenEdgeTypes     = useSettingsStore(s => s.hiddenEdgeTypes)
  const hiddenResourceTypes = useSettingsStore(s => s.hiddenResourceTypes)
  const chainLayoutEnabled  = useSettingsStore(s => s.chainLayoutEnabled)
  const maxChainDepth       = useSettingsStore(s => s.maxChainDepth)
  const maxLeafCols         = useSettingsStore(s => s.maxLeafCols)

  const hiddenEdgeTypesSet     = useMemo(() => new Set(hiddenEdgeTypes),     [hiddenEdgeTypes])
  const hiddenResourceTypesSet = useMemo(() => new Set(hiddenResourceTypes), [hiddenResourceTypes])

  const hasData   = graphNodes.length > 0
  const hasMgData = graphNodes.some(n => n.type === ResourceType.ManagementGroup)

  const deselectedRegionNamesSet = useMemo(
    () => new Set(deselectedRegionNames),
    [deselectedRegionNames],
  )

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [legendOpen, setLegendOpen]     = useState(false)
  const [panMode, setPanMode] = useState(false)

  // Pan mode is active while Ctrl is held.
  useEffect(() => {
    const onDown  = (e: KeyboardEvent) => { if (e.key === 'Control') setPanMode(true)  }
    const onUp    = (e: KeyboardEvent) => { if (e.key === 'Control') setPanMode(false) }
    const onBlur  = () => setPanMode(false)
    window.addEventListener('keydown',  onDown)
    window.addEventListener('keyup',    onUp)
    window.addEventListener('blur',     onBlur)
    return () => {
      window.removeEventListener('keydown',  onDown)
      window.removeEventListener('keyup',    onUp)
      window.removeEventListener('blur',     onBlur)
    }
  }, [])

  // ── Derived sets ──────────────────────────────────────────────────────────
  const mgNodeIds = useMemo(
    () => new Set(graphNodes.filter(n => n.type === ResourceType.ManagementGroup).map(n => n.id)),
    [graphNodes],
  )

  const mgTree = useMemo(
    () => buildMgTree(graphNodes, graphEdges),
    [graphNodes, graphEdges],
  )

  // ── Hidden node IDs ───────────────────────────────────────────────────────
  // Covers: deselected subs/MGs/regions from sidebar + hidden resource types from settings.
  const hiddenNodeIds = useMemo(() => {
    const hasFilter = deselectedSubIds.length > 0
                   || deselectedMgIds.length > 0
                   || deselectedRegionNames.length > 0
                   || hiddenResourceTypes.length > 0
    if (!hasFilter) return new Set<string>()

    const childrenOf = new Map<string, string[]>()
    for (const e of graphEdges) {
      if (e.relationshipType !== RelationshipType.Contains) continue
      if (!childrenOf.has(e.source)) childrenOf.set(e.source, [])
      childrenOf.get(e.source)!.push(e.target)
    }

    const hidden = new Set<string>()
    function collect(id: string) {
      hidden.add(id)
      for (const child of childrenOf.get(id) ?? []) collect(child)
    }
    for (const subId of deselectedSubIds) collect(subId)
    for (const mgId of deselectedMgIds) collect(mgId)
    for (const n of graphNodes) {
      if (n.type === ResourceType.Region && deselectedRegionNamesSet.has(n.name)) collect(n.id)
      if (hiddenResourceTypesSet.has(n.type)) collect(n.id)
    }
    return hidden
  }, [
    deselectedSubIds, deselectedMgIds, deselectedRegionNames, deselectedRegionNamesSet,
    hiddenResourceTypes, hiddenResourceTypesSet, graphEdges, graphNodes,
  ])

  const hasFilter = deselectedSubIds.length > 0
                 || deselectedMgIds.length > 0
                 || deselectedRegionNames.length > 0
                 || hiddenResourceTypes.length > 0

  // ── Subscription canvas nodes / edges ────────────────────────────────────
  const subNodes = useMemo(
    () => {
      const base = hasFilter ? graphNodes.filter(n => !hiddenNodeIds.has(n.id)) : graphNodes
      return base.filter(n => !mgNodeIds.has(n.id))
    },
    [graphNodes, hiddenNodeIds, hasFilter, mgNodeIds],
  )

  const subEdges = useMemo(
    () => {
      const base = hasFilter
        ? graphEdges.filter(e => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target))
        : graphEdges
      return base
        .filter(e => !mgNodeIds.has(e.source))
        .filter(e => !hiddenEdgeTypesSet.has(e.relationshipType))
    },
    [graphEdges, hiddenNodeIds, hasFilter, mgNodeIds, hiddenEdgeTypesSet],
  )

  // ── Sort subscription nodes in MG tree left-to-right order ──────────────
  const orderedSubNodes = useMemo(() => {
    const subOrder: string[] = []
    function walk(node: import('../topology/mgTree').MgTreeNode) {
      if (deselectedMgIds.includes(node.id)) return
      node.childMgs.forEach(walk)
      node.subs.forEach(s => subOrder.push(s.id))
    }
    mgTree.forEach(walk)

    const nodeMap    = new Map(subNodes.map(n => [n.id, n]))
    const orderedSet = new Set(subOrder)
    const inOrder    = subOrder.map(id => nodeMap.get(id)).filter(Boolean) as typeof subNodes
    const leftover   = subNodes.filter(n => !orderedSet.has(n.id))
    return [...inOrder, ...leftover]
  }, [subNodes, mgTree, deselectedMgIds])

  // ── Layout config from settings ───────────────────────────────────────────
  const layoutConfig = useMemo(
    () => ({ chainLayoutEnabled, maxChainDepth, maxLeafCols }),
    [chainLayoutEnabled, maxChainDepth, maxLeafCols],
  )

  // ── Subscription swimlane layout ──────────────────────────────────────────
  const rawSubLayout = useMemo(
    () => hasData ? buildContainerLayout(orderedSubNodes, subEdges, layoutConfig) : [],
    [orderedSubNodes, subEdges, hasData, layoutConfig],
  )

  // ── Subscription x-centres for MG centering ───────────────────────────────
  const subCentres = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of rawSubLayout) {
      if (n.type === 'azureSwimLane') {
        const w = typeof n.style?.width === 'number' ? n.style.width : 0
        map.set(n.id, n.position.x + w / 2)
      }
    }
    return map
  }, [rawSubLayout])

  // ── MG org-chart layout ───────────────────────────────────────────────────
  const mgLayout = useMemo(
    () => hasMgData
      ? buildMgCanvasLayout(mgTree, deselectedMgIds, subCentres)
      : { nodes: [], edges: [], sectionHeight: 0 },
    [mgTree, deselectedMgIds, subCentres, hasMgData],
  )

  // ── Peering bus zone ──────────────────────────────────────────────────────
  // Count deduplicated peering pairs so we know how many bus lanes to reserve.
  const numPeeringEdges = useMemo(() => {
    const seen = new Set<string>()
    for (const e of subEdges) {
      if (e.relationshipType !== RelationshipType.PeeredWith) continue
      const key = e.source < e.target ? `${e.source}|${e.target}` : `${e.target}|${e.source}`
      seen.add(key)
    }
    return seen.size
  }, [subEdges])

  // The bus zone sits between the MG section and the swimlanes.
  // Lane i runs at absolute canvas Y = peeringBusOriginY + i * PEER_LANE_STEP.
  const peeringBusZoneHeight = numPeeringEdges > 0
    ? PEER_BUS_PAD * 2 + numPeeringEdges * PEER_LANE_STEP
    : 0
  const peeringBusOriginY = mgLayout.sectionHeight + PEER_BUS_PAD

  const offsetSubLayout = useMemo(() => {
    const dy = mgLayout.sectionHeight + peeringBusZoneHeight
    if (dy === 0) return rawSubLayout
    return rawSubLayout.map(n =>
      n.parentId !== undefined
        ? n
        : { ...n, position: { x: n.position.x, y: n.position.y + dy } },
    )
  }, [rawSubLayout, mgLayout.sectionHeight, peeringBusZoneHeight])

  // ── Combined canvas ───────────────────────────────────────────────────────
  const layoutNodes = useMemo(
    () => [...mgLayout.nodes, ...offsetSubLayout],
    [mgLayout.nodes, offsetSubLayout],
  )

  // ── VNet peer map: vnetId → sorted list of peer vnet ids ─────────────────
  // Built from graph edges (before toFlowEdges deduplication) so every VNet
  // knows all its peers and can render one handle per peer.
  const vnetPeerMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const e of subEdges) {
      if (e.relationshipType !== RelationshipType.PeeredWith) continue
      if (!map.has(e.source)) map.set(e.source, new Set())
      if (!map.has(e.target)) map.set(e.target, new Set())
      map.get(e.source)!.add(e.target)
      map.get(e.target)!.add(e.source)
    }
    const result = new Map<string, string[]>()
    for (const [id, peers] of map) result.set(id, [...peers].sort())
    return result
  }, [subEdges])

  // Inject peerIds into each VNet node's data so AzureContainer can render
  // per-peer handles without touching the layout algorithm.
  const finalLayoutNodes = useMemo(() => {
    if (vnetPeerMap.size === 0) return layoutNodes
    return layoutNodes.map(n => {
      const peers = vnetPeerMap.get(n.id)
      if (!peers) return n
      return { ...n, data: { ...n.data, peerIds: peers } }
    })
  }, [layoutNodes, vnetPeerMap])

  const layoutEdges = useMemo(() => {
    return [...toFlowEdges(subEdges), ...mgLayout.edges].map(e => {
      if (e.type !== 'peeringEdge') return e
      const laneIndex = (e.data as { laneIndex?: number })?.laneIndex ?? 0
      return { ...e, data: { ...e.data, busY: peeringBusOriginY + laneIndex * PEER_LANE_STEP } }
    })
  }, [subEdges, mgLayout.edges, peeringBusOriginY])

  // ── Node interaction ──────────────────────────────────────────────────────
  const nodeById = useMemo(
    () => new Map(graphNodes.map(n => [n.id, n])),
    [graphNodes],
  )

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const gn = nodeById.get(node.id)
    if (gn) setSelectedNode(gn)
  }, [nodeById])

  const handlePaneClick = useCallback((e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) { setPanMode(v => !v); return }
    setSelectedNode(null)
  }, [])

  if (!hasData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 font-medium mb-2">No topology data loaded</p>
          <p className="text-sm text-gray-600 mb-6">Import Azure data to render a topology diagram.</p>
          <button
            onClick={() => navigate('/import')}
            className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
          >
            Import data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-gray-900/90 border border-gray-800 rounded-lg px-4 py-3 pointer-events-none">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">Technical Topology</p>
        <p className="text-sm text-gray-200 font-medium">
          {finalLayoutNodes.length < graphNodes.length
            ? `${finalLayoutNodes.length} of ${graphNodes.length} nodes`
            : `${graphNodes.length} nodes`}
        </p>
      </div>

      <ReactFlow
        nodes={finalLayoutNodes}
        edges={layoutEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodesDraggable={!panMode}
        elementsSelectable={!panMode}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1f2937" />
        <Controls />
        <MiniMap
          nodeColor="#1f2937"
          maskColor="rgba(0,0,0,0.6)"
          style={{ background: '#111827', border: '1px solid #374151' }}
        />
        {panMode && <PanOverlay />}
      </ReactFlow>

      {panMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-blue-900/90 border border-blue-700 rounded-lg px-4 py-2 flex items-center gap-2 pointer-events-none">
          <span className="text-lg">✥</span>
          <div>
            <p className="text-xs font-semibold text-blue-200">Pan mode</p>
            <p className="text-[10px] text-blue-400">Drag to pan · Release Ctrl to exit</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setLegendOpen(v => !v)}
        className="absolute bottom-20 right-4 z-10 bg-gray-900/90 border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      >
        Legend
      </button>

      {legendOpen && <Legend onClose={() => setLegendOpen(false)} />}

      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  )
}
