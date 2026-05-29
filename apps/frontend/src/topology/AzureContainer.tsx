import React from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ResourceType } from '@azmap/shared'
import { nodeConfig } from './nodeConfig'

export type AzureContainerData = {
  label:        string
  resourceType: ResourceType
  subtitle?:    string
  peerIds?:     string[]   // injected by Topology for VNets; drives per-peer handles
}

export type AzureContainerType = Node<AzureContainerData, 'azureContainer'>

export function AzureContainer({ data }: NodeProps<AzureContainerType>) {
  const { label, accent, text, Icon } = nodeConfig[data.resourceType]
  const isVNet = data.resourceType === ResourceType.VirtualNetwork

  return (
    <div
      className="w-full h-full rounded-lg"
      style={{ border: `1.5px solid ${accent}55`, background: `${accent}0d` }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: accent, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />

      {/* One source+target handle pair per peer VNet, spread evenly across the
          top edge. Handle IDs must match what toFlowElements assigns to edges. */}
      {isVNet && (data.peerIds ?? []).map((peerId, i, arr) => {
        const pct = `${((i + 1) / (arr.length + 1)) * 100}%`
        return (
          <React.Fragment key={peerId}>
            <Handle id={`peer-src-${peerId}`} type="source" position={Position.Top}
              style={{ background: accent, left: pct, transform: 'translateX(-50%)' }} />
            <Handle id={`peer-tgt-${peerId}`} type="target" position={Position.Top}
              style={{ background: accent, left: pct, transform: 'translateX(-50%)' }} />
          </React.Fragment>
        )
      })}

      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-md min-w-0"
        style={{ background: `${accent}22`, borderBottom: `1px solid ${accent}44` }}
      >
        <span className="flex-shrink-0"><Icon size="16" /></span>
        <span className="text-[10px] font-bold uppercase tracking-widest flex-shrink-0" style={{ color: text }}>
          {label}
        </span>
        <span className="text-xs text-gray-200 font-medium truncate min-w-0">{data.label}</span>
        {data.subtitle && (
          <span className="text-[10px] text-gray-500 flex-shrink-0 ml-auto">{data.subtitle}</span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
    </div>
  )
}
