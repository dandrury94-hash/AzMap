import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import { ResourceType } from '@azmap/shared'
import { nodeConfig } from './nodeConfig'

export type AzureSwimLaneData = {
  label: string
  resourceType: ResourceType
  subtitle?: string
}

export type AzureSwimLaneType = Node<AzureSwimLaneData, 'azureSwimLane'>

// Must match SWIMLANE_W in containerLayout.ts
const STRIP_W = 48

export function AzureSwimLane({ data }: NodeProps<AzureSwimLaneType>) {
  const { label, accent, text, Icon } = nodeConfig[data.resourceType]

  return (
    <div
      className="w-full h-full rounded-lg flex relative"
      style={{ border: `1.5px solid ${accent}44`, background: `${accent}08`, overflow: 'visible' }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: accent, left: '50%', transform: 'translateX(-50%)' }} />

      {/* Label strip — flex child so it stretches to swimlane height automatically.
          overflow:visible so border-radius never clips the icon against any ancestor. */}
      <div
        style={{
          width:         STRIP_W,
          flexShrink:    0,
          alignSelf:     'stretch',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          paddingTop:    10,
          paddingBottom: 8,
          background:    `${accent}18`,
          borderRight:   `1px solid ${accent}33`,
          borderRadius:  '0.5rem 0 0 0.5rem',
          gap:           6,
          boxSizing:     'border-box',
          overflow:      'visible',
        }}
      >
        {/* Icon — extra height and overflow:visible give SVG viewBox room to breathe */}
        <div style={{
          width:          STRIP_W - 8,
          height:         24,
          flexShrink:     0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          overflow:       'visible',
        }}>
          <Icon size="18" />
        </div>

        {/* Two vertical text columns side-by-side.
            Both share the full remaining strip height so neither truncates the other.
            overflow:hidden on this wrapper clips both columns at the same y. */}
        <div style={{
          flex:      '1 1 0',
          minHeight: 0,
          display:   'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap:        4,
          overflow:   'hidden',
          paddingLeft: 2,
          paddingRight: 2,
        }}>
          {/* Resource-type label — slightly dimmed accent colour */}
          <span style={{
            color:         text,
            opacity:       0.6,
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            writingMode:   'vertical-rl',
            transform:     'rotate(180deg)',
            lineHeight:    1,
            whiteSpace:    'nowrap',
            overflow:      'hidden',
            flexShrink:    0,
          }}>
            {label}
          </span>

          {/* Subscription name — white */}
          <span style={{
            color:      '#f9fafb',
            fontSize:   9,
            writingMode:'vertical-rl',
            transform:  'rotate(180deg)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            flex:       '1 1 0',
          }}>
            {data.label}
          </span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
    </div>
  )
}
