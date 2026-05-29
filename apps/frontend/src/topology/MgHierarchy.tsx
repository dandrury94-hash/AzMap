import { useViewStore } from '../store/viewStore'
import type { MgTreeNode } from './mgTree'

const LINE = '#374151'

function OrgNode({ node }: { node: MgTreeNode }) {
  const deselectedMgIds = useViewStore(s => s.deselectedMgIds)
  if (deselectedMgIds.includes(node.id)) return null

  // Filter children here so bracket math is always correct
  const visible = node.childMgs.filter(c => !deselectedMgIds.includes(c.id))
  const n = visible.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card */}
      <div style={{
        padding: '3px 10px',
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        color: '#cbd5e1',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        {node.name}
      </div>

      {n > 0 && (
        <>
          {/* Vertical drop from card */}
          <div style={{ width: 1, height: 12, background: LINE }} />

          {/* Children row */}
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {visible.map((child, i) => {
              const first = i === 0
              const last  = i === n - 1
              const only  = n === 1

              return (
                <div
                  key={child.id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: '0 10px' }}
                >
                  {/* Bracket segment — fills wrapper width via alignItems:stretch on parent */}
                  {only ? (
                    <div style={{ width: 1, height: 12, alignSelf: 'center', background: LINE }} />
                  ) : (
                    <div style={{
                      height: 12,
                      borderTop: `1px solid ${LINE}`,
                      borderLeft:  first ? `1px solid ${LINE}` : undefined,
                      borderRight: last  ? `1px solid ${LINE}` : undefined,
                      borderTopLeftRadius:  first ? 3 : 0,
                      borderTopRightRadius: last  ? 3 : 0,
                    }} />
                  )}

                  {/* Center the child node beneath its bracket segment */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <OrgNode node={child} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function MgHierarchy({ roots }: { roots: MgTreeNode[] }) {
  if (roots.length === 0) return null
  return (
    <div style={{
      flexShrink: 0,
      overflowX: 'auto',
      borderBottom: '1px solid #1f2937',
      background: 'rgba(2, 6, 23, 0.7)',
      padding: '14px 32px',
    }}>
      <p style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#374151',
        marginBottom: 10,
      }}>
        Management Group Hierarchy
      </p>
      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', minWidth: 'max-content' }}>
        {roots.map(root => <OrgNode key={root.id} node={root} />)}
      </div>
    </div>
  )
}
