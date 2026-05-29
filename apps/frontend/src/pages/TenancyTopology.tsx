import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraphStore } from '../store/graphStore'
import { useViewStore } from '../store/viewStore'
import { ResourceType } from '@azmap/shared'
import { buildMgTree } from '../topology/mgTree'
import { MgHierarchy } from '../topology/MgHierarchy'

export function TenancyTopology() {
  const graphNodes = useGraphStore(s => s.nodes)
  const graphEdges = useGraphStore(s => s.edges)
  const navigate   = useNavigate()

  const hasMgData = graphNodes.some(n => n.type === ResourceType.ManagementGroup)

  const mgTree = useMemo(
    () => buildMgTree(graphNodes, graphEdges),
    [graphNodes, graphEdges],
  )

  if (!hasMgData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 font-medium mb-2">No management group data</p>
          <p className="text-sm text-gray-600 mb-6">
            Import an Azure management group export to view the tenancy hierarchy.
          </p>
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
    <div className="flex-1 overflow-auto px-8 py-8">
      <div className="mb-6">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
          Tenancy Topology
        </p>
        <h1 className="text-xl font-semibold text-gray-100">Management Group Hierarchy</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organisational structure showing management groups and subscription assignments.
          Use the sidebar checkboxes to show or hide management groups.
        </p>
      </div>

      <MgHierarchy roots={mgTree} />
    </div>
  )
}
