import { RelationshipType } from '@azmap/shared'
import { EDGE_META } from './toFlowElements'

const LEGEND_EDGES = (Object.values(RelationshipType) as RelationshipType[])
  .filter(t => t !== RelationshipType.Contains)

export function Legend({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute bottom-28 right-4 z-10 bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-56 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Legend</span>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-300 text-sm leading-none transition-colors"
          aria-label="Close legend"
        >
          ✕
        </button>
      </div>

      <div className="px-3 py-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-2">Relationships</p>
        <div className="space-y-1.5">
          {LEGEND_EDGES.map(t => {
            const meta = EDGE_META[t]
            return (
              <div key={t} className="flex items-center gap-2.5">
                <svg width="32" height="12" className="shrink-0">
                  <line
                    x1="2" y1="6" x2="30" y2="6"
                    stroke={meta.stroke}
                    strokeWidth="2"
                    strokeDasharray={meta.strokeDasharray}
                  />
                </svg>
                <span className="text-xs text-gray-400">{meta.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
