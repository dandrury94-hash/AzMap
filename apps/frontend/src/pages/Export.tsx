type ExportOption = {
  label: string
  description: string
  badge: string
  available: boolean
}

const options: ExportOption[] = [
  {
    label:       'AzMap Native (.azmap)',
    description: 'Save a complete graph snapshot for later re-import. Preserves all resources, relationships, and raw Azure payloads. Layout is recomputed on load.',
    badge:       'Round-trip',
    available:   false,
  },
  {
    label:       'PNG / SVG',
    description: 'Export the current topology canvas as a static image. Captures whatever projection is currently active.',
    badge:       'Image',
    available:   false,
  },
  {
    label:       'Draw.io (.drawio)',
    description: 'Export the topology as a Draw.io diagram file, compatible with diagrams.net and the Draw.io VS Code extension.',
    badge:       'Diagram',
    available:   false,
  },
  {
    label:       'Visio (.vsdx)',
    description: 'Export the topology as a Visio diagram for sharing with teams that use Microsoft Visio.',
    badge:       'Diagram',
    available:   false,
  },
  {
    label:       'Markdown',
    description: 'Generate a Markdown summary of the topology: resource inventory, relationships, and notable connections.',
    badge:       'Docs',
    available:   false,
  },
]

export function Export() {
  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      <h1 className="text-2xl font-semibold mb-1">Export</h1>
      <p className="text-sm text-gray-500 mb-8">
        Export your topology in various formats. Import data first to enable export options.
      </p>

      <div className="space-y-3 max-w-2xl">
        {options.map(opt => (
          <div
            key={opt.label}
            className="flex items-start justify-between gap-4 border border-gray-800 rounded-lg px-5 py-4 bg-gray-900"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-200">{opt.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">{opt.badge}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{opt.description}</p>
            </div>
            <button
              disabled
              className="flex-shrink-0 px-4 py-1.5 rounded text-xs font-medium bg-gray-800 text-gray-600 cursor-not-allowed"
            >
              Export
            </button>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-600">
        Export options become available once topology data has been imported.
      </p>
    </div>
  )
}
