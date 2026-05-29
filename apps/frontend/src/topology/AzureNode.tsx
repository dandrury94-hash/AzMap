import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ResourceType } from '@azmap/shared'
import { nodeConfig } from './nodeConfig'

export type AzureNodeData = {
  label: string
  resourceType: ResourceType
  subtitle?: string
}

export type AzureNodeType = Node<AzureNodeData, 'azureNode'>

export function AzureNode({ data }: NodeProps<AzureNodeType>) {
  const { label, accent, text, Icon } = nodeConfig[data.resourceType]

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-md overflow-hidden shadow-lg flex" style={{ minWidth: 180 }}>
      <Handle type="target" position={Position.Top} style={{ background: '#4b5563' }} />
      <div style={{ width: 3, background: accent, flexShrink: 0 }} />
      <div className="flex items-center justify-center w-10 flex-shrink-0 py-2.5 bg-gray-800/50">
        <Icon size="22" />
      </div>
      <div className="px-2.5 py-2 flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: text }}>
          {label}
        </p>
        <p className="text-sm font-medium text-gray-100 truncate">{data.label}</p>
        {data.subtitle && (
          <p className="text-[10px] text-gray-500 truncate mt-0.5">{data.subtitle}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#4b5563' }} />
    </div>
  )
}
