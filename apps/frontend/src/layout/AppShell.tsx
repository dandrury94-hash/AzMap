import { NavLink, Outlet } from 'react-router-dom'
import { useMemo } from 'react'
import { useGraphStore } from '../store/graphStore'
import { useViewStore } from '../store/viewStore'
import { buildMgTree } from '../topology/mgTree'
import type { MgTreeNode } from '../topology/mgTree'
import { ResourceType } from '@azmap/shared'

const bottomNav = [
  { to: '/tutorial', label: 'Tutorial' },
  { to: '/import',   label: 'Import'   },
  { to: '/export',   label: 'Export'   },
  { to: '/settings', label: 'Settings' },
]

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `block px-3 py-2 rounded text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

function SectionHeader({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `block px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-colors ${
          isActive ? 'text-blue-400' : 'text-gray-600 hover:text-gray-400'
        }`
      }
    >
      {label}
    </NavLink>
  )
}

function TenancyTreeNode({ node, depth }: { node: MgTreeNode; depth: number }) {
  const deselectedMgIds = useViewStore(s => s.deselectedMgIds)
  const toggleMg        = useViewStore(s => s.toggleMg)
  const pl = 12 + depth * 10

  return (
    <div>
      <label
        className="flex items-center gap-1.5 py-1 rounded mx-1 pr-2 cursor-pointer hover:bg-gray-800/60"
        style={{ paddingLeft: `${pl}px` }}
      >
        <input
          type="checkbox"
          checked={!deselectedMgIds.includes(node.id)}
          onChange={() => toggleMg(node.id)}
          className="w-3 h-3 accent-blue-500 flex-shrink-0 cursor-pointer"
        />
        <span className="text-xs text-gray-300 truncate">{node.name}</span>
      </label>
      {node.childMgs.map(child => (
        <TenancyTreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

function TechnicalTreeNode({
  node,
  depth,
  mgHidden = false,   // true when any ancestor MG is deselected in the Tenancy section
}: {
  node: MgTreeNode
  depth: number
  mgHidden?: boolean
}) {
  const deselectedSubIds = useViewStore(s => s.deselectedSubIds)
  const deselectedMgIds  = useViewStore(s => s.deselectedMgIds)
  const toggleSub        = useViewStore(s => s.toggleSub)
  const mgPl  = 12 + depth * 10
  const subPl = 12 + (depth + 1) * 10

  // This node is hidden if it or any ancestor MG is deselected in the Tenancy section.
  const hidden = mgHidden || deselectedMgIds.includes(node.id)

  if (!node.hasAnySubs) return null

  return (
    <div>
      <div
        className={`py-1 px-3 text-[11px] font-medium truncate ${hidden ? 'text-gray-700' : 'text-gray-500'}`}
        style={{ paddingLeft: `${mgPl}px` }}
      >
        {node.name}
      </div>
      {node.childMgs.map(child => (
        <TechnicalTreeNode key={child.id} node={child} depth={depth + 1} mgHidden={hidden} />
      ))}
      {node.subs.map(sub => (
        <label
          key={sub.id}
          className={`flex items-center gap-1.5 py-1 rounded mx-1 pr-2 ${
            hidden ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-800/60'
          }`}
          style={{ paddingLeft: `${subPl}px` }}
        >
          <input
            type="checkbox"
            disabled={hidden}
            checked={!deselectedSubIds.includes(sub.id)}
            onChange={() => toggleSub(sub.id)}
            className="w-3 h-3 accent-blue-500 flex-shrink-0"
          />
          <span className={`text-xs truncate ${hidden ? 'text-gray-700' : 'text-gray-400'}`}>
            {sub.name}
          </span>
        </label>
      ))}
    </div>
  )
}

function RegionFilterList() {
  const graphNodes          = useGraphStore(s => s.nodes)
  const deselectedRegionNames = useViewStore(s => s.deselectedRegionNames)
  const toggleRegion          = useViewStore(s => s.toggleRegion)

  const regionNames = useMemo(() => {
    const names = new Set<string>()
    for (const n of graphNodes) {
      if (n.type === ResourceType.Region) names.add(n.name)
    }
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [graphNodes])

  if (regionNames.length === 0) return null

  return (
    <div className="mt-1">
      {regionNames.map(name => (
        <label
          key={name}
          className="flex items-center gap-1.5 py-1 rounded mx-1 pr-2 cursor-pointer hover:bg-gray-800/60"
          style={{ paddingLeft: '12px' }}
        >
          <input
            type="checkbox"
            checked={!deselectedRegionNames.includes(name)}
            onChange={() => toggleRegion(name)}
            className="w-3 h-3 accent-blue-500 flex-shrink-0 cursor-pointer"
          />
          <span className="text-xs text-gray-400 truncate">{name}</span>
        </label>
      ))}
    </div>
  )
}

export function AppShell() {
  const graphNodes = useGraphStore(s => s.nodes)
  const graphEdges = useGraphStore(s => s.edges)

  const mgTree = useMemo(
    () => buildMgTree(graphNodes, graphEdges),
    [graphNodes, graphEdges],
  )

  return (
    <div className="h-screen flex bg-gray-950 text-gray-100">
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-800 flex-shrink-0">
          <span className="text-sm font-bold tracking-widest text-blue-400 uppercase">AzMap</span>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Dashboard */}
          <nav className="px-2 py-3">
            <NavItem to="/" label="Dashboard" />
          </nav>

          {/* Tenancy Topology */}
          <div className="border-t border-gray-800 px-2 pt-3 pb-2">
            <SectionHeader to="/tenancy" label="Tenancy Topology" />
            {mgTree.length > 0 && (
              <div className="mt-1">
                {mgTree.map(node => (
                  <TenancyTreeNode key={node.id} node={node} depth={0} />
                ))}
              </div>
            )}
          </div>

          {/* Technical Topology */}
          <div className="border-t border-gray-800 px-2 pt-3 pb-2">
            <SectionHeader to="/topology" label="Technical Topology" />
            {mgTree.some(n => n.hasAnySubs) && (
              <div className="mt-1">
                {mgTree.map(node => (
                  <TechnicalTreeNode key={node.id} node={node} depth={0} />
                ))}
              </div>
            )}
          </div>

          {/* Region filter */}
          <div className="border-t border-gray-800 px-2 pt-3 pb-2">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
              Regions
            </div>
            <RegionFilterList />
          </div>
        </div>

        <nav className="px-2 pb-4 space-y-1 border-t border-gray-800 pt-4 flex-shrink-0">
          {bottomNav.map(item => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="px-4 py-3 border-t border-gray-800 flex-shrink-0">
          <p className="text-xs text-gray-600">v0.0.1</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
