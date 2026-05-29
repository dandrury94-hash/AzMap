import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraphStore } from '../store/graphStore'
import { ResourceType, RelationshipType } from '@azmap/shared'
import type { GraphEdge, GraphNode } from '@azmap/shared'

// ─── Layer computation ────────────────────────────────────────────────────────
// Derived entirely from graph data. When the real import pipeline is wired up,
// replace demoNodes/demoEdges with the live graph state.

type LayerStatus = 'pending' | 'partial' | 'ready'
type CountItem = { label: string; count: number }
type Layer = { id: string; label: string; description: string; status: LayerStatus; counts: CountItem[] }

function computeLayers(nodes: GraphNode[], edges: GraphEdge[]): Layer[] {
  const byType = (...types: ResourceType[]) => nodes.filter(n => types.includes(n.type))
  const byRel = (rel: RelationshipType) => edges.filter(e => e.relationshipType === rel)

  const subscriptions    = byType(ResourceType.Subscription)
  const managementGroups = byType(ResourceType.ManagementGroup)
  const resourceGroups   = byType(ResourceType.ResourceGroup)
  const vnets            = byType(ResourceType.VirtualNetwork)
  const subnets          = byType(ResourceType.Subnet)
  const nsgs             = byType(ResourceType.NetworkSecurityGroup)
  const vms              = byType(ResourceType.VirtualMachine)
  const nics             = byType(ResourceType.NetworkInterface)
  const regions          = byType(ResourceType.Region)
  const firewalls        = byType(ResourceType.AzureFirewall)
  const appGateways      = byType(ResourceType.ApplicationGateway)
  const loadBalancers    = byType(ResourceType.LoadBalancer)
  const vpnGateways      = byType(ResourceType.VpnGateway)
  const routeTables      = byType(ResourceType.RouteTable)
  const vwans            = byType(ResourceType.VirtualWan)
  const bastions         = byType(ResourceType.BastionHost)
  const peerings         = byRel(RelationshipType.PeeredWith)
  const securedBy        = byRel(RelationshipType.SecuredBy)
  const failovers        = byRel(RelationshipType.FailsOverTo)

  const pairedRegions = regions.filter(r => r.metadata?.pairedRegion)

  return [
    {
      id: 'identity',
      label: 'Identity & Management',
      description: 'Subscriptions, management groups, and resource group boundaries',
      status: managementGroups.length === 0 && subscriptions.length === 0
        ? 'pending'
        : managementGroups.length > 0 && subscriptions.length > 0
        ? 'ready'
        : 'partial',
      counts: [
        { label: 'Subscriptions',     count: subscriptions.length    },
        { label: 'Management Groups', count: managementGroups.length },
        { label: 'Resource Groups',   count: resourceGroups.length   },
      ],
    },
    {
      id: 'network',
      label: 'Network Topology',
      description: 'Virtual networks, subnets, gateways, load balancers, and peering connections',
      status: vnets.length === 0 ? 'pending' : 'ready',
      counts: [
        { label: 'Virtual Networks',    count: vnets.length         },
        { label: 'Subnets',             count: subnets.length       },
        { label: 'VNet Peerings',       count: peerings.length      },
        { label: 'Load Balancers',      count: loadBalancers.length },
        { label: 'App Gateways',        count: appGateways.length   },
        { label: 'VPN/ER Gateways',     count: vpnGateways.length   },
        { label: 'Route Tables',        count: routeTables.length   },
        { label: 'vWANs',               count: vwans.length         },
        { label: 'Bastion Hosts',       count: bastions.length      },
      ],
    },
    {
      id: 'security',
      label: 'Security Perimeter',
      description: 'Network security groups, Azure Firewall, and subnet coverage',
      status: nsgs.length === 0 && firewalls.length === 0 ? 'pending' : 'ready',
      counts: [
        { label: 'NSGs',             count: nsgs.length      },
        { label: 'Secured Subnets',  count: securedBy.length },
        { label: 'Azure Firewalls',  count: firewalls.length },
      ],
    },
    {
      id: 'compute',
      label: 'Compute & Workloads',
      description: 'Virtual machines and network interface attachments',
      status: vms.length === 0 ? 'pending' : 'ready',
      counts: [
        { label: 'Virtual Machines',    count: vms.length  },
        { label: 'Network Interfaces',  count: nics.length },
      ],
    },
    {
      id: 'bcpdr',
      label: 'BCP / DR',
      description: 'Paired region coverage and failover path detection',
      status: failovers.length === 0 ? 'pending' : pairedRegions.length > 0 ? 'partial' : 'pending',
      counts: [
        { label: 'Paired Regions',  count: pairedRegions.length },
        { label: 'Failover Links',  count: failovers.length     },
      ],
    },
  ]
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<LayerStatus, { dot: string; ring: string; label: string; labelColor: string }> = {
  pending: { dot: 'bg-gray-700',    ring: 'ring-gray-700',    label: 'Pending', labelColor: 'text-gray-600'   },
  partial: { dot: 'bg-amber-400',   ring: 'ring-amber-400',   label: 'Partial', labelColor: 'text-amber-400'  },
  ready:   { dot: 'bg-emerald-400', ring: 'ring-emerald-400', label: 'Ready',   labelColor: 'text-emerald-400' },
}

// ─── Components ───────────────────────────────────────────────────────────────

function LayerCard({ layer }: { layer: Layer }) {
  const s = STATUS[layer.status]
  const isReady = layer.status === 'ready'
  const isPartial = layer.status === 'partial'

  return (
    <div className={`flex gap-4 border rounded-lg px-5 py-4 transition-colors ${
      isReady   ? 'border-emerald-800 bg-emerald-950/30' :
      isPartial ? 'border-amber-800   bg-amber-950/30'   :
                  'border-gray-800    bg-gray-900/50'
    }`}>
      <div className="flex-shrink-0 pt-0.5">
        <span className={`block w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-gray-950 ${s.dot} ${s.ring}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-sm font-medium text-gray-100">{layer.label}</span>
          <span className={`text-xs font-semibold ${s.labelColor}`}>{s.label}</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">{layer.description}</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {layer.counts.map(c => (
            <span key={c.label} className="text-xs">
              <span className={c.count > 0 ? 'text-gray-200 font-semibold' : 'text-gray-600'}>{c.count}</span>
              <span className="text-gray-600 ml-1">{c.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResyncButton() {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="border border-amber-700 bg-amber-950/40 rounded-lg px-5 py-4">
        <p className="text-sm text-amber-300 font-medium mb-1">Re-scan will clear the current topology</p>
        <p className="text-xs text-amber-600 mb-4">
          All imported data will be discarded and re-ingested from the original source.
          Any unsaved changes or analysis will be lost.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirming(false)}
            className="px-4 py-1.5 rounded text-xs font-medium border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-4 py-1.5 rounded text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
          >
            Confirm Re-scan
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-2 px-4 py-2 rounded border border-gray-700 text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Re-scan
    </button>
  )
}

function RawJsonPanel({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const [minimized, setMinimized] = useState(true)
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify({ nodes, edges }, null, 2)

  function copy() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (minimized) {
    return (
      <div className="flex flex-col items-center border-l border-gray-800 bg-gray-900/40 w-9 flex-shrink-0">
        <button
          onClick={() => setMinimized(false)}
          title="Expand raw graph panel"
          className="flex flex-col items-center gap-2 pt-4 pb-3 w-full text-gray-600 hover:text-gray-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Raw Graph
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full border-l border-gray-800 bg-gray-900/40 w-96 flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Raw Graph</span>
          <span className="ml-2 text-xs text-gray-600">{nodes.length} nodes · {edges.length} edges</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={copy}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => setMinimized(true)}
            title="Minimise panel"
            className="text-gray-600 hover:text-gray-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
      <pre className="flex-1 overflow-auto px-4 py-3 text-xs text-gray-400 leading-relaxed font-mono">
        {json}
      </pre>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate   = useNavigate()
  const nodes       = useGraphStore(s => s.nodes)
  const edges       = useGraphStore(s => s.edges)
  const sourceLabel = useGraphStore(s => s.sourceLabel)
  const importedAt  = useGraphStore(s => s.importedAt)
  const importCount = useGraphStore(s => s.importCount)

  const hasData    = nodes.length > 0
  const layers     = computeLayers(nodes, edges)
  const readyCount = layers.filter(l => l.status === 'ready').length
  const totalCount = layers.length
  const allReady   = hasData && readyCount === totalCount

  return (
    <div className="flex flex-1 min-h-0">

      {/* ── Left: ingestion status ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-8 py-8">

        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-1">Azure Topology Intelligence</h1>
          {hasData ? (
            <p className="text-sm text-gray-500">
              {importCount > 1
                ? <span className="text-gray-400">{importCount} files · </span>
                : sourceLabel && <span className="text-gray-400">{sourceLabel} · </span>
              }
              {importedAt && <span>last import {new Date(importedAt).toLocaleTimeString()} · </span>}
              {readyCount} of {totalCount} layers ready
              {allReady && <span className="ml-2 text-emerald-400 font-medium">· All layers ready</span>}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No topology data loaded. Import a file to get started.</p>
          )}
        </div>

        <div className="space-y-3 mb-8 max-w-xl">
          {layers.map(layer => <LayerCard key={layer.id} layer={layer} />)}
        </div>

        {hasData ? (
          <div className="max-w-xl">
            <ResyncButton />
          </div>
        ) : (
          <div className="max-w-xl">
            <button
              onClick={() => navigate('/import')}
              className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-lg p-8 text-center transition-colors group cursor-pointer"
            >
              <p className="text-gray-300 font-medium mb-1 group-hover:text-blue-400 transition-colors">
                Import Azure topology data
              </p>
              <p className="text-xs text-gray-500">JSON export · ARM template · Resource Graph · .azmap</p>
            </button>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-gray-800 max-w-xl">
          <p className="text-xs text-gray-600 leading-relaxed">
            Layers light up automatically as resource types are detected during ingestion.
          </p>
        </div>
      </div>

      {/* ── Right: raw JSON panel (minimisable) ── */}
      <div className="flex flex-col min-h-0">
        <RawJsonPanel nodes={nodes} edges={edges} />
      </div>

    </div>
  )
}
