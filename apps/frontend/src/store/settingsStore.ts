import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { RelationshipType, ResourceType } from '@azmap/shared'

type SettingsState = {
  // ── Visibility ──────────────────────────────────────────────────────────────
  hiddenEdgeTypes:     RelationshipType[]
  hiddenResourceTypes: ResourceType[]

  // ── Layout ──────────────────────────────────────────────────────────────────
  chainLayoutEnabled: boolean
  maxChainDepth:      number   // 0 = unlimited
  maxLeafCols:        number   // columns in the remainder / non-chain grid

  // ── Actions ─────────────────────────────────────────────────────────────────
  toggleEdgeType(t: RelationshipType): void
  toggleResourceType(t: ResourceType): void
  setChainLayoutEnabled(v: boolean): void
  setMaxChainDepth(v: number): void
  setMaxLeafCols(v: number): void
  resetLayout(): void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      hiddenEdgeTypes:     [],
      hiddenResourceTypes: [],
      chainLayoutEnabled:  true,
      maxChainDepth:       0,
      maxLeafCols:         4,

      toggleEdgeType(t) {
        const cur = get().hiddenEdgeTypes
        set({ hiddenEdgeTypes: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] })
      },

      toggleResourceType(t) {
        const cur = get().hiddenResourceTypes
        set({ hiddenResourceTypes: cur.includes(t) ? cur.filter(x => x !== t) : [...cur, t] })
      },

      setChainLayoutEnabled(v) { set({ chainLayoutEnabled: v }) },
      setMaxChainDepth(v)      { set({ maxChainDepth: Math.max(0, v) }) },
      setMaxLeafCols(v)        { set({ maxLeafCols: Math.max(1, Math.min(8, v)) }) },

      resetLayout() {
        set({ chainLayoutEnabled: true, maxChainDepth: 0, maxLeafCols: 4 })
      },
    }),
    { name: 'azmap-settings' },
  ),
)
