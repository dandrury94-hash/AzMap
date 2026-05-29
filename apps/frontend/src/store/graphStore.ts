import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GraphEdge, GraphNode } from '@azmap/shared'

/**
 * The complete shape of the global graph store.
 *
 * AzMap maintains exactly one canonical resource graph at a time (ADR-001:
 * Single Source of Truth). All pages and panels read from this store rather
 * than maintaining their own copies of topology data.
 *
 * State fields:
 *
 * - `nodes` / `edges` — the normalized resource graph produced by
 *   jsonNormalizer. These are the canonical records; nothing in the UI
 *   should recompute or modify them.
 *
 * - `sourceLabel` — name of the most recently imported file.
 *
 * - `importedAt` — Unix timestamp (ms) of the last successful import. Stored
 *   as a number rather than Date so it survives localStorage JSON round-trips.
 *   Convert with `new Date(importedAt)` at the display layer. Null when empty.
 *
 * - `importCount` — number of files that have been merged into the current
 *   graph. Reset to 0 by clearGraph, set to 1 by setGraph, incremented by
 *   mergeGraph. Used by the UI to distinguish a single import from a layered
 *   multi-file graph.
 *
 * Why Zustand?
 *
 * Zustand was chosen over Redux or React Context for three reasons:
 *   1. Zero boilerplate — no action types, reducers, or dispatchers. The
 *      store state and mutations live together in one object.
 *   2. Selective subscriptions — components subscribe to exactly the slice
 *      they need (e.g. `useGraphStore(s => s.nodes)`), so a sourceLabel
 *      change does not re-render the topology canvas.
 *   3. Small bundle footprint with no peer dependencies beyond React.
 */
interface GraphState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  sourceLabel: string | null
  importedAt: number | null
  importCount: number

  /**
   * Replace the entire graph with new content.
   *
   * Full replacement — discards all previous topology. Use when starting
   * from scratch. The Import page always uses mergeGraph instead; setGraph
   * is kept for programmatic resets.
   */
  setGraph: (nodes: GraphNode[], edges: GraphEdge[], sourceLabel: string) => void

  /**
   * Merge new nodes and edges into the existing graph.
   *
   * Nodes are upserted by ID (new data wins on conflict, so re-importing an
   * updated file refreshes stale records). Edges are also upserted by ID —
   * deterministic edge IDs mean duplicates are naturally deduplicated.
   *
   * This is the primary import action. The Settings clear button is the
   * escape hatch for starting fresh.
   */
  mergeGraph: (nodes: GraphNode[], edges: GraphEdge[], sourceLabel: string) => void

  /**
   * Reset the store to its empty initial state.
   */
  clearGraph: () => void
}

export const useGraphStore = create<GraphState>()(
  persist(
    (set) => ({
      nodes: [],
      edges: [],
      sourceLabel: null,
      importedAt: null,
      importCount: 0,
      setGraph: (nodes, edges, sourceLabel) =>
        set({ nodes, edges, sourceLabel, importedAt: Date.now(), importCount: 1 }),
      mergeGraph: (newNodes, newEdges, sourceLabel) =>
        set(state => {
          const nodeMap = new Map(state.nodes.map(n => [n.id, n]))
          for (const n of newNodes) nodeMap.set(n.id, n)
          const edgeMap = new Map(state.edges.map(e => [e.id, e]))
          for (const e of newEdges) edgeMap.set(e.id, e)
          return {
            nodes: Array.from(nodeMap.values()),
            edges: Array.from(edgeMap.values()),
            sourceLabel,
            importedAt: Date.now(),
            importCount: state.importCount + 1,
          }
        }),
      clearGraph: () =>
        set({ nodes: [], edges: [], sourceLabel: null, importedAt: null, importCount: 0 }),
    }),
    { name: 'azmap-graph' },
  ),
)
