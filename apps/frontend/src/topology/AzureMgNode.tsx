import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ManagementGroups } from './icons'

export type AzureMgNodeData = { label: string }
export type AzureMgNodeType = Node<AzureMgNodeData, 'azureMgNode'>

const ACCENT = '#7c3aed'
const TEXT   = '#c4b5fd'
const BG     = '#1a1033'
const BORDER = '#4c1d95'

export function AzureMgNode({ data }: NodeProps<AzureMgNodeType>) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          6,
      padding:      '4px 10px',
      background:   BG,
      border:       `1px solid ${BORDER}`,
      borderRadius: 5,
      fontSize:     11,
      fontWeight:   500,
      color:        TEXT,
      whiteSpace:   'nowrap',
      cursor:       'default',
      userSelect:   'none',
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: ACCENT, width: 6, height: 6, border: 'none' }}
      />
      <ManagementGroups size="12" />
      <span>{data.label}</span>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: ACCENT, width: 6, height: 6, border: 'none' }}
      />
    </div>
  )
}
