import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraphStore } from '../store/graphStore'
import { normalizeJson } from '../import/jsonNormalizer'

const MAX_FILES = 10

type FileEntry  = { name: string; content: string }
type FileResult = { name: string; nodeCount: number; edgeCount: number }

type ImportState =
  | { status: 'idle' }
  | { status: 'selecting' }
  | { status: 'ready'; files: FileEntry[]; rejected: string[] }
  | { status: 'success'; results: FileResult[]; totalNodeCount: number; totalEdgeCount: number; importCount: number; warnings: string[]; log: string[] }

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = e => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsText(file)
  })
}

export function Import() {
  const [state, setState]   = useState<ImportState>({ status: 'idle' })
  const [dragging, setDragging] = useState(false)
  const mergeGraph    = useGraphStore(s => s.mergeGraph)
  const existingNodes = useGraphStore(s => s.nodes)
  const importCount   = useGraphStore(s => s.importCount)
  const navigate      = useNavigate()

  const dropZoneVisible = state.status === 'selecting' || state.status === 'ready'

  async function addFiles(incoming: File[]) {
    const accepted: File[] = []
    const rejected: string[] = []

    for (const f of incoming) {
      if (f.name.endsWith('.json') || f.name.endsWith('.azmap')) accepted.push(f)
      else rejected.push(f.name)
    }

    const current      = state.status === 'ready' ? state.files    : []
    const prevRejected = state.status === 'ready' ? state.rejected  : []
    const existing     = new Set(current.map(f => f.name))
    const toRead       = accepted.filter(f => !existing.has(f.name)).slice(0, MAX_FILES - current.length)

    const newEntries = await Promise.all(toRead.map(async f => ({ name: f.name, content: await readFileAsText(f) })))
    const all = [...current, ...newEntries].sort((a, b) => a.name.localeCompare(b.name))

    setState({ status: 'ready', files: all, rejected: [...prevRejected, ...rejected] })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function removeFile(name: string) {
    if (state.status !== 'ready') return
    const files = state.files.filter(f => f.name !== name)
    setState(files.length === 0 && state.rejected.length === 0
      ? { status: 'selecting' }
      : { ...state, files })
  }

  function handleImport() {
    if (state.status !== 'ready' || state.files.length === 0) return

    const results:  FileResult[] = []
    const warnings: string[]     = []
    const log:      string[]     = []
    const multi = state.files.length > 1

    for (const { name, content } of state.files) {
      try {
        const result = normalizeJson(content)
        mergeGraph(result.nodes, result.edges, name)
        results.push({ name, nodeCount: result.nodes.length, edgeCount: result.edges.length })
        for (const w of result.warnings) warnings.push(`${name}: ${w}`)
        if (log.length > 0) log.push('')
        if (multi) log.push(`── ${name}`)
        log.push(...result.log)
      } catch (err) {
        warnings.push(`${name}: ${(err as Error).message}`)
      }
    }

    const { nodes: totalNodes, edges: totalEdges, importCount: newCount } = useGraphStore.getState()
    setState({ status: 'success', results, totalNodeCount: totalNodes.length, totalEdgeCount: totalEdges.length, importCount: newCount, warnings, log })
  }

  function openDropZone()  { setState({ status: 'selecting' }) }
  function closeDropZone() { setState({ status: 'idle' }) }

  const canImport = state.status === 'ready' && state.files.length > 0
  const slotsLeft = MAX_FILES - (state.status === 'ready' ? state.files.length : 0)

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">Import</h1>
      <p className="text-sm text-gray-500 mb-8">
        Load Azure topology data from JSON exports, ARM templates, or Resource Graph results.
      </p>

      {/* ── Existing data banner ── */}
      {existingNodes.length > 0 && state.status !== 'success' && (
        <div className="mb-6 border border-blue-900 bg-blue-950/30 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-blue-300">
            {importCount} file{importCount !== 1 ? 's' : ''} loaded · {existingNodes.length} nodes in graph.
            New imports will be merged in.
          </p>
          <button onClick={() => navigate('/settings')} className="text-xs text-blue-500 hover:text-blue-300 transition-colors shrink-0">
            Clear in Settings
          </button>
        </div>
      )}

      {/* ── Import button row ── */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={dropZoneVisible ? closeDropZone : openDropZone}
          className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
        >
          Import
        </button>
        {state.status === 'success' && (
          <button onClick={openDropZone} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Import another
          </button>
        )}
        {dropZoneVisible && (
          <button onClick={closeDropZone} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Cancel
          </button>
        )}
      </div>

      {/* ── Drop zone ── */}
      {dropZoneVisible && (
        <div className="space-y-3 mb-6">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
              dragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <input id="file-input" type="file" accept=".json,.azmap" multiple className="hidden" onChange={handleFileInput} />
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-300 font-medium mb-1">
              {state.status === 'ready' ? 'Drop more files here, or click to add' : 'Drop files here, or click to browse'}
            </p>
            <p className="text-xs text-gray-500">
              Up to {MAX_FILES} files · .json (Azure export, ARM template) · .azmap (AzMap native)
            </p>
          </div>

          {/* ── File list ── */}
          {state.status === 'ready' && (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              {state.files.map(f => (
                <div key={f.name} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 last:border-b-0">
                  <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-gray-300 flex-1 truncate font-mono">{f.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); removeFile(f.name) }}
                    className="text-gray-700 hover:text-gray-400 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {state.rejected.length > 0 && state.rejected.map(name => (
                <div key={name} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 last:border-b-0 opacity-50">
                  <span className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-sm text-red-500 flex-1 truncate font-mono line-through">{name}</span>
                  <span className="text-xs text-red-700">unsupported type</span>
                </div>
              ))}

              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/50">
                <span className="text-xs text-gray-600">
                  {state.files.length} file{state.files.length !== 1 ? 's' : ''} selected
                  {slotsLeft > 0 && slotsLeft < MAX_FILES && ` · ${slotsLeft} more allowed`}
                  {slotsLeft === 0 && ` · limit reached`}
                </span>
                {existingNodes.length > 0 && (
                  <span className="text-xs text-blue-700">merging into {existingNodes.length} existing nodes</span>
                )}
              </div>
            </div>
          )}

          {/* ── Confirm buttons ── */}
          {canImport && (
            <div className="flex gap-3">
              <button
                onClick={handleImport}
                className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition-colors"
              >
                Import {state.status === 'ready' && state.files.length} {state.status === 'ready' && state.files.length === 1 ? 'file' : 'files'}
              </button>
              <button
                onClick={() => setState({ status: 'selecting' })}
                className="px-4 py-2 rounded border border-gray-700 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Success ── */}
      {state.status === 'success' && (
        <div className="space-y-4">
          <div className="border border-emerald-800 bg-emerald-950/30 rounded-lg px-5 py-4">
            <p className="text-sm text-emerald-300 font-medium mb-3">
              {state.results.length === 1 && state.importCount === 1 ? 'Import complete' : 'Merged into graph'}
            </p>
            <div className="space-y-1 mb-1">
              {state.results.map(r => (
                <div key={r.name} className="text-xs text-emerald-700 font-mono">
                  {r.name}
                  <span className="text-emerald-600 font-sans ml-2">· {r.nodeCount} nodes · {r.edgeCount} edges</span>
                </div>
              ))}
            </div>
            {(state.results.length > 1 || state.importCount > state.results.length) && (
              <div className="mt-3 pt-3 border-t border-emerald-900 text-xs text-emerald-600">
                Graph total: {state.totalNodeCount} nodes · {state.totalEdgeCount} edges · {state.importCount} files
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button onClick={() => navigate('/topology')} className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition-colors">
                View Topology
              </button>
              <button onClick={() => navigate('/')} className="px-4 py-1.5 rounded border border-gray-700 text-xs text-gray-400 hover:text-gray-200 transition-colors">
                Dashboard
              </button>
            </div>
          </div>

          {state.warnings.length > 0 && (
            <div className="border border-amber-800 bg-amber-950/30 rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-amber-400 mb-2">{state.warnings.length} warning{state.warnings.length !== 1 ? 's' : ''}</p>
              <ul className="space-y-1">
                {state.warnings.map((w, i) => <li key={i} className="text-xs text-amber-700">{w}</li>)}
              </ul>
            </div>
          )}

          {state.log.length > 0 && (
            <div className="border border-gray-800 rounded bg-gray-950">
              <div className="px-3 py-1.5 border-b border-gray-800">
                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-mono">Normalizer log</span>
              </div>
              <div className="px-3 py-2 space-y-0.5 max-h-64 overflow-y-auto">
                {state.log.map((line, i) => (
                  <p key={i} className={`font-mono text-[11px] leading-relaxed whitespace-pre ${
                    line.startsWith('──') ? 'text-gray-500 pt-1' : line.startsWith('  ') ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-10 pt-8 border-t border-gray-800">
        <p className="text-xs text-gray-600">
          See <button onClick={() => navigate('/tutorial')} className="text-gray-500 hover:text-gray-300 underline transition-colors">Tutorial</button> for how to export data from Azure.
        </p>
      </div>
    </div>
  )
}
