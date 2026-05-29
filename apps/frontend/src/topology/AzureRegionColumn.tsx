import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ResourceType } from '@azmap/shared'
import { nodeConfig } from './nodeConfig'

export type AzureRegionColumnData = {
  label: string
  resourceType: ResourceType
  subtitle?: string
}

export type AzureRegionColumnType = Node<AzureRegionColumnData, 'azureRegionColumn'>

// Region columns extend above and below the subscription swimlane (REGION_OVERHANG
// pixels each side). The header label sits in the top overhang area. The body
// covers the subscription content and the bottom overhang. The left edge of the
// card sits to the right of the subscription's label strip — positioning is
// handled by the layout engine, not this component.
export function AzureRegionColumn({ data }: NodeProps<AzureRegionColumnType>) {
  const { label, accent, text, Icon } = nodeConfig[data.resourceType]

  return (
    <div
      className="w-full h-full rounded-lg"
      style={{ border: `1.5px solid ${accent}44`, background: `${accent}08` }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      {/* Header — sits in the overhang area above the subscription border */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg"
        style={{ background: `${accent}1a`, borderBottom: `1px solid ${accent}33` }}
      >
        <Icon size="13" />
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: text }}>
          {label}
        </span>
        <span className="text-xs text-gray-200 font-medium">{data.label}</span>
        {data.subtitle && (
          <span className="text-[10px] text-gray-500 ml-auto">{data.subtitle}</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}
