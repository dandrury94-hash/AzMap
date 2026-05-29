import { create } from 'zustand'

/**
 * View-level filter state.
 *
 * Uses a "deselected" list rather than a "selected" list so that newly
 * imported subscriptions and management groups are automatically included
 * without requiring any store update — they are visible until explicitly
 * unchecked by the user.
 */
interface ViewState {
  /** Subscription node IDs (e.g. "sub-11111...") explicitly hidden in Technical Topology. */
  deselectedSubIds: string[]
  /** Management Group node IDs explicitly hidden in Tenancy Topology. */
  deselectedMgIds: string[]
  /** Region display names (e.g. "UK South") explicitly hidden across all subscriptions. */
  deselectedRegionNames: string[]

  toggleSub:    (id: string)   => void
  toggleMg:     (id: string)   => void
  toggleRegion: (name: string) => void
  isSubSelected:    (id: string)   => boolean
  isMgSelected:     (id: string)   => boolean
  isRegionSelected: (name: string) => boolean
}

export const useViewStore = create<ViewState>()((set, get) => ({
  deselectedSubIds:     [],
  deselectedMgIds:      [],
  deselectedRegionNames: [],

  toggleSub: (id) =>
    set(s => ({
      deselectedSubIds: s.deselectedSubIds.includes(id)
        ? s.deselectedSubIds.filter(x => x !== id)
        : [...s.deselectedSubIds, id],
    })),

  toggleMg: (id) =>
    set(s => ({
      deselectedMgIds: s.deselectedMgIds.includes(id)
        ? s.deselectedMgIds.filter(x => x !== id)
        : [...s.deselectedMgIds, id],
    })),

  toggleRegion: (name) =>
    set(s => ({
      deselectedRegionNames: s.deselectedRegionNames.includes(name)
        ? s.deselectedRegionNames.filter(x => x !== name)
        : [...s.deselectedRegionNames, name],
    })),

  isSubSelected:    (id)   => !get().deselectedSubIds.includes(id),
  isMgSelected:     (id)   => !get().deselectedMgIds.includes(id),
  isRegionSelected: (name) => !get().deselectedRegionNames.includes(name),
}))
