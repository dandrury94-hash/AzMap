import type { GraphNode } from '@azmap/shared'

type Props = {
  node: GraphNode | null
  onClose: () => void
}

export function NodeDetailPanel({ node, onClose }: Props) {
  if (!node) return null

  return (
    <div className="absolute top-0 right-0 h-full w-[420px] bg-gray-950 border-l border-gray-800 z-20 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">
            {node.type}
          </p>
          <p className="text-base font-semibold text-gray-100 truncate">{node.name}</p>
          {node.location && (
            <p className="text-xs text-gray-500 mt-0.5">{node.location}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-4 flex-shrink-0 text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none mt-0.5"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {/* Metadata quick-view */}
        {(node.resourceGroup || node.subscriptionId || node.metadata) && (
          <div className="px-5 py-4 border-b border-gray-800/60 space-y-1.5">
            {node.subscriptionId && <MetaRow label="Subscription" value={node.subscriptionId} />}
            {node.resourceGroup  && <MetaRow label="Resource Group" value={node.resourceGroup} />}
            {node.metadata && Object.entries(node.metadata).map(([k, v]) => (
              <MetaRow key={k} label={k} value={String(v)} />
            ))}
          </div>
        )}

        {/* Raw payload */}
        <div className="px-5 py-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
            Raw Payload
          </p>
          <pre className="text-[11px] text-gray-400 font-mono whitespace-pre-wrap break-all leading-relaxed">
            {node.rawPayload
              ? JSON.stringify(node.rawPayload, null, 2)
              : JSON.stringify(
                  { id: node.id, type: node.type, name: node.name,
                    subscriptionId: node.subscriptionId, location: node.location,
                    resourceGroup: node.resourceGroup, metadata: node.metadata },
                  null, 2
                )
            }
          </pre>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-gray-600 flex-shrink-0 w-28 truncate capitalize">{label}</span>
      <span className="text-gray-300 font-mono min-w-0 break-all">{value}</span>
    </div>
  )
}
