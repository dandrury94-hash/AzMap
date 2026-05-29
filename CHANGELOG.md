# CHANGELOG.md — AzMap

Purpose:
Track meaningful architectural, engineering, governance, and implementation changes across the project.

This file acts as:
- engineering history
- architectural timeline
- session continuity
- implementation audit trail
- AI context preservation

Every meaningful change should be recorded here before work is considered complete.

---

# Entry Rules

Each entry should include:
- unique CHG number
- date
- concise title
- summary
- rationale
- affected files
- architectural impact
- validation/testing guidance
- follow-up work if relevant

---

# Entry Format

## CHG-XXX — YYYY-MM-DD — Short Title

### Summary
What changed.

### Why
Why the change was necessary.

### Files Affected
- `path/to/file`

### Architectural Impact
What systems, layers, or behaviors are affected.

### Validation
What should be verified or tested.

### Follow-Up Work
Optional future work or known next steps.

---

# Change History

## CHG-044 — 2026-05-21 — Relationship coverage: PrivateEndpoint service link, TrafficManager endpoints, RouteTable next-hop

### Summary
Three normalizer additions that close gaps in the relationship graph:

**PrivateEndpoint → target service (`extractNetworkRelationships`):**
The existing `PrivateEndpoint` case already emitted `ConnectedTo → Subnet` (subnet placement). It now also iterates `properties.privateLinkServiceConnections` and emits a `ConnectedTo` edge to each `privateLinkServiceId` — the PaaS resource being privately exposed (Key Vault, Storage Account, SQL Server, etc.). This makes the private endpoint's purpose visible in the graph rather than just its network placement.

**TrafficManagerProfile → endpoints (new case):**
New `TrafficManagerProfile` case in `extractNetworkRelationships`. Iterates `properties.endpoints` and emits a `RoutesTo` edge to each `targetResourceId` (App Service, Public IP, nested TM profile). Represents the DNS-based traffic routing relationship.

**RouteTable → VirtualAppliance next-hop (Pass 3):**
Route table routes reference next-hop resources by private IP address, not ARM ID. Three-part implementation:
1. `ipToNodeId: Map<string, string>` — new reverse-lookup map in normalizer scope
2. Pass 2 extended — NIC private IPs now also written to `ipToNodeId` alongside node metadata; new blocks extract private IPs from Azure Firewall, VPN Gateway, and ExpressRoute Gateway ipConfigurations into `ipToNodeId`
3. Pass 3 (new) — iterates route tables, finds routes with `nextHopType === 'VirtualAppliance'`, resolves `nextHopIpAddress` via `ipToNodeId`, emits `RoutesTo` edge if the target node exists

The existing `RoutesTo → Subnet` edges (subnet association) are unchanged.

### Why
Private endpoints are meaningless without knowing what service they expose — the subnet placement is structural detail, but the target service is the architectural fact. Traffic Manager endpoint targets represent the actual traffic routing path. Route table UDRs pointing to Azure Firewall are a critical security topology element — without this edge, the diagram cannot show that traffic is being forced through inspection.

### Files Affected
- `apps/frontend/src/import/jsonNormalizer.ts` — PrivateEndpoint case extended; TrafficManagerProfile case added; `ipToNodeId` map; Pass 2 AZFW/gateway IP extraction; Pass 3 route-table next-hop resolution

### Architectural Impact
All three additions follow the established Pass 1 / Pass 2 pattern: relationships that are ARM-ID-based go in Pass 1 (via `extractNetworkRelationships`); relationships that require other nodes to exist go in Pass 2 or later. Pass 3 is introduced here as the correct home for relationships that require a complete IP→node index, which cannot be built until all nodes and their IPs have been processed. This is a clean extension of the two-pass design — the ordering guarantee is: nodes first, cross-resource ARM edges second, IP-resolved edges third.

### Validation
- Import a resource export containing a Private Endpoint linked to a Key Vault or Storage Account → verify `ConnectedTo` edge appears from the endpoint to the service
- Import a resource export containing a Traffic Manager Profile with App Service endpoints → verify `RoutesTo` edges appear to each target
- Import a resource export containing a Route Table with a `0.0.0.0/0 → VirtualAppliance` UDR and an Azure Firewall whose private IP matches → verify `RoutesTo` edge from RouteTable to AzureFirewall node

---

## CHG-043 — 2026-05-21 — Combined test-data environment file

### Summary
Created `test-data/00-environment.json` — a single flat JSON array merging all 33 individual test-data files into one importable payload (156 resources). Alphabetical sort order of source files ensures deterministic output.

### Why
Testing the topology with the full environment required importing 33 files individually. A combined file allows a single drag-and-drop import to exercise the entire hub-spoke multi-subscription setup at once.

### Files Affected
- `test-data/00-environment.json` — new: 156-resource flat array

### Architectural Impact
None — test data only. The normalizer's `extractResources()` accepts any flat resource array regardless of how it was assembled.

### Validation
Import `00-environment.json` via the Import page; verify node/edge counts match the sum of individual file imports.

---

## CHG-042 — 2026-05-21 — Distinct edge color palette + HTML-layer edge label rendering

### Summary
**Color palette overhaul:** All edge types now use perceptually distinct colors. The previous palette had three types sharing the purple/violet family (`PeeredWith #8b5cf6`, `MG→Sub #7c3aed`, `MG→MG #4c1d95`), making them indistinguishable. `RoutesTo` (amber) and `FailsOverTo` (orange) were also close.

New assignments:
| Edge | Old | New |
|---|---|---|
| PeeredWith | `#8b5cf6` purple | `#06b6d4` cyan |
| FailsOverTo | `#f97316` orange | `#e879f9` fuchsia |
| MG→MG | `#4c1d95` dark-purple | `#4f46e5` indigo |
| MG→Sub | `#7c3aed` purple-dashed | `#818cf8` indigo-light-dashed |

**`RelationshipEdge` custom edge type (new):** Non-peering edges (`AttachedTo`, `ConnectedTo`, `SecuredBy`, `RoutesTo`, `DependsOn`, `FailsOverTo`) were previously rendered as React Flow's default edge type, which draws labels in SVG — behind the HTML node cards. `RelationshipEdge.tsx` wraps `BaseEdge` + `getBezierPath` for the path but renders its label via `EdgeLabelRenderer` (the HTML portal overlay). Labels now always appear in front of all node cards. All non-peering edges in `toFlowEdges` are assigned `type: 'relationshipEdge'`.

### Why
Edge type disambiguation is critical for interpreting topology diagrams. Purple-on-purple connections between peering and MG hierarchy were routinely confused. Edge labels being occluded by card backgrounds degraded readability.

### Files Affected
- `apps/frontend/src/topology/toFlowElements.ts` — new colors; `type: 'relationshipEdge'` on non-peering edges
- `apps/frontend/src/topology/mgLayout.ts` — MG→MG and MG→Sub stroke colors updated
- `apps/frontend/src/topology/MgBusEdge.tsx` — default stroke fallback updated to match
- `apps/frontend/src/topology/RelationshipEdge.tsx` — new: bezier edge with HTML label overlay
- `apps/frontend/src/pages/Topology.tsx` — `relationshipEdge` registered in `edgeTypes`

### Architectural Impact
`RelationshipEdge` follows the established pattern of custom edge components (`BusEdge`, `PeeringEdge`, `MgBusEdge`): it is a pure rendering component that receives canvas coordinates and data props, produces an SVG path + HTML label, and owns no graph state. Adding `type: 'relationshipEdge'` to `toFlowEdges` output is the single change needed to route all relationship edges through the new renderer.

### Validation
- Verify all 7 relationship types show distinct, clearly differentiable colors in the Legend overlay
- Verify edge labels appear above (in front of) container card backgrounds
- Verify animated edges (`ConnectedTo`) remain animated via the React Flow `animated` CSS class pass-through

---

## CHG-041 — 2026-05-21 — Per-peer VNet handles + canvas-level peering bus zone

### Summary
Two coordinated improvements to VNet peering edge routing that eliminate visual overlap and card-header intersection.

**Per-peer handles (`AzureContainer.tsx`, `toFlowElements.ts`, `Topology.tsx`):**
Previously all peering edges shared a single `id="peer"` handle at the center-top of each VNet, causing all lines to emerge from and terminate at the same pixel. Each VNet now renders one `(source + target)` handle pair per peer, spread evenly across the top edge. Handle IDs: `peer-src-{peerId}` / `peer-tgt-{peerId}`. `Topology.tsx` builds `vnetPeerMap` (vnetId → sorted peer list) from `subEdges` and post-processes `layoutNodes` to inject `peerIds` into each VNet node's data as `finalLayoutNodes`. `toFlowEdges` canonicalises peering direction (source < target by string sort), deduplicates, sorts by `(source, target)` for stable `laneIndex` assignment, and references the per-peer handle IDs.

**Canvas-level peering bus zone (`Topology.tsx`, `PeeringEdge.tsx`):**
Previously the peering bus Y was computed as `min(sourceY, targetY) − LIFT − laneIndex × STEP`, which placed buses just above the nearest VNet handle — inside the containing RG/region/swimlane card stack, causing the horizontal bus segments to intersect card headers.

The bus zone is now a dedicated strip between the MG section and the swimlane section. Layout:
- `peeringBusZoneHeight = PEER_BUS_PAD(28) × 2 + numPeeringEdges × PEER_LANE_STEP(16)` (zero when no peering edges)
- Swimlanes offset by `mgLayout.sectionHeight + peeringBusZoneHeight` instead of just `mgLayout.sectionHeight`
- Each peering edge receives `data.busY = peeringBusOriginY + laneIndex × PEER_LANE_STEP` — an absolute canvas coordinate guaranteed above all swimlane card content

`PeeringEdge.tsx` is simplified: reads `data.busY` directly, draws a clean ⊓-shaped path (tine up from source → horizontal bus at `busY` → tine down to target) with rounded corners. The vertical stacking special-case branch is removed.

### Why
The previous design had two related problems. (1) All peering edges converging on a single handle point was visually confusing and made the per-lane offset meaningless (all tines left from the same X). (2) Buses computed relative to handle Y positions could land inside enclosing card headers because the handles are deep in the card hierarchy. The canvas bus zone guarantees the horizontal segments are structurally outside all card content regardless of how deeply nested the VNets are.

### Files Affected
- `apps/frontend/src/topology/AzureContainer.tsx` — `peerIds?: string[]` added to data type; per-peer handle rendering replaces single `peer` handles
- `apps/frontend/src/topology/toFlowElements.ts` — canonical direction sort, laneIndex assignment, per-peer handle IDs
- `apps/frontend/src/topology/PeeringEdge.tsx` — simplified to read absolute `data.busY`; vertical branch removed
- `apps/frontend/src/pages/Topology.tsx` — `vnetPeerMap`, `finalLayoutNodes`, `numPeeringEdges`, `peeringBusZoneHeight`, `peeringBusOriginY`; swimlane offset updated; `layoutEdges` injects `busY`

### Architectural Impact
The peering bus zone follows the same pattern as the MG section height: a reserved vertical region on the canvas whose height is computed from graph data (number of peering pairs) and propagated to both the layout offset and the edge data. The `peeringBusOriginY` is the single source of truth for where buses run — neither `PeeringEdge` nor any other component re-derives it.

### Validation
- Import multi-subscription test data with VNet peering; verify peering edges in the bus zone above all card content
- Verify N peerings produce N distinct horizontal lanes (no overlap)
- Verify each VNet shows evenly-spaced handle dots across its top edge (one per peer)
- Verify deselecting all peering edges (Settings) collapses the bus zone (swimlanes move up)

---

## CHG-040 — 2026-05-20 — Hold-Ctrl pan mode

### Summary
Added a hold-Ctrl pan mode to the Topology canvas. While the Ctrl key is held, the cursor changes to a four-way arrow and dragging anywhere on the canvas (including over nodes) pans the viewport rather than selecting or moving nodes. Releasing Ctrl immediately restores normal interaction.

**Implementation:**
- `PanOverlay.tsx` — new: transparent absolute overlay inside the React Flow context (so `useReactFlow()` is available). `onMouseDown` tracks mouse delta and calls `setViewport` on each `mousemove`. `zIndex: 10` covers all nodes.
- `Topology.tsx` — `panMode` state driven by `keydown`/`keyup`/`blur` listeners on `'Control'`. `nodesDraggable={!panMode}` and `elementsSelectable={!panMode}` propagated to ReactFlow. Pan mode indicator badge (top-center, `pointer-events-none`) shows "Release Ctrl to exit" text. `{panMode && <PanOverlay />}` rendered as ReactFlow child.

### Why
The topology canvas can contain hundreds of nodes spread across a large canvas area. Hold-Ctrl pan gives users a quick way to navigate without switching tools, and is a familiar convention from drawing/CAD tools.

### Files Affected
- `apps/frontend/src/topology/PanOverlay.tsx` — new
- `apps/frontend/src/pages/Topology.tsx` — pan mode state, key listeners, overlay rendering, ReactFlow props

### Architectural Impact
`PanOverlay` must be rendered as a child of `<ReactFlow>` (not a sibling) so it can access `useReactFlow()`. This is a rendering-layer decision with no graph state involvement.

### Validation
- Hold Ctrl on Topology canvas — cursor changes to move cursor, drag pans the canvas
- Release Ctrl — normal node drag/select restored
- Ctrl+Tab away from the window (blur) — pan mode deactivates

---

## CHG-039 — 2026-05-20 — Settings panel: edge/resource visibility, layout controls, legend overlay

### Summary
Expanded the Settings page with three new functional sections and added a Legend overlay to the Topology canvas.

**Edge Visibility section (`Settings.tsx`):**
Checkbox list for all `RelationshipType` values (except `Contains`) with SVG line swatches showing each edge's color and dash pattern. Toggling a type hides/shows matching edges on the Topology canvas. State persisted in `settingsStore`.

**Resource Visibility section (`Settings.tsx`):**
Resources grouped by layer (Identity, Network, Security, Compute, etc.) with Show All / Hide All controls per group and a 2-column grid of individual type toggles. Organizational types (ManagementGroup, Subscription, Region, ResourceGroup) are excluded — hiding these would break the structural layout. State persisted in `settingsStore`.

**Layout Controls section (`Settings.tsx`):**
- Chain layout toggle (enable/disable the chain algorithm for RG leaf nodes)
- Max chain depth (number input, 0 = unlimited; disabled when chain off)
- Grid columns (max leaf columns when chain is off or nodes don't participate in chains)
- Reset to defaults button

**`EDGE_META` export (`toFlowElements.ts`):** The `EdgeMeta` type and `EDGE_META` record (stroke, strokeDasharray, label per RelationshipType) are now exported. Consumed by Settings (swatches), Legend (swatches), and the edge renderer itself.

**`settingsStore.ts` (new):** Zustand store with `persist` middleware (`azmap-settings` localStorage key). Holds: `hiddenEdgeTypes`, `hiddenResourceTypes`, `chainLayoutEnabled` (default true), `maxChainDepth` (default 0), `maxLeafCols` (default 4).

**Legend overlay (`Legend.tsx`, `Topology.tsx`):**
Floating card (bottom-right, `z-10`) showing all relationship types with SVG swatches. Toggled by a "Legend" button. Uses `EDGE_META` for consistent colors.

**`Topology.tsx` wiring:**
- `hiddenEdgeTypes` and `hiddenResourceTypes` filter `subEdges` and `hiddenNodeIds` respectively (with descendant cascade for hidden resources)
- `layoutConfig` memo passes `chainLayoutEnabled`, `maxChainDepth`, `maxLeafCols` to `buildContainerLayout`

### Why
The topology canvas can become hard to read in large environments. Filtering by edge type and resource type lets users focus on the relationships relevant to a specific analysis. The chain layout controls give users direct feedback on the layout algorithm. The legend is essential for interpreting edge colors on first use.

### Files Affected
- `apps/frontend/src/store/settingsStore.ts` — new
- `apps/frontend/src/topology/toFlowElements.ts` — exported `EdgeMeta`, `EDGE_META`
- `apps/frontend/src/topology/Legend.tsx` — new
- `apps/frontend/src/pages/Settings.tsx` — three new sections + imports
- `apps/frontend/src/pages/Topology.tsx` — settings subscriptions, filtering, layoutConfig, legend button

### Architectural Impact
`settingsStore` is a new Zustand store alongside `graphStore` and `viewStore`. It is purely a user-preference store — it never owns or derives topology truth. All filtering logic that uses settings lives in `Topology.tsx` (the consumer), not in the store itself.

### Validation
- Toggle "Secured By" off in Settings → red edges disappear from Topology
- Hide "Virtual Machine" resource type → VM nodes and their descendants disappear
- Disable chain layout → leaves revert to grid arrangement
- Legend button shows/hides the overlay correctly

---

## CHG-038 — 2026-05-20 — VNet-affinity column sort + chain layout for RG leaf nodes

### Summary
Two layout improvements to the Resource Group leaf section, addressing the "lines crossing everywhere" problem caused by unordered leaf nodes.

**VNet-affinity column bucketing (containerLayout.ts):**
Before arranging leaf nodes in the grid/chain section of an RG, leaves are sorted by: (1) primary — which VNet column they are most connected to (by counting non-Contains neighbor edges to subnets and mapping those to their parent VNet), (2) secondary — resource type tier (Networking < Compute < Data < Other). This clusters leaves that share a VNet into adjacent columns, shortening most edges and preventing them from crossing unrelated nodes.

**Chain layout within RGs (containerLayout.ts):**
For each RG, connected leaf nodes are arranged into left-to-right chains (depth-first spanning tree from the highest-priority anchor node). Priority order: VM/AKS/AppService → Firewall/VpnGateway/Bastion → NIC/PrivateEndpoint → PIP/NSG/RouteTable. The first child of any node is placed on the same row (horizontal edge), subsequent children stack below the parent (short vertical edges). Singletons and nodes that exceed `maxChainDepth` fall into a remainder grid section below the chains.

**LayoutConfig parameter:**
`buildContainerLayout` accepts an optional third `LayoutConfig` argument: `{ chainLayoutEnabled, maxChainDepth, maxLeafCols }`. Defaults preserve existing behavior when called without config.

### Why
A flat unsorted leaf grid in a resource group forces most edges to cross unrelated nodes. VNet-affinity sorting ensures NICs, VMs, and their subnets appear in the same column band. Chain layout makes the dominant relationship direction (VM → NIC → Subnet) horizontal and explicit, matching how network engineers think about attachment chains.

### Files Affected
- `apps/frontend/src/topology/containerLayout.ts` — VNet-affinity sort; chain pre-computation (`LeafChainLayout`, `rgLeafLayouts`); `dims()`/`layout()` updated to use chain placements; `LayoutConfig` export
- `apps/frontend/src/pages/Topology.tsx` — `layoutConfig` memo; `buildContainerLayout` called with config

### Architectural Impact
The layout engine remains a pure function of its input graph — no external state. VNet-affinity and chain ordering are derived entirely from `Contains` and non-Contains edges in the subgraph, consistent with the rule that rendering systems consume graph projections rather than re-deriving topology.

### Validation
- Import test environment; verify VM → NIC → Subnet chains appear left-to-right within RG leaf sections
- Verify nodes with shared VNet appear in adjacent columns (not interleaved with unrelated nodes)
- Disable chain layout in Settings → leaves revert to grid; re-enable → chains return
- Set maxChainDepth = 1 → chains truncate after one hop; remainder nodes appear in grid below

---

## CHG-037 — 2026-05-14 — Replace overlapping MG bus edges with shared-trunk MgBusEdge

### Summary
MG-to-subscription and MG-to-childMG connectors were visually messy because `mgLayout` emitted one `BusEdge` per child. Every edge in the same group shared the same `sourceX` and `forkY`, so the trunk segment (MG bottom → forkY) was drawn N times exactly on top of itself, producing a thick smeared line rather than a clear diagram.

**Root cause:** `BusEdge` is a point-to-point edge — it draws a complete path for each source→target pair. When N targets share the same source and forkY, the trunk overlap is unavoidable with that model.

**Fix — `MgBusEdge.tsx` (new file):** A multi-target edge component that renders the complete bus in a single pass:
- One trunk line: MG source handle → forkY
- One horizontal bus: `min(sourceX, ...subCxs)` to `max(sourceX, ...subCxs)` at forkY
- N tines: each target cx from forkY down to targetY, with an inline filled-triangle arrowhead (no `<marker>`/`<defs>` required)

All targets in a group share the same `targetY` (MG children are in the same depth row; subscriptions are all root-level swimlanes at the same y), so the canonical React Flow target provides the correct `targetY` for every tine.

**`mgLayout.ts`:** Both the MG→childMG loop and the MG→sub loop now emit one `mgBusEdge` per parent (not one per child). The canonical `target` is the first visible child so React Flow can handle hit-testing. The `data.subCxs` array carries all target x-centres. `MarkerType` import removed (no longer needed).

**`Topology.tsx`:** `mgBusEdge` registered in `edgeTypes`.

### Why
Individual `BusEdge` paths are correct for point-to-point connectors (MG→MG between different levels) but wrong for fan-out connectors where multiple targets share a common trunk. The `MgBusEdge` model directly represents the underlying topology: one parent, N children, one bus.

### Files Affected
- `apps/frontend/src/topology/MgBusEdge.tsx` — new file
- `apps/frontend/src/topology/mgLayout.ts` — one mgBusEdge per group, removed MarkerType import
- `apps/frontend/src/pages/Topology.tsx` — mgBusEdge registered in edgeTypes

### Architectural Impact
`BusEdge` remains in use for point-to-point edges that happen to share layout (e.g., future edges). `MgBusEdge` is the right abstraction for any fan-out connector where multiple targets share a single trunk. The pattern (pass all target x-centres in `data.subCxs`, canonical target for React Flow bookkeeping) is reusable for any future multi-target edge type.

### Validation
- Import test data (6 subs, 2 MGs); verify each MG shows exactly ONE trunk line from its bottom
- Verify the horizontal bus at subForkY spans from the leftmost to rightmost subscription for each MG
- Verify one arrowhead tine drops from the bus to each subscription top
- Verify MG→childMG connectors (Contoso Root → Production + DR) also show a single trunk with two tines

---

## CHG-036 — 2026-05-14 — Clean VNet peering edge routing (top-centre anchors, upward arch, dedup)

### Summary
VNet peering edges were messy: they connected at the node centre, overlapped when Azure's bi-directional peering produced two identical lines, and curved through sibling VNet containers.

Three coordinated fixes:

**Named top-centre handles on VNet containers (`AzureContainer.tsx`):** Two `id="peer"` handles (one `type="source"`, one `type="target"`) are added at `Position.Top, left: 50%` conditionally when `data.resourceType === ResourceType.VirtualNetwork`. All other container types are unaffected. These handles are the exclusive anchor points for peering edges.

**`PeeringEdge` custom edge type (`PeeringEdge.tsx`):** A new edge component that routes orthogonally upward rather than through the node space. From each endpoint the path rises vertically to a shared horizontal bus segment `LIFT=60px` above the nearer endpoint, then descends to the other. Rounded corners (r=5) match `BusEdge` styling. 60px clears the VNet header band (H=44) so the bus never re-enters a VNet body. For vertically-aligned VNets (same x) the path degenerates gracefully to a straight vertical line between the two tops.

**Bidirectional deduplication (`toFlowElements.ts`):** Azure always records peerings on both sides of a link, producing two `PeeredWith` edges (A→B and B→A). These rendered as two exactly overlapping lines. Now `toFlowEdges` normalises each pair to a single canonical edge by keeping only the first occurrence of each `{source, target}` sorted pair. Peering edges also receive `type: 'peeringEdge'`, `sourceHandle: 'peer'`, `targetHandle: 'peer'`.

**`Topology.tsx`:** Registers `peeringEdge` in the `edgeTypes` map.

### Why
The centre handle and default bezier routing made peering lines cut diagonally through VNet content and overlap when both sides of a peer relationship were present in the imported data. Clean top-centre routing and deduplication together produce unambiguous, non-overlapping arcs that stay outside VNet bounds.

### Files Affected
- `apps/frontend/src/topology/PeeringEdge.tsx` — new file
- `apps/frontend/src/topology/AzureContainer.tsx` — named peer handles for VirtualNetwork type
- `apps/frontend/src/topology/toFlowElements.ts` — PeeredWith deduplication + peeringEdge type
- `apps/frontend/src/pages/Topology.tsx` — peeringEdge registered in edgeTypes

### Architectural Impact
`PeeringEdge` follows the same pattern as `BusEdge`: a pure SVG path component that receives absolute canvas coordinates from React Flow and draws its own routing. The `sourceHandle`/`targetHandle` IDs create a named protocol between `AzureContainer` and `toFlowElements` — peering edges must always land on `id="peer"` handles, not the default centre handle.

### Validation
- Import test data; verify hub↔spoke-app and hub↔spoke-data show exactly two peering arcs (not four)
- Verify each arc exits from the top-centre of both VNet headers, not the card centre
- Verify the horizontal bus segment is above both VNet top edges (not through VNet content)
- Verify cross-subscription peering (if present) routes cleanly between swimlanes

---

## CHG-035 — 2026-05-14 — Icon overflow fix; region fill-to-swimlane; 6-subscription test data

### Summary
Three improvements to the Technical Topology view:

**Icon clipping fix (AzureSwimLane.tsx):** The subscription icon was being visually cut off in the label strip. Root cause: `overflow` was left at browser default on the outer swimlane container and the strip element; any ancestor applying `overflow: hidden` (including React Flow's node wrapper in certain rendering contexts) clipped the SVG art. Fix: add explicit `overflow: 'visible'` to both the outer card div and the strip container. Icon container height increased from 20 → 24px and icon size bumped from `size="16"` → `size="18"` to give the SVG viewBox adequate room.

**Region columns fill swimlane height (containerLayout.ts):** When `minSwimLaneH` raised a swimlane above its content height, region columns retained their original computed height, leaving empty space below the last region at the swimlane bottom. Fix: after computing the final swimlane height (`swimH = max(contentH, minSwimLaneH)`), mutate the `sizeCache` entry for each region-column child so its height becomes `swimH + 2 × REGION_OVERHANG`. The `layout()` pass then reads the updated dimensions and the region perfectly spans the swimlane with symmetric overhang top and bottom.

**Extended test data (6 subs, 3 regions, 2 MGs):** Added four new subscriptions to the dummy dataset so the topology canvas shows the intended multi-region layout:
- Contoso Production MG → Sub 1111 (UK South) · Sub 3333 (UK West) · Sub 5555 (Japan East)
- Contoso DR MG → Sub 2222 (UK West) · Sub 4444 (UK South) · Sub 6666 (Japan East)

### Why
The icon clipping was a persistent rendering artefact that survived the overflow:hidden removal in CHG-034 because the outer container also needed overflow:visible to prevent clipping by any outer context. The region fill gap was a logical gap in the `dims()` pass: the sizeCache update that enforces swimlane-height-clamped region dimensions was only applied when the swimlane size was driven by content; the minimum-height path bypassed it. The test-data expansion enables visual validation of the multi-region multi-MG layout that the CHG-033/034 layout engine was built to handle.

### Files Affected
- `apps/frontend/src/topology/AzureSwimLane.tsx` — `overflow: 'visible'` on outer div and strip; icon container 20 → 24px; icon size 16 → 18
- `apps/frontend/src/topology/containerLayout.ts` — `dims()` swimlane section: post-swimH region sizeCache expansion
- `test-data/01-management-groups.json` — added 4 subscription→MG assignments (subs 3333, 4444, 5555, 6666)
- `test-data/02-subscriptions.json` — added 4 subscription entries
- `test-data/03-resource-groups.json` — added resource groups for the 4 new subscriptions (ukwest, uksouth, japaneast)

### Architectural Impact
The `sizeCache` mutation in `dims()` is a deliberate post-pass size patch: `dims()` is normally pure (bottom-up, memoised), but the swimlane pass has enough information to resize its region children after the fact. This is a contained exception — the only place a swimlane parent overrides a child's cached size. The effect flows correctly because `layout()` re-reads from `sizeCache` after all `dims()` calls.

### Validation
- Import all test data files in sequence; verify 6 subscription swimlanes appear
- Verify Contoso Production MG has connectors to subs 1111, 3333, 5555 and Contoso DR to 2222, 4444, 6666
- Verify region columns stretch to the full height of each swimlane (no gap below region bottom)
- Verify region columns overhang symmetrically above and below the swimlane border
- Verify the subscription icon is fully visible in the label strip (not clipped at any edge)

---

## CHG-034 — 2026-05-14 — Fix child-node double-shift; swimlane strip and RG sizing

### Summary
Fixed four layout/rendering issues visible in Technical Topology.

**Primary bug — child node double-shift:** `offsetSubLayout` was shifting ALL nodes in `rawSubLayout` by `sectionHeight`, including child nodes (regions, RGs) that already have `parentId` set. Because React Flow positions children relative to their parent's canvas position, the shift was being applied twice — once via the parent being moved, and again directly on the child's stored position. This caused regions and resource groups to appear far below the subscription swimlanes. Fix: only shift nodes where `parentId` is `undefined` (root-level swimlane nodes); children follow the parent automatically.

**Swimlane strip overflow:** The subscription strip stacked icon + type label + full subscription name in `justify-center`. Long UUIDs as subscription names made the total content height exceed the swimlane height, clipping the icon at the top. Fix: pin icon at the top with `flex-shrink-0`, give the type label a `flex-1 min-h-0 overflow-hidden` section, and show the subscription name in a capped bottom section at 8px font.

**Container name overflow:** `AzureContainer` header did not truncate the resource name, so long names overflowed. Fix: add `truncate min-w-0` to the name span and `flex-shrink-0` to non-truncatable elements.

**Resource group column width:** `EMPTY_W = 130` gave resource groups only 202px total width — not enough to display "RESOURCE GROUP" + a typical name without overflow. Increased to `EMPTY_W = 200` (272px total), which gives ~116px for the name text.

### Why
`offsetSubLayout` was written before the subscription canvas had child nodes. Once regions and resource groups were nested inside swimlanes via `parentId`, the blanket y-shift broke the parent-relative positioning model.

### Files Affected
- `apps/frontend/src/pages/Topology.tsx` — `offsetSubLayout` only shifts root nodes
- `apps/frontend/src/topology/AzureSwimLane.tsx` — strip layout redesigned (icon pinned top)
- `apps/frontend/src/topology/AzureContainer.tsx` — `truncate min-w-0` on resource name span
- `apps/frontend/src/topology/containerLayout.ts` — `EMPTY_W` 130 → 200

### Architectural Impact
`offsetSubLayout` now correctly handles the parent-relative coordinate model that React Flow uses for nested nodes. This is the correct pattern going forward: any vertical offset applied to root swimlanes will automatically propagate to all descendants without needing to touch child node positions.

### Validation
- Import dataset with MGs, subscriptions (including long UUID names), regions, and RGs
- Verify regions visually intersect top and bottom of subscription swimlane borders
- Verify RG cards appear inside the region column (not floating below the canvas)
- Verify subscription strip icon is always visible (not clipped)
- Verify long subscription UUID names are shown at small font, not overflowing
- Verify RG names truncate cleanly within their card

---

## CHG-033 — 2026-05-14 — Bus-and-fork orthogonal MG connectors with dynamic centring

### Summary
Replaced the fixed subtree-width MG layout algorithm with a two-pass bus-and-fork routing system. MG nodes are now dynamically centred over the actual x-positions of their subscription swimlane descendants, and all MG→childMG and MG→Subscription connectors are drawn as orthogonal bus-and-fork paths using a new custom React Flow edge type (`BusEdge`).

The layout is two-pass: `buildContainerLayout` runs first to establish subscription swimlane positions, then `buildMgCanvasLayout` derives MG x-centres bottom-up from the actual swimlane centres. This ensures MG nodes sit precisely over their subscription clusters regardless of natural swimlane widths.

MG→childMG edges fork at the midpoint between the parent row's bottom and the child row's top. MG→Subscription edges all fork at a shared level — the midpoint of the `PAD_BELOW` gap — so connectors to subs converge neatly without crossing at different heights. MG nodes with no visible subscription descendants (orphaned) are omitted from the canvas since they have no position to derive.

### Why
Previous `straight` edge type produced unique paths but diagonal lines. Bus-and-fork routing (orthogonal with small rounded corners) is significantly easier to trace visually — the horizontal fork bus makes the parent–child relationship readable at a glance even when many subscriptions are involved.

### Files Affected
- `apps/frontend/src/topology/BusEdge.tsx` — new custom React Flow edge component
- `apps/frontend/src/topology/mgLayout.ts` — complete rewrite: two-pass layout, `subCentres` input, BusEdge emission
- `apps/frontend/src/pages/Topology.tsx` — reordered memos (`rawSubLayout` → `subCentres` → `mgLayout`), added `edgeTypes`, wired `BusEdge`

### Architectural Impact
`buildMgCanvasLayout` now accepts `Map<string, number>` (sub id → x-centre) instead of `Set<string>` (hidden sub ids). The subscription layout is always computed before the MG layout. The `hiddenNodeIds` set is still used for filtering `subNodes` and `subEdges`; the `subCentres` map implicitly encodes visibility (absent entries = hidden).

### Validation
- Import an Azure dataset with MGs, subscriptions, RGs
- Verify MG org-chart nodes appear horizontally centred over their subscription swimlanes
- Verify MG→childMG connectors fork orthogonally between the two MG rows
- Verify MG→Subscription "Child of" connectors route orthogonally to the PAD_BELOW gap, then drop into the swimlane top
- Deselect MGs in sidebar — verify orphaned MG nodes (all subs hidden) are omitted from canvas
- Deselect individual subscriptions — verify MG nodes re-centre over remaining visible subs

### Follow-Up Work
- Cross-row bus routing (when a single MG has so many subs they wrap into a grid, the MG→Sub edges need to route to both rows)
- Larger `REGION_OVERHANG` so region columns protrude more clearly above/below swimlane borders

---

## CHG-032 — 2026-05-14 — Dynamic canvas layout; subscription greying with state memory

### Summary
**Horizontal subscription layout** — Subscription swimlanes now sit side-by-side horizontally instead of stacking vertically. With the MG org chart above and "Child of" edges below, horizontal arrangement means edges can drop roughly straight down to the correct swimlane rather than passing diagonally over siblings.

**Subscription ordering by MG tree** — Before calling `buildContainerLayout`, `Topology.tsx` sorts subscription nodes in MG tree left-to-right order (DFS: children before current node's subs). This matches the left-to-right order of MG nodes in the org chart so "Child of" edges have short paths.

**Smaller layout constants** — Reduced `EMPTY_W` (240→130), `EMPTY_H` (100→44), `P` (48→36), `G` (32→24), `REGION_OVERHANG` (36→28), `ROOT_GAP` (G×4→G×2), `MAX_CONT_COLS` (3→2). Empty containers (RGs with no resources) are compact; subscriptions with a few RGs are narrow enough to show clearly side-by-side.

**MG cleanup in containerLayout** — Removed `ManagementGroup` from `SWIMLANE_TYPES`. MG nodes are now filtered before `buildContainerLayout` runs (`Topology.tsx`) so the type set reflects actual inputs.

**Subscription greying with state memory** — When a parent MG is deselected in the Tenancy sidebar, its subscription checkboxes in the Technical section are greyed out and disabled (cannot be clicked while the MG is hidden). Crucially, `deselectedSubIds` is *not* modified — the individual subscription selections are preserved. When the MG is re-checked, all subscriptions reappear in exactly the same checked/unchecked state they were in before the MG was toggled. The `mgHidden` prop propagates down the `TechnicalTreeNode` tree so multi-level ancestors are handled correctly.

### Files Affected
- `apps/frontend/src/topology/containerLayout.ts` — layout constants; horizontal root arrangement; MG removed from SWIMLANE_TYPES
- `apps/frontend/src/pages/Topology.tsx` — subscription ordering by MG tree before layout
- `apps/frontend/src/layout/AppShell.tsx` — `TechnicalTreeNode` greying via `mgHidden` prop

### Validation
1. Import data with MGs, subs, and RGs. Navigate to Technical Topology — subscriptions should appear side-by-side with compact RG containers inside.
2. Deselect a parent MG in the Tenancy sidebar — its subscription checkboxes in the Technical section become greyed out and unclickable.
3. Deselect one subscription explicitly (within a visible MG) so 3 of 4 are selected.
4. Deselect the parent MG — all 4 subscription swimlanes disappear.
5. Re-check the parent MG — the same 3 subscriptions reappear; the one that was manually unchecked remains hidden.

---

## CHG-031 — 2026-05-14 — MG org chart integrated into Technical Topology canvas; Tenancy Topology aligned

### Summary
**MG hierarchy inside the React Flow canvas** — Management Group nodes now appear as a dedicated org-chart section at the top of the Technical Topology canvas. `AzureMgNode` is a new compact React Flow node type (violet accent matching the MG colour from `nodeConfig`). Positions are computed by `buildMgCanvasLayout` using a subtree-width algorithm (no third-party layout library) so sibling subtrees never overlap regardless of how deep or wide the tree is.

**MG swimlane cards removed from the canvas** — Previously `ManagementGroup` was in `SWIMLANE_TYPES`, so MG nodes rendered as full vertical swimlane containers. They are now excluded from the subscription canvas: both MG nodes and MG-source `Contains` edges are stripped before `buildContainerLayout` runs. Subscription swimlanes are no longer nested inside MG swimlanes.

**"Child of" edges** — `buildMgCanvasLayout` emits two kinds of edges: solid violet MG→childMG connector edges (showing the hierarchy within the org chart), and dashed violet MG→Subscription edges labelled "Child of" (connecting the org-chart tier to the swimlane tier). Subscription swimlane nodes are offset downward by `mgLayout.sectionHeight` so they sit below the org chart.

**Unified filtering still applies** — Deselecting an MG removes its card from the org chart and suppresses its "Child of" edges; the hidden-node traversal (`hiddenNodeIds`) still collects all descendant subscription and resource IDs so the swimlane section is simultaneously emptied.

**Tenancy Topology aligned** — The `/tenancy` page now uses the shared `MgHierarchy` HTML component (same bracket/card styling as `AzureMgNode`) so both views are visually consistent.

**CAF/WAF overlay readiness** — The two-tier canvas structure (MG org chart tier + swimlane tier) provides a natural insertion point for future CAF/WAF annotation layers between or alongside either tier.

### Files Affected
- `apps/frontend/src/topology/AzureMgNode.tsx` — NEW: compact React Flow node for MG cards
- `apps/frontend/src/topology/mgLayout.ts` — NEW: subtree-width tree layout + edge generation
- `apps/frontend/src/pages/Topology.tsx` — integrated MG layout; excluded MG nodes/edges from sub canvas
- `apps/frontend/src/pages/TenancyTopology.tsx` — uses shared `MgHierarchy` component

### Validation
1. Import test data; navigate to Technical Topology — MG org chart appears above subscription swimlanes with violet "Child of" dashed edges connecting MG nodes to their subscription swimlanes.
2. Uncheck an MG in the sidebar — its org-chart card disappears; its "Child of" edges disappear; its subscription swimlanes disappear.
3. Navigate to Tenancy Topology — same bracket-style org chart with identical card styling.

---

## CHG-030 — 2026-05-14 — MG hierarchy header in Technical Topology; unified MG+sub filtering

### Summary
**Management Group org chart at top of Technical Topology** — The Technical Topology page (`/topology`) now displays the MG hierarchy as an org-chart header above the subscription canvas. Nodes are small cards; parent→child relationships are drawn with a bracket connector (horizontal bar + vertical drops, built with inline CSS borders — no SVG measurement or third-party layout library). The org chart section is horizontally scrollable for deep hierarchies.

**Unified MG + subscription filtering** — The `hiddenNodeIds` computation in `Topology.tsx` now starts traversal from both `deselectedSubIds` (sidebar Technical section) and `deselectedMgIds` (sidebar Tenancy section). Selecting a management group in the sidebar removes its org-chart card AND hides all subscription swimlanes beneath it from the React Flow canvas. A single `collect()` DFS function handles both starting points — no duplicate logic.

**Layout restructured for future CAF/WAF overlays** — `Topology` now renders as `flex flex-col`. The MG header occupies `flex-shrink-0` at the top; the canvas is `flex-1 min-h-0` below. This vertical stack makes it straightforward to insert a CAF/WAF annotation layer between or alongside either zone without restructuring the page.

**`OrgNode` filtering at parent level** — Each `OrgNode` filters `visibleChildren` before rendering the bracket, so the `first`/`last` indices are always correct regardless of which children are deselected. Deselecting a child MG removes it from the bracket without corrupting the connector geometry of remaining siblings.

### Files Affected
- `apps/frontend/src/topology/MgHierarchy.tsx` — NEW: org-chart component, used by Topology page
- `apps/frontend/src/pages/Topology.tsx` — restructured layout, unified filtering

### Architectural Impact
The Tenancy sidebar section now controls both the MG org-chart header and the subscription canvas simultaneously. A single store slice (`deselectedMgIds`) drives both visual zones, consistent with the single-source-of-truth principle. The canvas does not independently re-derive MG membership.

### Validation
1. Import test data with MG structure; navigate to Technical Topology — MG org chart should appear above the canvas.
2. Uncheck a parent MG in the sidebar — its card disappears from the org chart and its subscription swimlanes disappear from the canvas.
3. Re-check — org chart and swimlanes return.
4. Uncheck a single subscription in the Technical section — only that swimlane hides; org chart is unaffected.

---

## CHG-029 — 2026-05-12 — Tenancy Topology: pure HTML tree layout; fix MG visibility toggle

### Summary
Two improvements to the Tenancy Topology view:

**Layout redesign** — Replaced the nested-card layout with a recursive HTML/CSS tree. MGs are rendered with a small hexagon SVG icon and a vertical connecting line (`border-l border-gray-700`) that ties all children visually to their parent. Subscriptions appear as leaf nodes with a square icon. Root MGs use `text-blue-200`; child MGs and subscriptions use progressively lighter grays. No third-party layout library required — the tree is pure JSX that React renders synchronously.

**MG visibility fix** — `TenancyTopology` subscribes to `deselectedMgIds` from `viewStore` and passes it as a plain prop to each `MgNode`. The component simply returns `null` if its own ID is in the list. Because this is standard React prop-driven rendering (not React Flow's internal canvas state), it is fully reactive — any store change triggers an immediate re-render.

**Why not React Flow?** — React Flow v12 in uncontrolled mode (no `onNodesChange`) initialises its canvas from the first `nodes` prop value and ignores subsequent prop changes. A `useMemo` recompute does not propagate through React Flow's internal state layer. The Tenancy Topology view does not need pan/zoom or node interaction, so a plain HTML tree is the correct tool — simpler, lighter, and always reactive.

**Sidebar checkbox reactivity fix** — `TenancyTreeNode` and `TechnicalTreeNode` in `AppShell` were calling `useViewStore(s => s.isMgSelected)` and `useViewStore(s => s.isSubSelected)`, which return stable function references that never change — so Zustand never triggered a re-render. Fixed by subscribing to the raw arrays (`s.deselectedMgIds`, `s.deselectedSubIds`) and computing the checked state inline (`!deselectedMgIds.includes(node.id)`).

### Files Affected
- `apps/frontend/src/pages/TenancyTopology.tsx` — rewritten: pure HTML recursive tree, prop-driven MG filtering
- `apps/frontend/src/layout/AppShell.tsx` — fixed: subscribe to raw arrays instead of stable function refs

### Architectural Impact
`MgNode` is a pure presentation component: it receives `deselectedMgIds` as a prop and never touches the store itself. All store access is confined to the page-level `TenancyTopology` component, consistent with the project rule that views are projections of canonical graph data. The visibility filter is applied at render time without introducing intermediate computed state.

### Validation
1. Import MG test data; navigate to Tenancy Topology — MGs and subs should appear as an indented tree with vertical connecting lines.
2. Uncheck an MG in the sidebar — that node and all its descendants (child MGs, subscriptions) disappear from the tree immediately.
3. Re-check the MG — full tree returns.
4. Navigate to Technical Topology and uncheck a subscription — swimlane and all children disappear from the canvas.

---

## CHG-028 — 2026-05-12 — Dual topology views: Tenancy Topology + Technical Topology with subscription filtering

### Summary
Split the single Topology view into two purpose-built views and restructured the sidebar to expose them:

**Tenancy Topology** (`/tenancy`) — New page showing the management group hierarchy as nested cards. Each MG card contains its child MG cards and subscription leaves. Sidebar checkboxes (using `deselectedMgIds` from `viewStore`) let the user show or hide individual MGs without affecting the Technical Topology.

**Technical Topology** (`/topology`) — The existing React Flow canvas, now with subscription filtering. Sidebar checkboxes (using `deselectedSubIds` from `viewStore`) hide entire subscription swimlanes, plus all their descendant nodes (regions, resource groups, resources). The overlay label changed from "Subscription Layout" to "Technical Topology" and shows a filtered node count when any subscriptions are hidden.

**Sidebar restructure** — The `AppShell` sidebar now has two labelled sections replacing the single "Topology" link:
- _Tenancy Topology_ — MG tree with checkboxes, indented by depth
- _Technical Topology_ — MG group headers (non-interactive) with subscription checkboxes below each

Both sections are NavLinks so the active section header highlights when on that route. The tree is only rendered when the graph contains MG/subscription data.

**Shared MG tree utility** — `mgTree.ts` was extracted as the single source of tree derivation logic. Both `AppShell` and `TenancyTopology` import `buildMgTree` and `MgTreeNode` from there, satisfying the no-duplicate-logic rule.

### Why
Managing large Azure environments means there are two distinct questions: "How is my org structured?" (tenancy) and "How is my networking laid out?" (technical). Merging both into one canvas forces users to scroll past irrelevant subscriptions to reach the one they care about. Separating the views and adding per-subscription toggles makes each purpose-fit and independently navigable.

### Files Affected
- `apps/frontend/src/topology/mgTree.ts` — new: `buildMgTree` + `MgTreeNode` type
- `apps/frontend/src/store/viewStore.ts` — new: deselected-list pattern for subs and MGs
- `apps/frontend/src/layout/AppShell.tsx` — rewritten: dual-section sidebar with MG tree
- `apps/frontend/src/pages/TenancyTopology.tsx` — new: nested MG card view
- `apps/frontend/src/pages/Topology.tsx` — updated: subscription filtering, label rename
- `apps/frontend/src/App.tsx` — added `/tenancy` route

### Architectural Impact
- **No duplicate logic**: `buildMgTree` is the canonical MG hierarchy derivation. Neither the sidebar nor the Tenancy page computes its own tree.
- **No business logic in UI**: `viewStore` holds only opaque ID lists; filtering logic (descendant collection via containment traversal) lives in `Topology.tsx` which is the consumer, not in the store.
- **Single source of truth preserved**: Both views read directly from `graphStore`. No intermediate state is introduced.
- **"Deselected" list pattern**: New imports auto-appear as selected (checked) without any store update, because the lists track what is hidden rather than what is shown.

### Validation
1. Import MG + subscription test data; navigate to Tenancy Topology — hierarchy should render as nested cards with subscription chips.
2. Uncheck an MG in the sidebar Tenancy section — corresponding card disappears from the Tenancy view; Technical Topology is unaffected.
3. Navigate to Technical Topology — subscription swimlanes visible.
4. Uncheck a subscription in the sidebar Technical section — that swimlane and all its child nodes disappear from the canvas; overlay shows filtered node count.
5. Re-check the subscription — full graph returns.
6. Import data with no MGs — sidebar shows section headers only, no tree items.

---

## CHG-027 — 2026-05-12 — Topology layout: grid wrapping for leaves and containers, vertical swimlane stacking

### Summary
Fixed three sources of the "everything in one long horizontal line" layout problem in the topology canvas:

1. **Root stacking** — Swimlane-type roots (Subscriptions, ManagementGroups) now stack vertically. Each subscription becomes a horizontal band, matching the standard Azure architecture diagram convention. Non-swimlane roots keep the original horizontal layout.

2. **Container kid wrapping** — Container children inside non-swimlane containers (resource groups inside a region column, subnets inside a VNet, etc.) now wrap into rows of at most `MAX_CONT_COLS = 3`. Previously they ran in a single unbounded horizontal row.

3. **Leaf node grid** — Leaf nodes inside any container now wrap into rows of at most `MAX_LEAF_COLS = 4`, with a `LEAF_ROW_GAP = 16px` gap between rows. Previously a resource group with 12 VMs produced a row 2800px wide.

Swimlane internals (regions within a subscription) are deliberately left as a single horizontal row — wrapping regions would break the symmetric `REGION_OVERHANG` protrusion that makes the region card visually extend above and below the subscription band.

### Why
All three issues stemmed from the layout functions using a simple cursor-advance pattern (`cx += width + G`) with no column limit. Adding a `chunk()` helper that splits arrays into fixed-width rows and updating both the `dims()` (size computation) and `layout()` (position assignment) functions in tandem to use it was the minimal correct fix.

### Files Affected
- `apps/frontend/src/topology/containerLayout.ts`

### Architectural Impact
Pure layout change — no store, normalizer, graph data, or React component changes. The layout function is a pure `(GraphNode[], GraphEdge[]) → Node[]` transform, so no other system is affected.

### Validation
1. Import multiple test files and open Topology — subscriptions should appear as stacked horizontal bands, not side by side.
2. A resource group with many resources should show a 4-column grid, not a single row.
3. A region with many resource groups should show rows of 3, not one long row.
4. VNet peering and NSG edges should remain correctly connected after the layout change.

---

## CHG-026 — 2026-05-12 — Multi-file import (up to 10 files)

### Summary
Import page now accepts up to 10 files per batch. Files can be dropped or browsed in any combination; the drop zone remains active while files are queued so you can add more before confirming. Each file is read asynchronously (Promise.all), then imported in order via the existing mergeGraph action. The success panel shows a per-file breakdown plus graph totals. The normalizer log sections each file with a `── filename` separator when more than one file was imported.

Removed the `error` ImportState variant — unsupported file types appear as struck-through entries in the file list, and per-file parse errors surface as prefixed warnings rather than aborting the entire batch.

### Files Affected
- `apps/frontend/src/pages/Import.tsx`

### Architectural Impact
No store or normalizer changes. The existing mergeGraph upsert-by-ID contract means importing the same file twice is still idempotent, and files within the batch are processed in sorted-name order for reproducibility.

### Validation
1. Select / drop 3 files — file list should show all 3 with individual remove buttons.
2. Remove one — list shrinks; "Import 2 files" button updates count.
3. Drop an unsupported file — appears struck-through as "unsupported type".
4. Try to add more than 10 files — only the first N to fill the limit are accepted.
5. Import — success panel shows one row per file plus graph totals; log has `── filename` separators.

---

## CHG-025 — 2026-05-12 — Import page: trigger-based drop zone layout

### Summary
Restructured the Import page so the drop zone is hidden by default and revealed only when the user clicks the Import button. Layout is now: Import button → drop zone (on click) → file confirm → normalizer log (below). Added a `selecting` state to the import state machine to represent "drop zone open, no file yet".

After a successful import, the success panel and normalizer log remain visible and an "Import another" link re-opens the drop zone without clearing the log.

### Why
The previous design showed the drop zone immediately as the page's main content, with no explicit trigger. Clicking Import now feels like an intentional action, and the log stays visible in a predictable position below the drop zone area.

### Files Affected
- `apps/frontend/src/pages/Import.tsx`

### Architectural Impact
Pure UI restructure — no store, normalizer, or graph data changes.

### Validation
1. Load Import page — only the Import button should be visible (no drop zone).
2. Click Import — drop zone appears below the button; Cancel link appears beside Import.
3. Drop or browse a file — file confirm panel replaces the drop zone.
4. Confirm import — success message + normalizer log appear below; "Import another" resets to drop zone.
5. Click Import again after success — drop zone re-appears above the now-visible log.

---

## CHG-024 — 2026-05-12 — Match management-group entities list export format; wire MG→sub hierarchy

### Summary
Updated `01-management-groups.json` to match the real output of `az account management-group entities list` — the only Azure CLI command that shows which subscriptions belong to which management group. The entities list returns a flat array of both MG and subscription entities with a `parent` field on each.

Updated `02-subscriptions.json` to match `az rest /subscriptions` (ARM REST API), which uses the correct type `Microsoft.Resources/subscriptions` and includes `displayName` and `state`.

Updated the normalizer to:
- Strip the `/providers/` prefix that the entities list adds to MG type strings before the type-map lookup.
- Add `/subscriptions` and `Microsoft.Resources/subscriptions` as recognised subscription type aliases.
- Extract `parent.id` from MG entries to create Contains edges for the MG→MG hierarchy.
- Extract `parent.id` from subscription entries to create Contains edges for MG→subscription placement.
- Prefer `displayName` over `name` for subscription node naming (in the entities list format, `name` is the GUID).

### Why
The previous test files had no way to express which subscription belongs to which management group. This is the most important piece of the Identity layer — without it, MG and subscription nodes float unconnected in the graph.

### Files Affected
- `test-data/01-management-groups.json`
- `test-data/02-subscriptions.json`
- `apps/frontend/src/import/jsonNormalizer.ts`

### Architectural Impact
The graph now captures the full Azure governance hierarchy from a single import: Tenant Root → Contoso Root → (Contoso Production → sub, Contoso DR → sub). Subsequent resource imports will merge into this pre-existing hierarchy skeleton via the existing `mergeGraph` upsert-by-ID logic.

### Validation
1. Import `01-management-groups.json` — should produce 6 nodes (4 MGs + 2 subs) and 5 Contains edges.
2. Import `02-subscriptions.json` after — should enrich the 2 sub nodes with display name and state; node count stays at 6.
3. Dashboard Identity layer should show Partial after step 1 (has both MGs and subs but no RGs yet), then remain Partial after step 2, then advance based on subsequent imports.

---

## CHG-023 — 2026-05-12 — Fix Identity layer status when only Management Groups are imported

### Summary
The Dashboard Identity layer showed "Pending" whenever no subscriptions were present, even when Management Groups had been successfully imported. This made it appear that MG imports silently failed.

The status logic was changed so that importing either MGs or subscriptions (but not both) shows "Partial", importing neither shows "Pending", and importing both shows "Ready".

### Why
The old logic `subscriptions.length === 0 ? 'pending' : ...` treated Management Groups as irrelevant to determining whether the Identity layer had started. In a layered import workflow where MGs are imported first, followed by subscriptions, the dashboard gave no visual confirmation that the MG import succeeded.

### Files Affected
- `apps/frontend/src/pages/Dashboard.tsx`

### Architectural Impact
Cosmetic only — no store, normalizer, or graph data changes. The fix is entirely within the `computeLayers` pure function which derives layer status from graph state.

### Validation
1. Import `01-management-groups.json` alone — Identity layer should show "Partial" with "3 Management Groups" count highlighted.
2. Then import `02-subscriptions.json` — Identity layer should advance to "Ready".
3. With nothing imported, Identity layer should show "Pending".

---

## CHG-022 — 2026-05-12 — Layered import via mergeGraph

### Summary
Added `mergeGraph` action to the graph store. Unlike `setGraph` (full replacement), `mergeGraph` upserts nodes and edges by ID into the existing graph — new data wins on conflict, duplicates are naturally deduplicated because IDs are deterministic. The Import page now always calls `mergeGraph`, making layered imports the default workflow. Added `importCount` to the store to track how many files have been merged. Import success screen shows file-level counts plus graph totals when `importCount > 1`. Import page shows a contextual banner ("X files loaded · Y nodes in graph") when data is already present. Settings Clear remains the escape hatch for starting fresh.

### Why
User needs to layer exports incrementally: Management Groups first, then Subscriptions, then Resource Groups, then full resource exports — each building on the last rather than replacing it.

### Files Affected
- `apps/frontend/src/store/graphStore.ts`
- `apps/frontend/src/pages/Import.tsx`
- `apps/frontend/src/pages/Dashboard.tsx`
- `apps/frontend/src/pages/Settings.tsx`

### Architectural Impact
`mergeGraph` is the new primary import action. `setGraph` is retained but no longer called by the UI. Node upsert semantics (new import wins) mean re-importing an updated file refreshes stale records without creating duplicates. The `importCount` field is the sole counter — no list of filenames stored, keeping the state shape simple.

### Validation
1. Import `01-management-groups.json` — confirm MG nodes appear in Dashboard raw graph panel.
2. Import `02-subscriptions.json` — confirm node count grows, import count shows "2 files".
3. Import `03-resource-groups.json` — node count grows further, "3 files" shown.
4. Import `04-vnets.json` — VNets + subnets added, total nodes increases.
5. Refresh browser — confirm all accumulated data persists (localStorage).
6. Settings → Clear — confirm everything resets, dashboard shows empty state.

---

## CHG-021 — 2026-05-12 — Fix normalizer to handle Azure CLI output format

### Summary
The normalizer was written assuming REST API format, where resource-specific fields (`subnets`, `ipConfigurations`, `networkProfile`, `firewallPolicy`, etc.) live under a `properties` key. Azure CLI output (`az network vnet list`, `az network nic list`, `az vm list`, etc.) places these fields at the root of the resource object with no `properties` wrapper. All relationship extraction and VNet subnet/peering extraction was silently skipped for CLI-format imports, producing 0 edges and 0 subnets.

Fix: pass `resource.properties ?? resource` as the props argument throughout Pass 1 and Pass 2, so both formats are handled without duplication.

Also added `ManagementGroup`, `Subscription`, and `ResourceGroup` to `AZURE_TYPE_MAP` with special-case handling in Pass 1: Management Groups are created at tenant scope (no hierarchy); Subscriptions and ResourceGroups enrich the existing synthetic node (same `sub-` / `rg-` ID format) so explicit imports merge cleanly with auto-created hierarchy nodes rather than duplicating them.

Restored test-data files 01-03 (management-groups, subscriptions, resource-groups). Subscriptions updated to use ARM path IDs (`/subscriptions/GUID`) so `parseAzureId` extracts the GUID correctly. Added 31-azure-firewalls.json, 32-firewall-policies.json, 33-bastion-hosts.json as new test data.

### Why
"Every upload saying 0 nodes 0 edges" — the test data uses CLI output format; the normalizer only handled REST API format.

### Files Affected
- `apps/frontend/src/import/jsonNormalizer.ts`
- `test-data/01-azure-firewalls.json` (new, replaces management-groups)
- `test-data/02-firewall-policies.json` (new, replaces subscriptions)
- `test-data/03-bastion-hosts.json` (new, replaces resource-groups)
- `test-data/01-management-groups.json` (deleted)
- `test-data/02-subscriptions.json` (deleted)
- `test-data/03-resource-groups.json` (deleted)

### Architectural Impact
No pipeline changes — same two-pass design. Property source is now resolved once per resource (`resource.properties ?? resource`) and passed through. Normalizer now correctly handles both REST API and CLI export formats.

### Validation
1. Import `04-vnets.json` — confirm subnets are created (log shows "Subnets extracted: N")
2. Import `11-nics.json` followed by a VNet file — confirm NIC→Subnet edges appear
3. Import `01-azure-firewalls.json` — confirm firewall node appears and DependsOn edge to policy is shown
4. Import `12-vms.json` after NICs — confirm VM→NIC AttachedTo edges appear in the raw graph panel

---

## CHG-020 — 2026-05-12 — Persist graph store to localStorage

### Summary
Added Zustand `persist` middleware to `graphStore.ts` so the imported topology survives page reloads. Changed `importedAt` from `Date` to `number` (epoch ms) to survive JSON serialization. Updated Dashboard to construct `new Date(importedAt)` at the display layer. Data is keyed under `azmap-graph` in localStorage.

### Why
After importing a file, navigating away and refreshing the browser reset all store state, leaving Dashboard and Topology showing empty/pending states. Without persistence the app is unusable across any navigation that causes a page reload.

### Files Affected
- `apps/frontend/src/store/graphStore.ts`
- `apps/frontend/src/pages/Dashboard.tsx`

### Architectural Impact
Store is now backed by localStorage. The `importedAt` type changed from `Date | null` to `number | null` — callers must use `new Date(importedAt)` to format. No business logic changes.

### Validation
1. Import a file — navigate to Dashboard, confirm layers show data.
2. Refresh the browser (F5) — confirm Dashboard still shows the imported data.
3. Go to Settings → clear data — confirm Dashboard returns to empty/pending state after refresh.
4. Import a second file — confirm it replaces the first (no accumulation).

---

## CHG-019 — 2026-05-12 — Add Data Management reset section to Settings

### Summary
Added a "Data Management" section to the Settings page, placed above the Resource Type Reference table. When a file has been imported the section shows the source label, import timestamp, and node count, with a two-step "Clear imported data" button that calls `clearGraph()`. When no data is loaded it shows an empty state with a link to the Import page.

### Why
After importing a file the topology graph state is held in the Zustand store. There was no UI mechanism to reset it, leaving the app stuck showing stale "Pending" states across all views.

### Files Affected
- `apps/frontend/src/pages/Settings.tsx`

### Architectural Impact
Reads from the canonical graph store (`nodes`, `sourceLabel`, `importedAt`) and calls the existing `clearGraph()` action — no new state or derived logic introduced. Consistent with the rule that the UI layer only projects and mutates the canonical graph.

### Validation
1. Import any file — visit Settings and confirm source label, timestamp, and node count are shown.
2. Click "Clear imported data" — confirm the two-step confirm appears.
3. Click "Yes, clear" — confirm the empty state renders with an "Import a file" link.
4. Clicking the link navigates to /import.
5. No data loaded on first visit — confirm empty state shown immediately.

---

## CHG-018 — 2026-05-12 — Add normalizer log panel to Import page

### Summary
Added a `log: string[]` field to `NormalizationResult`. The normalizer now collects per-type input counts, recognized/skipped counts, hierarchy node counts, subnet extraction count, and per-relationship-type edge counts during its two passes and returns them as structured log lines. The Import page renders these as a compact mono-font log panel below the success card.

### Why
After importing a file the UI only showed total node/edge counts. There was no visibility into what the normalizer did — which resource types it found, how many it skipped, how subnets were extracted, or how edges were distributed. This made debugging import issues (like test data not producing expected topology) opaque.

### Log format (per import)
```
Input: 3 resources · 3 recognised · 0 skipped
  Microsoft.Network/virtualNetworks × 3
Hierarchy: 2 sub · 2 region · 10 RG  |  Subnets extracted: 9
Nodes: 42  ·  Edges: 51
  contains × 22  ·  connectedTo × 12  ·  securedBy × 8  ·  peeredWith × 6  ·  ...
```
Indented lines render in a dimmer colour so top-level summary lines stand out.

### Affected Files
- `apps/frontend/src/import/jsonNormalizer.ts` — stats tracking in `addNode`/`addEdge`, type counting in Pass 1 loop, log builder before `return`
- `apps/frontend/src/pages/Import.tsx` — `log` added to success state variant; log panel rendered below success card

### Architectural Impact
None — read-only stats pass. No graph logic changes. Log is generated once at return time from counters accumulated during the existing two-pass loop.

### Validation
Import any test-data file → success card appears → log panel shows below with resource type breakdown and edge summary. Indented lines (type/edge details) are dimmer than summary lines.

---

## CHG-017 — 2026-05-12 — Add test-data folder with 30 realistic Azure JSON fixtures

### Summary
Created `test-data/` at repo root with 30 numbered JSON files covering the full topology exercised by the Quickstart script. Files mirror real `az` CLI output shapes and contain consistent cross-references throughout (ARM IDs, subnet refs, NIC refs, LB backend pool refs, PE linked-resource IDs).

### Topology
Two subscriptions: **Contoso Production** (`111...`) in UK South and **Contoso DR** (`222...`) in UK West.

Hub-spoke network: `vnet-hub` (10.0.0.0/16) peered to `vnet-spoke-app` (10.1.0.0/16) and `vnet-spoke-data` (10.2.0.0/16). DR subscription has `vnet-hub-dr` (10.10.0.0/16). Spokes use UDRs (udr-spoke-app) forcing all traffic via Azure Firewall at 10.0.2.4. NSGs applied to snet-web, snet-api, snet-sql, snet-mgmt.

### Normalizer paths exercised
- VNet → Subnet node creation (Pass 1, including embedded subnets from 4 VNets)
- VNet peering edges (hub → spoke-app, hub → spoke-data, spoke → hub return)
- NSG → subnet SecuredBy edges (4 NSGs, each with subnets + rules)
- Route Table → subnet RoutesTo edges (2 UDRs applied to 3 subnets)
- NIC → subnet ConnectedTo edges (6 NICs across both subscriptions)
- NIC → public IP edges (1 NIC with PIP)
- NIC → LB backend pool → LB AttachedTo edges (3 NICs on 2 LBs)
- VM → NIC AttachedTo edges (6 VMs referencing their NICs)
- AKS → subnet ConnectedTo edges (2 node pools on snet-aks)
- App Service → subnet VNet integration edges (2 apps on snet-appservice)
- App Service → App Service Plan DependsOn edges
- Private Endpoint → subnet ConnectedTo edges (4 PEs on snet-pe)
- Internal LB with private frontend IP (lb-internal on snet-api)
- vWAN → vHub Contains edges (2 hubs)
- vHub → spoke VNet connections (2 spoke connections)
- VPN Gateway → GatewaySubnet placement (2 gateways across subscriptions)
- VPN Gateway Connection → gateway references (IPsec + VNet2VNet)
- Recovery Services Vaults: Backup (rsv-backup, prod) and ASR (rsv-asr prod + rsv-dr-target in DR sub)

### Affected Files
- `test-data/` — new folder, 30 JSON files

### Validation
Import any individual file or all files into AzMap Import. Each file is a plain JSON array (raw az CLI format) accepted directly by `extractResources()`.

---

## CHG-016 — 2026-05-12 — Expand Quickstart script to cover all major Azure layers

### Summary
Rewrote `QS_PS` and `QS_BASH` in Tutorial.tsx to cover 20 resource types across all five core layers, up from the original 7 (which only covered the classic IaaS skeleton). Added full network core, security essentials, AKS, SQL Servers, App Services, and App Service Plans. Updated the Quickstart description to reflect scope and point to layer scripts for specialised resources.

### Why
The previous Quickstart only collected the classic IaaS stack (VMs, NICs, VNets, NSGs, Storage, Key Vaults). A modern Azure environment is predominantly PaaS — AKS, App Services, Private Endpoints, SQL Servers, and Managed Identities would all be absent from the graph after running the old script. The Quickstart is the first experience most users have; a sparse graph on first run would undersell AzMap's topology value.

Specialised resources (vWAN, vHub, Traffic Manager, ExpressRoute, Front Door, CDN, Analytics, BCP/DR) are intentionally excluded — they are environment-specific and covered by dedicated layer scripts.

### Affected Files
- `apps/frontend/src/pages/Tutorial.tsx` — `QS_PS`, `QS_BASH`, and `QuickStartContent` description

### Resource coverage added
**Network core:** Public IPs, Load Balancers, Application Gateways, NAT Gateways, Route Tables, DNS Zones, Private DNS Zones
**Security:** Private Endpoints, Managed Identities
**Compute:** AKS Clusters, SQL Servers
**App services:** App Service Plans, App Services (Web Apps + Function Apps)

### Architectural Impact
None — script content only. No graph logic changes.

### Validation
Open Tutorial → Quick Start Script → verify both PowerShell and Bash tabs render all 20 resource sections with correct az CLI commands.

---

## CHG-015 — 2026-05-12 — Fix horizontal overflow bug in Tutorial page

### Summary
Added `min-w-0` to the `<main>` element in AppShell.tsx and to the Tutorial root `<div>` to prevent flex items expanding past the viewport width when "Select all" was pressed in Tutorial script builder sections.

### Why
Flexbox `flex: 1` items have an implicit `min-width: auto`, meaning they expand to fit their widest child rather than being constrained by the available space. The constraint must propagate through the entire flex ancestor chain — a gap at any level allows horizontal overflow. The `<main>` wrapper (AppShell) and the Tutorial root div were both `flex-1` without `min-w-0`, so the inner code blocks could force the page wider than the viewport.

### Affected Files
- `apps/frontend/src/layout/AppShell.tsx` — added `min-w-0` to `<main>`
- `apps/frontend/src/pages/Tutorial.tsx` — added `min-w-0` to page root `<div>`

### Architectural Impact
None — pure CSS constraint correction. No logic changes.

### Validation
Load Tutorial page → select a layer tab → press "Select all" → verify cards remain within the viewport width with no horizontal scrollbar.

---

## CHG-014 — 2026-05-12 — Tutorial layer restructure, Microservices tab, and Settings resource type reference

### Summary

**Tutorial.tsx** — Complete restructure of the layer-based collector scripts. All checkboxes are now organized into named groups within each tab. Two new layer tabs added. Select/deselect all controls added per group and globally.

**Layer changes:**

| Layer | Before | After |
|---|---|---|
| Network Topology | 2 options (VNets, NICs) | 19 options across 5 groups (core, routing/DNS, traffic/CDN, hybrid connectivity, vWAN) |
| Security | 1 option (NSGs) | 9 options across 2 groups (network security + identity/secrets) |
| Compute & Workloads | 2 options (VMs, NICs) | 20 options across 5 groups (VMs, containers, platform compute, **storage**, **databases**) |
| Microservices | *(new)* | 13 options across 3 groups (app hosting, API & integration, messaging & events) |
| Analytics, AI & IoT | *(new)* | 14 options across 3 groups (analytics, AI & ML, IoT) |
| BCP / DR | 3 options | 4 options (added Recovery Services Vaults) |

Storage resources (`az storage account list`, `az netappfiles account list`) moved into Compute & Workloads under a dedicated Storage group, alongside a new Databases group covering SQL, CosmosDB, PostgreSQL, MySQL, MariaDB, Redis, and Synapse.

**Script generator refactor:** all per-subscription loops now use a `psSubLoop` / `bashSubLoop` generic builder fed by ordered command maps (`NET_PS_MAP`, `COMPUTE_PS_MAP`, etc.). Adding a new resource type to a layer now requires a single array entry — no generator function edit needed.

**Quick Start script** updated to include Storage Accounts and Key Vaults in addition to the original VMs/VNets/NSGs/NICs/RGs set.

**Settings.tsx** — Built from scratch. Contains a fully searchable and filterable resource type reference table covering all 90 ResourceType values:
- Columns: ResourceType enum value, Display Name, ARM Provider (derived), ARM Type, Notes
- Grouped by AzMap layer with color-coded section headers
- Layer filter buttons (click to isolate a layer, click again to clear)
- Search input filters across all columns simultaneously
- Synthetic types (Subscription, Region, ResourceGroup) and embedded types (Subnet) are clearly annotated with italicised ARM type and a notes field explaining how they are created

### Why
The flat checkbox lists in the original Tutorial were hard to navigate as the resource count grew past ~5 options per tab. Storage and databases were missing entirely from the Compute tab, meaning a user running the Compute script would not collect any storage or database resources. The Microservices and Analytics layers were completely absent. The Settings page was a placeholder — there was no way for a user to discover what resource types AzMap supports or which CLI commands collect them.

### Files Affected
- `apps/frontend/src/pages/Tutorial.tsx` — full rewrite
- `apps/frontend/src/pages/Settings.tsx` — full implementation (previously a stub)

### Architectural Impact
None — pure UI changes. The canonical graph and normalization pipeline are unchanged.

### Validation
- `pnpm typecheck` passes
- Open Tutorial → verify 7 layer tabs render in the nav (Identity, Network, Security, Compute, Microservices, Analytics AI & IoT, BCP DR)
- Open Compute & Workloads → verify 5 checkbox groups render (Virtual Machines, Containers, Platform Compute, Storage, Databases)
- Open Microservices → verify 3 groups (App Hosting, API & Integration, Messaging & Events)
- Toggle shell selector on one tab and navigate to another — verify selector state persists
- Click "Clear group" on Containers group → verify only that group's checkboxes deselect
- Open Settings → verify resource type table renders with 90 rows across 7 layer sections
- Type "microsoft.network" in Settings search → verify only Network + Security rows appear
- Click "Compute & Workloads" layer filter → verify table shows only Compute rows

---

## CHG-013 — 2026-05-12 — Comprehensive documentation sweep: types, normalizer, store, ADRs, and lessons

### Summary
Added full JSDoc documentation to every type definition, helper function, and public API in the core shared types and import pipeline. Also added two new architectural decision records and a set of new engineering lessons covering the normalizer design.

**Files documented:**

`packages/shared/src/types/relationships.ts` — Each `RelationshipType` value now has a JSDoc block explaining:
- The directional convention (source → target semantics)
- The Azure architectural meaning
- Concrete examples of which resources use the relationship type and why

`packages/shared/src/types/resources.ts` — The `ResourceType` enum now has a file-level doc block covering the stability contract (string values equal enum keys for serialization), the single-point-of-truth design (AZURE_TYPE_MAP is the only translation layer), and the compile-time exhaustiveness enforcement via `Record<ResourceType, NodeConfig>`. Each category group has a brief comment explaining what unifies those types.

`apps/frontend/src/store/graphStore.ts` — The `GraphState` interface is documented with the rationale for each field. `setGraph` explains full-replacement semantics (not merge). `clearGraph` explains its use cases. A comment above the `create()` call explains why Zustand was chosen (zero boilerplate, selective subscriptions, small bundle).

`apps/frontend/src/import/jsonNormalizer.ts` — Every function and type is documented:
- `AzureResource` — why the index signature is intentional
- `AzMapFile` — the native format shape and the `version` field reservation
- `NormalizationResult` — the public contract
- `AZURE_TYPE_MAP` — the single-point enumeration, silent-skip policy, and the multi-ARM-type-to-one-ResourceType decisions (e.g. classic + flexible server variants)
- `nid()` — why case normalization matters and why the name is short
- `parseAzureId()` — ARM ID anatomy with worked examples
- `eid()` — deterministic edge IDs, last-2-segments rationale, known collision limitation
- `isAzMapFile()` — detection heuristic and why it runs before `extractResources`
- `extractResources()` — all four Azure export envelope shapes with the tool that produces each
- `normalizeJson()` — format dispatch and the AzMap-first detection order
- `extractNetworkRelationships()` — the Pass 1 / self-contained philosophy, inner helper documentation, and per-case comments explaining Azure behavior (vHub vs VNet AZFW, LB internal vs external, etc.)
- `normalizeAzureResources()` — full pipeline documentation: idempotency, lazy hierarchy materialization, the two-pass design rationale, VNet special-casing, Pass 2 ordering guarantee, and private IP metadata enrichment

**DECISIONS.md:**
- ADR-017 — Two-Pass Normalization Strategy: why Pass 1 creates nodes and Pass 2 wires cross-resource edges, the ordering-independence guarantee, and rules for future additions
- ADR-018 — Silent Skipping Policy For Unknown Resource Types: why warnings are not emitted for unrecognized ARM types, what conditions do warrant warnings, and the known limitation (typos in AZURE_TYPE_MAP are silent)

**tasks/lessons.md:**
- ARM resource ID anatomy with the full template and key parsing facts
- The Azure export envelope problem (four shapes, which tool produces each)
- Subnets are embedded, not top-level resources
- Two-pass normalization: why Pass 2 exists
- Lazy hierarchy materialization pattern
- LB backend pool ID parsing (stripping the pool suffix to reach the LB)

### Why
AzMap is explicitly both a production platform and an engineering learning environment (ADR-009). The normalizer is the most architecturally complex file in the codebase — it embeds decisions about Azure resource ID structure, export format detection, graph idempotency, and multi-pass ordering. Without documentation, these decisions are invisible to a reader and to future AI sessions, making them vulnerable to being accidentally undone or duplicated.

### Files Affected
- `packages/shared/src/types/relationships.ts` — full JSDoc on all 8 enum values
- `packages/shared/src/types/resources.ts` — file-level and category-level JSDoc
- `apps/frontend/src/store/graphStore.ts` — JSDoc on interface and both actions
- `apps/frontend/src/import/jsonNormalizer.ts` — JSDoc on every type, constant, and function
- `DECISIONS.md` — ADR-017 and ADR-018 appended
- `tasks/lessons.md` — 6 new engineering lessons added

### Architectural Impact
Documentation only — no behavioral changes. All existing logic preserved verbatim.

### Validation
- `pnpm typecheck` passes (verified)

---

## CHG-012 — 2026-05-12 — Comprehensive Azure service coverage across all resource provider namespaces

### Summary
Expanded AzMap to recognise and render resources from every major Azure resource provider namespace listed on the official [Azure services resource providers reference](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-services-resource-providers). Any resource type in the AZURE_TYPE_MAP is now accepted by the import pipeline, assigned an icon, and rendered in the topology — nothing is silently dropped.

**New ResourceType enum values (54):**

| Category | New types |
|---|---|
| Compute | VirtualMachineScaleSet, AvailabilitySet, ManagedDisk, DedicatedHostGroup, DedicatedHost, BatchAccount, ServiceFabricCluster |
| Containers | KubernetesCluster, ContainerGroup, ContainerRegistry, ContainerAppEnvironment, ContainerApp |
| App platform | AppService, AppServicePlan, AppServiceEnvironment, StaticWebApp |
| Networking | ApplicationSecurityGroup, PublicIpPrefix, DdosProtectionPlan, NetworkWatcher, IpGroup, DnsZone, PrivateDnsZone, TrafficManagerProfile, FrontDoor, CdnProfile |
| Storage | StorageAccount, NetAppAccount |
| Databases | SqlServer, SqlDatabase, SqlManagedInstance, CosmosDbAccount, PostgreSqlServer, MySqlServer, MariaDbServer, RedisCache, SynapseWorkspace |
| Security | KeyVault |
| Identity | UserAssignedIdentity |
| Integration | ApiManagementService, EventHubNamespace, ServiceBusNamespace, EventGridTopic, EventGridDomain, LogicApp, RelayNamespace, NotificationHubNamespace, SignalRService |
| Analytics | DatabricksWorkspace, DataFactory, DataExplorerCluster, HDInsightCluster, StreamAnalyticsJob, AnalysisServicesServer, PurviewAccount |
| AI & ML | MachineLearningWorkspace, CognitiveServicesAccount, SearchService, BotService, AzureOpenAIService |
| IoT | IoTHub, DeviceProvisioningService, DigitalTwinsInstance, IoTCentralApp |
| Monitoring | LogAnalyticsWorkspace, ApplicationInsightsComponent, AutomationAccount, RecoveryServicesVault |
| Hybrid & Arc | ArcServer, ArcKubernetesCluster, AzureLocalCluster |

**AZURE_TYPE_MAP additions (~80 new ARM type strings):**
All major resource types across `Microsoft.Compute`, `Microsoft.Batch`, `Microsoft.ServiceFabric`, `Microsoft.ContainerService`, `Microsoft.ContainerInstance`, `Microsoft.ContainerRegistry`, `Microsoft.App`, `Microsoft.Web`, `Microsoft.Storage`, `Microsoft.NetApp`, `Microsoft.Sql`, `Microsoft.DocumentDB`, `Microsoft.DBforPostgreSQL`, `Microsoft.DBforMySQL`, `Microsoft.DBforMariaDB`, `Microsoft.Cache`, `Microsoft.Synapse`, `Microsoft.KeyVault`, `Microsoft.ManagedIdentity`, `Microsoft.ApiManagement`, `Microsoft.EventHub`, `Microsoft.ServiceBus`, `Microsoft.EventGrid`, `Microsoft.Logic`, `Microsoft.Relay`, `Microsoft.NotificationHubs`, `Microsoft.SignalRService`, `Microsoft.Databricks`, `Microsoft.DataFactory`, `Microsoft.Kusto`, `Microsoft.HDInsight`, `Microsoft.StreamAnalytics`, `Microsoft.AnalysisServices`, `Microsoft.Purview`, `Microsoft.MachineLearningServices`, `Microsoft.CognitiveServices`, `Microsoft.Search`, `Microsoft.BotService`, `Microsoft.OpenAI`, `Microsoft.Devices`, `Microsoft.DigitalTwins`, `Microsoft.IoTCentral`, `Microsoft.OperationalInsights`, `Microsoft.Insights`, `Microsoft.Automation`, `Microsoft.RecoveryServices`, `Microsoft.HybridCompute`, `Microsoft.Kubernetes`, `Microsoft.AzureStackHCI`. Also additional `Microsoft.Network` types: ApplicationSecurityGroups, PublicIPPrefixes, DdosProtectionPlans, NetworkWatchers, IpGroups, DnsZones, PrivateDnsZones, TrafficManagerProfiles, FrontDoors.

**Relationship extraction added for topology-relevant types:**
- `KubernetesCluster` → ConnectedTo subnet via `agentPoolProfiles[].vnetSubnetID`
- `ContainerApp` → Contains from its managed environment (`managedEnvironmentId`)
- `ContainerAppEnvironment` → ConnectedTo subnet via `vnetConfiguration.infrastructureSubnetId`
- `AppService` → ConnectedTo subnet via `virtualNetworkSubnetId`; DependsOn plan via `serverFarmId`
- `AppServiceEnvironment` → ConnectedTo its dedicated subnet
- `ApiManagementService` → ConnectedTo subnet via `virtualNetworkConfiguration.subnetResourceId`

**Icons:**
All 54 new types have proper Azure service icons from `@threeveloper/azure-react-icons`. Icons from directories with spaces in their names (`ai + machine learning`, `management + governance`) are imported via direct file paths — TypeScript module specifiers accept these as string literals; Vite resolves them correctly at build time.

### Why
The earlier normalizer had a closed list of ~25 resource types. A real Azure environment regularly contains 50–100 distinct resource types. Any type not in the map was silently skipped, making imports from realistic environments look empty or incomplete. This change makes every resource from every provider page importable — users can now drop a full Resource Graph query result and see their entire estate, not just the networking layer.

### Files Affected
- `packages/shared/src/types/resources.ts` — 54 new `ResourceType` values
- `apps/frontend/src/import/jsonNormalizer.ts` — ~80 new AZURE_TYPE_MAP entries; 6 new relationship extraction cases
- `apps/frontend/src/topology/icons.ts` — complete rewrite; 50+ icon imports across 15 icon directories
- `apps/frontend/src/topology/nodeConfig.ts` — complete rewrite; entry for every `ResourceType` with label, accent colour, and icon

### Architectural Impact
`nodeConfig` remains a `Record<ResourceType, NodeConfig>` (exhaustive). Adding a `ResourceType` without a `nodeConfig` entry is a compile error — the rendering layer can never silently fail for a recognised type. The `AZURE_TYPE_MAP` is the single point of truth for which ARM types enter the graph; anything not listed here is discarded with no warning (unknown types are not an error).

### Validation
- `pnpm typecheck` passes
- Import a Resource Graph query result containing AKS, App Service, Key Vault, CosmosDB, and Databricks resources — verify all appear in topology with correct icons
- Verify AKS → subnet `ConnectedTo` edges appear in the Raw Graph panel
- Verify App Service shows `DependsOn` edge to its App Service Plan

### Follow-Up Work
- Add collector CLI commands to Tutorial for the new service categories (`az aks list`, `az webapp list`, `az keyvault list`, `az cosmosdb list`, etc.)
- Add `Microsoft.Compute/virtualMachineScaleSets` instance-to-subnet relationship extraction
- Extend `Microsoft.Sql/servers` to also create `SqlDatabase` child nodes from embedded `databases` property in some API responses

---

## CHG-011 — 2026-05-12 — Full Microsoft.Network/* resource type coverage

### Summary
Expanded the normalizer and shared type system from 4 recognised `Microsoft.Network` types to the full namespace. The graph can now represent all major Azure network constructs.

**New resource types (16):**

| Type | ARM type |
|---|---|
| `VirtualWan` | `microsoft.network/virtualwans` |
| `VirtualHub` | `microsoft.network/virtualhubs` |
| `AzureFirewall` | `microsoft.network/azurefirewalls` |
| `FirewallPolicy` | `microsoft.network/firewallpolicies` |
| `NetworkVirtualAppliance` | `microsoft.network/networkvirtualappliances` |
| `RouteTable` | `microsoft.network/routetables` |
| `NatGateway` | `microsoft.network/natgateways` |
| `PublicIpAddress` | `microsoft.network/publicipaddresses` |
| `LoadBalancer` | `microsoft.network/loadbalancers` |
| `ApplicationGateway` | `microsoft.network/applicationgateways` |
| `VpnGateway` | `microsoft.network/virtualnetworkgateways` + `/vpngateways` + `/expressroutegateways` |
| `LocalNetworkGateway` | `microsoft.network/localnetworkgateways` |
| `GatewayConnection` | `microsoft.network/connections` |
| `ExpressRouteCircuit` | `microsoft.network/expressroutecircuits` |
| `PrivateEndpoint` | `microsoft.network/privateendpoints` |
| `BastionHost` | `microsoft.network/bastionhosts` |

**Relationship extraction (Pass 1) added for each type:**
- `VirtualHub` → Contains edge from parent vWAN (`properties.virtualWan.id`)
- `NetworkVirtualAppliance` → Contains edge from parent vHub (`properties.virtualHub.id`)
- `AzureFirewall` → Contains from vHub (vHub deployment) or ConnectedTo subnet (VNet deployment); DependsOn FirewallPolicy
- `RouteTable` → RoutesTo edges to all associated subnets (`properties.subnets[]`)
- `NatGateway` → AttachedTo edges to associated subnets
- `ApplicationGateway` → ConnectedTo its gateway subnet (`properties.gatewayIPConfigurations[].properties.subnet`)
- `BastionHost` → ConnectedTo AzureBastionSubnet
- `PrivateEndpoint` → ConnectedTo its subnet
- `LoadBalancer` → ConnectedTo subnet for internal LB frontend IP configs
- `VpnGateway` (classic) → ConnectedTo GatewaySubnet
- `GatewayConnection` → ConnectedTo both gateway endpoints

**Pass 2 addition:**
NIC → LoadBalancer: extracts backend address pool membership from `properties.ipConfigurations[].properties.loadBalancerBackendAddressPools[].id`, strips the pool path suffix to get the LB resource ID, adds an `AttachedTo` edge from NIC to LB.

**Icons:** Added proper Azure icons for all 16 new types from `@threeveloper/azure-react-icons` (no placeholders used).

**Dashboard:** Network layer now surfaces counts for Load Balancers, App Gateways, VPN/ER Gateways, Route Tables, vWANs, and Bastion Hosts. Security layer now includes Azure Firewall count and its status drives readiness alongside NSGs.

### Why
The original normalizer only recognised VMs, VNets, NSGs, and NICs — missing the routing, inspection, and hybrid connectivity layers that are central to any real Azure network design. Without these, importing a real environment would silently drop all firewalls, route tables, load balancers, and gateways, producing a topology that looked sparse and incomplete. This brings the graph in line with the full breadth of what `az network` and Resource Graph queries return.

### Files Affected
- `packages/shared/src/types/resources.ts` — 16 new `ResourceType` enum values
- `apps/frontend/src/import/jsonNormalizer.ts` — expanded `AZURE_TYPE_MAP`; new `extractNetworkRelationships` function (Pass 1); NIC→LB backend pool extraction (Pass 2)
- `apps/frontend/src/topology/icons.ts` — 16 new icon exports
- `apps/frontend/src/topology/nodeConfig.ts` — 16 new node config entries with correct labels, accent colours, and icons
- `apps/frontend/src/pages/Dashboard.tsx` — network and security layer counts updated

### Architectural Impact
`ResourceType` is exhaustively checked in `nodeConfig` (typed as `Record<ResourceType, NodeConfig>`), so adding a type here forces it to be handled in the rendering layer at compile time — no silent rendering failures possible. The `extractNetworkRelationships` function is a separate, pure function called from the main Pass 1 loop, keeping the normalizer readable as the type list grows.

### Validation
- `pnpm typecheck` passes
- Import a real Azure Resource Graph export containing AZFW, AppGW, and RouteTable resources — verify nodes appear in the topology with correct icons
- Verify RouteTable→Subnet `RoutesTo` edges appear in the Raw Graph panel
- Verify AZFW in a vHub shows a `Contains` edge from the hub, not a `ConnectedTo` edge to a subnet

### Follow-Up Work
- Add collector CLI commands to the Tutorial for the new resource types (az network firewall list, az network application-gateway list, etc.)
- Extend the normalizer to `Microsoft.Compute/*` beyond VMs (VMSS, AKS node pools)
- Add `Microsoft.Storage/*` and `Microsoft.KeyVault/*` for workload topology completeness

---

## CHG-010 — 2026-05-12 — Tutorial: checkbox-driven script builder on all layer tabs

### Summary
Replaced the text-heavy content on each "By Layer" tutorial tab with a checkbox-driven dynamic script builder (`ScriptBuilder` component). Each layer tab now shows a set of checkboxes at the top (one per collectable resource type) and a live-updating script panel on the right that re-generates as checkboxes are toggled.

**Checkbox options per layer:**
- Identity & Management: Management Groups (incl. tenancy), Subscriptions, Resource Groups + Resources
- Network Topology: Virtual Networks (incl. subnets + peerings), Network Interfaces
- Security Perimeter: Network Security Groups (incl. rules)
- Compute & Workloads: Virtual Machines, Network Interfaces
- BCP/DR: Regions + paired region metadata, Virtual Networks (cross-region), Virtual Machines (cross-region)

**Script generation:**
Each generator function (`identityPs`, `identityBash`, `networkPs`, `networkBash`, etc.) takes a `Set<string>` of selected option IDs and returns a complete, standalone, runnable script — including boilerplate header and output-file footer. Unchecking a box removes that collection block from the script. All options are checked by default.

**Shell selector shared across all tabs:**
The PowerShell / Bash toggle is lifted to the `Tutorial` page level so it persists when navigating between layer tabs. Previously the per-tab shell state would reset on every tab switch.

**Smart subscription handling:**
If Resource Groups is selected but Subscriptions is not, the identity generator still defines `$subs`/`$SUBS` for loop iteration, but with a comment explaining it is not included in the output. This prevents script errors when a user wants RG data without storing raw subscription entries.

### Why
The first iteration of the "By Layer" tabs included Portal navigation steps, CLI command references, and Extracts lists — useful as reference material, but the right panel was cluttered and harder to act on. User feedback: a single, dynamically built, copy-paste script per layer is more useful. The checkbox approach lets users trim the script to exactly what they need without reading dense documentation.

### Files Affected
- `apps/frontend/src/pages/Tutorial.tsx` — second rewrite: ScriptBuilder component, per-layer generator functions, lifted shell state

### Architectural Impact
None — pure UI/content change. Tutorial remains stateless.

### Validation
- Verify: each layer tab shows checkboxes and a live script panel
- Verify: unchecking a box removes the corresponding collection block from the script
- Verify: shell selector (PowerShell / Bash) persists across tab switches
- Verify: generated scripts are syntactically valid (copy + run in PowerShell/Bash against a real tenant)
- Verify: `pnpm typecheck` passes

### Follow-Up Work
- Add a "Copy all layers" button that generates a combined script selecting all options across all layers

---

## CHG-009 — 2026-05-12 — Tutorial complete rewrite: layer guides + collector scripts

### Summary
Completely rewrote the Tutorial page. Restructured from "by import format" to "by topology layer", added a Quick Start section with full copy-paste collector scripts, and added detailed per-layer guides covering Portal UI, CLI commands, and what AzMap extracts.

**Navigation restructure:**
Old: JSON Export / ARM Template / Resource Graph / AzMap Native (format-centric).
New: Quick Start Script / Identity & Management / Network Topology / Security / Compute & Workloads / BCP/DR / AzMap Native (layer-centric). Grouped under "Getting started", "By layer", "Formats".

**Quick Start Script section:**
Two complete, production-ready collector scripts (PowerShell for Windows, Bash/zsh for Mac/Linux/WSL) that collect the full Azure topology in one run: management groups, resource groups, VNets (with embedded subnets and peerings), NSGs, NICs, and VMs — across all accessible subscriptions. Output is a single JSON file ready to drop into AzMap Import. Includes prerequisites, runtime estimates by environment size, and step-by-step instructions for what to do with the output file. Scripts have progress output, error handling, and skip management groups gracefully if the user lacks MG Reader permissions.

**Per-layer guides (Identity & Management, Network Topology, Security, Compute & Workloads, BCP/DR):**
Each guide covers: what the layer contains (with explanations of WHY each resource matters), required permissions, Azure Portal navigation steps, Azure CLI commands for single-subscription and cross-subscription scenarios, and an "AzMap extracts" section showing exactly what relationships and metadata the normalizer produces.

**BCP/DR section:**
Includes a full reference table of Azure paired regions (UK South/West, North/West Europe, East/West US, etc.), CLI commands for identifying cross-region resource distribution, an explanation of why there is no single "DR export" in Azure, and a note that the BCP/DR overlay is planned.

**Technical additions:**
`CodeBlock` component with per-block language label and hover-to-reveal Copy button. `Note` and `Info` callout components. `Extracts` component (green tick list) for showing what AzMap captures. Sub-tabs within Quick Start for PowerShell vs Bash script selection.

### Why
The original Tutorial was format-centric (how to export JSON/ARM/Resource Graph) — useful background but not the first question a new user has. The first question is "how do I get my Azure data into AzMap?" The layer-centric structure answers that directly, with the Quick Start script as the shortest path to working data. The detailed layer guides serve as reference when users need to collect only a specific subset of resources or troubleshoot why a layer isn't lighting up on the Dashboard.

### Files Affected
- `apps/frontend/src/pages/Tutorial.tsx` — complete rewrite

### Architectural Impact
None — pure content/UI change. The Tutorial page remains stateless.

### Validation
- Verify: Tutorial nav shows three groups (Getting started, By layer, Formats)
- Verify: Quick Start shows PowerShell / Bash tabs; scripts are complete and copy-able
- Verify: each layer section has Portal steps, CLI commands, and Extracts list
- Verify: BCP/DR section shows paired region table
- Verify: `pnpm typecheck` passes

### Follow-Up Work
- Keep collector scripts updated as AzMap supports additional resource types
- Add Resource Graph query section to Network/Security guides (for large environments)

---

## CHG-008 — 2026-05-12 — Global graph state (Zustand) + JSON import pipeline

### Summary
Introduced a Zustand-based global graph store and a functional JSON import pipeline. The app now has a real end-to-end data flow: drop a file → graph populates → Dashboard lights up → Topology renders.

**Graph store (`store/graphStore.ts`):**
A Zustand store holding `nodes`, `edges`, `sourceLabel`, and `importedAt`. Two actions: `setGraph` (replaces the entire graph) and `clearGraph`. All pages now read from this store instead of the fixture file.

**JSON normalizer (`import/jsonNormalizer.ts`):**
Detects and handles three input formats:
- **AzMap native** (`{ nodes, edges }`) — validates shape and passes through unchanged
- **Azure resource array** (`AzureResource[]`) — normalizes to graph
- **ARM template** (`{ resources: [...] }`) and single-resource objects are also detected

For Azure resource arrays, the normalizer runs two passes:
1. Creates nodes for all supported resource types (VM, VNet, NSG, NIC). Automatically creates Subscription, Region, and ResourceGroup nodes by parsing resource IDs. Extracts embedded VNet subnets, subnet→NSG security edges, and VNet peering edges.
2. Wires network relationships: NIC→Subnet connectivity, NIC→NSG, VM→NIC attachment.

Supported Azure types in this release: `Microsoft.Compute/virtualMachines`, `Microsoft.Network/virtualNetworks`, `Microsoft.Network/networkSecurityGroups`, `Microsoft.Network/networkInterfaces`. Unknown types are silently skipped; missing `id`/`type` fields produce a warning.

**Import page (`pages/Import.tsx` — full rewrite):**
Four states: idle (drop zone), ready (file selected, confirm to import), success (node/edge counts + View Topology / Dashboard buttons), error (error message). Drag-and-drop and click-to-browse both supported. Warnings (e.g. skipped resources) shown separately below the success card. Link to Tutorial for format guidance.

**Dashboard (`pages/Dashboard.tsx`):**
Reads from the graph store instead of the fixture. When the store is empty: all 5 layers show Pending, import CTA shown instead of the Resync button. When populated: layers light up from real data, source filename and import time shown in the subtitle.

**Topology (`pages/Topology.tsx`):**
Reads from the graph store. When empty: shows a centred empty state with an "Import data" button linking to `/import`. When populated: `useEffect` recomputes the React Flow layout whenever the store changes. The breadcrumb label now shows the source filename instead of hardcoded "Demo topology".

### Why
The fixture was useful for building the rendering layer but was always a placeholder. This change makes the app functional: users can now drop a real Azure JSON export and see their topology. The store is the single source of truth from this point forward — all downstream systems (Dashboard, Topology, future overlays and exports) derive their data from it.

### Files Affected
- `apps/frontend/src/store/graphStore.ts` — new: Zustand graph store
- `apps/frontend/src/import/jsonNormalizer.ts` — new: JSON → graph normalizer
- `apps/frontend/src/pages/Import.tsx` — full rewrite: file picker, drag-drop, import pipeline
- `apps/frontend/src/pages/Dashboard.tsx` — reads from store; empty state when no data
- `apps/frontend/src/pages/Topology.tsx` — reads from store; empty state + dynamic layout recompute
- `apps/frontend/package.json` — zustand added as dependency

### Architectural Impact
- The Zustand store is now the canonical runtime graph. The fixture file (`fixtures/azure-topology.ts`) remains in the codebase as a development reference but is no longer used by any page.
- The normalizer is the first implementation of the Phase 2 normalization layer. It owns Azure type mapping, resource ID parsing, and relationship inference — exactly as architecturally specified.
- `computeLayers` in Dashboard is the first place that interprets graph content for status display; it will be extended as new resource types are added.

### Validation
- Start fresh (no store data): Dashboard shows 5 Pending layers and import CTA; Topology shows empty state
- Drop a JSON file on Import → shows file name → click Import → success card with counts
- Navigate to Dashboard: layers light up based on what was in the file
- Navigate to Topology: diagram renders from the imported data
- `pnpm typecheck` passes

### Follow-Up Work
- Extend normalizer to support additional Azure types (Load Balancers, Application Gateways, etc.)
- Implement AzMap native export (Phase 6) using the store's `nodes`/`edges`
- ESLint + Prettier configuration

---

## CHG-007 — 2026-05-11 — Dashboard ingestion status, raw JSON panel, resync, and overlay architectural clarification

### Summary
Redesigned the Dashboard into two zones: an ingestion status tracker on the left and a minimisable raw JSON panel on the right. Updated todo.md to reflect that BCP/DR and Governance are overlay toggles, not diagram projections.

**Ingestion status tracker:**
Five layers are computed live from the current graph state (currently the demo fixture; will be wired to live import state in Phase 2):
- Identity & Management — Subscriptions, MGs, RGs → Partial (subscriptions present, no MG data)
- Network Topology — VNets, Subnets, Peerings → Ready
- Security Perimeter — NSGs, secured subnets → Ready
- Compute & Workloads — VMs, NICs → Ready
- BCP / DR — paired regions, failover links → Partial

Each layer card lights up green (Ready) or amber (Partial) as its resource types are detected. The `computeLayers` function is the single place that encodes what each layer requires — no hardcoded status values.

**Resync button with inline warning:**
Clicking Re-scan replaces the button with an inline amber confirmation block explaining what will be lost. Cancel dismisses it; Confirm Re-scan accepts (no-op until import pipeline is wired). No modal library needed.

**Raw JSON panel (minimisable):**
Right-side panel shows the full `{ nodes, edges }` graph snapshot as formatted JSON with a Copy button. A chevron button collapses the panel to a 36px vertical strip with a rotated label and expand button. Restores to full 384px width on click.

**Architectural clarification — overlays vs projections:**
BCP/DR and Governance are removed from the Topology projection dropdown. They are overlay toggles that apply to any active projection, not separate structural views. Updated todo.md: Topology dropdown now lists 4 projections (Subscription Layout, MG Structure, Network Connectivity, Security); a new "Overlay Toggles" section defines BCP/DR and Governance as toggleable analytical lenses. Phase 7 sections updated to reflect that their traversal engines power the overlays defined in Phase 5.

### Why
The old Dashboard was a placeholder. The new design makes the import pipeline's progress immediately visible. The raw JSON panel gives immediate transparency into what the graph contains — critical for diagnosing import issues in Phase 2. The resync workflow needed a warning because clearing topology is destructive. The overlay vs projection distinction was raised explicitly: BCP/DR and Governance are not structural layouts, they are analytical interpretations that should apply to whichever view is active.

### Files Affected
- `apps/frontend/src/pages/Dashboard.tsx` — full rewrite: ingestion status tracker, resync button, minimisable raw JSON panel
- `tasks/todo.md` — Topology dropdown: BCP/DR + Governance removed as projections; new Overlay Toggles section added; Phase 7 BCP/DR and Governance sections updated

### Architectural Impact
- `computeLayers` encodes layer readiness logic in one place — when real import state is available, replace `demoNodes`/`demoEdges` with the live graph
- BCP/DR and Governance are now architecturally classified as overlays, not projections — this affects Phase 5 (UI), Phase 7 (traversal engines), and DECISIONS.md (to be updated)
- The raw JSON panel is a pure display component; it has no effect on graph state

### Validation
- Verify: Dashboard shows 5 layer cards; Identity and BCP/DR show amber (Partial), others show green (Ready)
- Verify: Re-scan button shows amber confirmation block; Cancel dismisses it
- Verify: Raw JSON panel shows formatted JSON with node and edge counts in the header
- Verify: Chevron button collapses panel to vertical strip; clicking strip label/icon restores it
- Verify: `pnpm typecheck` passes

### Follow-Up Work
- Add ADR to DECISIONS.md for overlay vs projection distinction
- ESLint + Prettier configuration
- Global graph state (Phase 1) to replace demoNodes/demoEdges in Dashboard

---

## CHG-006 — 2026-05-11 — Tutorial and Export sidebar nav items + pages

### Summary
Added Tutorial and Export as permanent sidebar nav items and created their initial page implementations.

**Nav order (bottom section):** Tutorial → Import → Export → Settings. Tutorial sits above Import so it is always reachable before a user has any data loaded. Export sits below Import as a natural next step.

**Tutorial page (`/tutorial`):**
A tabbed reference page with four sections — one per import format: JSON Export, ARM Template, Resource Graph, and AzMap Native (.azmap). Each section explains: what the format is, step-by-step instructions for exporting from Azure (Portal UI and CLI), and what AzMap extracts from it. The left-side format selector persists the active tab via local component state.

**Export page (`/export`):**
Lists all planned export formats (AzMap Native, PNG/SVG, Draw.io, Visio, Markdown) with descriptions and badges. All Export buttons are disabled with a note that they activate once topology data has been imported. Serves as the permanent home for export options as they are implemented.

### Why
Tutorial and Export were added to the roadmap as always-visible nav items that do not depend on import state. Tutorial needed real content (not a stub) because its value is guiding users before they have data. Export needed a visible placeholder so the export workflow has a defined home before the backend work begins.

### Files Affected
- `apps/frontend/src/pages/Tutorial.tsx` — new: tabbed tutorial page with per-format content
- `apps/frontend/src/pages/Export.tsx` — new: export options page with disabled buttons
- `apps/frontend/src/layout/AppShell.tsx` — bottomNav updated: Tutorial + Export added
- `apps/frontend/src/App.tsx` — routes added: `/tutorial`, `/export`

### Architectural Impact
- No architectural change — pure UI/routing addition
- Tutorial and Export pages are stateless display components; no graph state is introduced
- Export page is the permanent home for future export implementations; logic will be added here as the export pipeline is built in Phase 6

### Validation
- Verify: sidebar bottom section shows Tutorial, Import, Export, Settings in that order
- Verify: Tutorial active tab highlights correctly; content switches per format
- Verify: Export page lists all five format options with disabled Export buttons
- Verify: both pages are reachable via direct URL (/tutorial, /export)
- Verify: `pnpm typecheck` passes

### Follow-Up Work
- ESLint + Prettier configuration (Phase 1)
- Global graph state setup (prerequisite for import pipeline)
- Import pipeline Phase 2

---

## CHG-005 — 2026-05-11 — Visual hierarchy: swimlane subscription, region column overhang, handle semantics

### Summary
Established the permanent visual hierarchy for the topology canvas: Subscription as a horizontal swimlane with a left label strip, Regions as bordered column cards that protrude above and below the swimlane edge, and differentiated handle semantics on container nodes.

**Subscription swimlane (`AzureSwimLane`):**
Subscription nodes now render as a horizontal band with a 36px vertical label strip on the left (showing icon, type, and name rotated 90°). Children (Region columns) sit to the right of the strip. The swimlane has no top/bottom header band — the region columns themselves provide the vertical visual boundary.

**Region column with overhang (`AzureRegionColumn`):**
Region nodes render as bordered, tinted column cards that extend `REGION_OVERHANG = 36px` above and below the subscription swimlane. The region header label (icon + "REGION | UK South") sits in the top overhang area, visually outside the subscription. React Flow's `extent: 'parent'` is intentionally omitted from region nodes so they are not clipped to the subscription boundary.

The layout engine computes the symmetric protrusion correctly by deriving the swimlane height from the region's *content* height (region dims minus `2 × REGION_OVERHANG`), rather than from the already-inflated region dims. This ensures the region protrudes exactly `REGION_OVERHANG` above and below — not just above.

**Handle semantics on containers:**
- Target handle (inbound edges, e.g. `ConnectedTo` NIC → Subnet): centred within the container so the edge appears to terminate *inside* the box — visually representing network attachment.
- Source handle (outbound edges, e.g. `SecuredBy` Subnet → NSG): positioned on the bottom border so the edge exits from the *outer wall* — visually representing boundary-level security enforcement.

**Swimlane left gap:**
Reduced from `P = 48px` to `SWIMLANE_PAD = P/2 = 24px` so region cards sit closer to the subscription label strip.

**Design rationale — Region vs Subscription hierarchy:**
Subscriptions are the outer container in the layout tree (Subscription → Region → RG) because a subscription is the billing/RBAC boundary that owns the regions' resources. Regions are rendered as column dividers within the subscription rather than full nested containers, because Azure regions are a global infrastructure concept — not something that belongs to a single subscription. This prevents region card duplication when multiple subscriptions are imported: each subscription gets its own swimlane row with its own region labels, while the region identity (UK South, UK West) is displayed once per subscription context.

### Why
Multiple iterative visual improvements in response to review:
- NSG/UDR edge connection points needed to land on the subnet's outer wall (not inside), making it clear these resources govern the boundary rather than live inside it.
- The subscription card was missing — it was temporarily removed when restructuring the hierarchy; restored and given a swimlane treatment to span across regions cleanly.
- Region cards were invisible (transparent) until a border and tinted background were added. Then too tall (subscription was the wrong height). Fixed by the symmetric overhang height derivation.
- Left gap between subscription strip and first region card was too wide.

### Files Affected
- `apps/frontend/src/topology/AzureSwimLane.tsx` — new: subscription swimlane component
- `apps/frontend/src/topology/AzureRegionColumn.tsx` — new: region column component with overhang
- `apps/frontend/src/topology/AzureContainer.tsx` — target handle centred, source handle on border
- `apps/frontend/src/topology/containerLayout.ts` — SWIMLANE_TYPES, REGION_COLUMN_TYPES, SWIMLANE_W, SWIMLANE_PAD, REGION_OVERHANG, symmetric overhang height derivation, `extent:'parent'` omitted for region nodes
- `apps/frontend/src/pages/Topology.tsx` — registered `azureSwimLane` and `azureRegionColumn` node types
- `apps/frontend/src/fixtures/azure-topology.ts` — sub-prod node and sub→region Contains edges stable

### Architectural Impact
- Layout engine now has three distinct container rendering modes: regular (top header), swimlane (left strip), and region column (overflow card)
- Handle position carries semantic meaning: inbound = inside the box (network attachment); outbound = border (security boundary)
- Swimlane height is decoupled from region dims — derived from content height directly to enable symmetric overhang

### Validation
- Verify: subscription swimlane spans both region columns with left label strip visible
- Verify: region cards protrude equally above and below the subscription border
- Verify: ConnectedTo edges (NIC → Subnet) terminate inside the subnet box
- Verify: SecuredBy edges (Subnet → NSG) exit from the subnet's bottom border
- Verify: `pnpm typecheck` passes

### Follow-Up Work
- Paired region validation function (Phase 4 traversal, tracked in todo.md)
- Import pipeline (Phase 2)

---

## CHG-004 — 2026-05-11 — Two-zone container layout + node detail flyout panel

### Summary
Rewrote `containerLayout.ts` with a two-zone layout algorithm and added a JSON detail panel that slides in when a node is clicked.

**Two-zone layout:**
Each container now splits its children into two horizontal rows rendered inside the same parent:
- Row 1 (top): container-type children (nodes that are intrinsic containers or have their own children)
- Row 2 (bottom): leaf children (non-container resources)

This correctly places NSGs, VMs, and NICs in the bottom zone of their owning Resource Group, while the VNet (a container) occupies the top zone. Subnets sit inside the VNet. All containment is graph-driven via `Contains` edges — the layout engine imposes no topology assumptions of its own.

The "external nodes" approach from the previous layout (placing NSG/VM/NIC below the subscription as orphans) was removed. All nodes in the fixture are now properly contained via the updated edge set.

**Node detail panel:**
Clicking any node opens a right-side flyout showing the resource's metadata fields (Subscription, Resource Group, location, `metadata` key-value pairs) and the full raw JSON payload if present. Clicking the canvas or the ✕ button dismisses it. The panel is rendered inside the existing `relative` wrapper in `Topology.tsx` so it overlays the React Flow canvas without affecting the app shell.

### Why
The previous layout incorrectly separated NSG/VM/NIC resources from their owning Resource Group containers. The corrected fixture (from the prior session) established that RG Contains those resources, but the layout engine needed to be rewritten to handle mixed container+leaf children within the same parent rather than pushing leaves outside the tree entirely.

### Files Affected
- `apps/frontend/src/topology/containerLayout.ts` — full rewrite: two-zone layout, removed external-node handling, more generous spacing constants
- `apps/frontend/src/topology/NodeDetailPanel.tsx` — new component: right-side flyout showing node metadata and raw JSON
- `apps/frontend/src/pages/Topology.tsx` — added `onNodeClick`/`onPaneClick` handlers, `selectedNode` state, `NodeDetailPanel` rendering

### Architectural Impact
- Containment-driven layout: the layout engine now respects the graph's `Contains` edges as the sole source of nesting truth
- No topology inference in the rendering layer — the engine only reads edges, never derives relationships from resource types
- `NodeDetailPanel` is a pure display component: it receives a `GraphNode` and renders it, with no state of its own

### Validation
- `pnpm typecheck` passes across all packages
- Verify in browser: RG cards show VNet in the top zone, NSG/VM/NIC in the bottom zone
- Verify: clicking a node opens the panel with correct metadata
- Verify: clicking canvas or ✕ closes the panel
- Verify: cross-region edges (PeeredWith, FailsOverTo) draw correctly between containers

### Follow-Up Work
- Paired region validation function (Phase 4 traversal layer, tracked in todo.md)
- Import pipeline (Phase 2)

---

## CHG-003 — 2026-05-11 — Repository scaffold

### Summary
Initialized the full pnpm monorepo structure with three workspace packages.

### Why
First implementation milestone — establishes the runnable skeleton before any feature work begins.

### Files Affected
- `pnpm-workspace.yaml` — workspace package roots
- `package.json` — root scripts, esbuild build approval
- `tsconfig.json` — base TypeScript config (strict mode)
- `packages/shared/` — canonical graph contracts: `GraphNode`, `GraphEdge`, `ResourceType`, `RelationshipType`
- `apps/frontend/` — Vite + React + TypeScript + Tailwind + React Flow scaffold
- `apps/backend/` — Node.js + Express + TypeScript scaffold

### Architectural Impact
- `packages/shared` is the authoritative source for all graph contracts. Frontend and backend import from `@azmap/shared`.
- All three packages typecheck clean with TypeScript strict mode.
- Backend health endpoint confirmed live at `http://localhost:3001/health`.

### Validation
- `pnpm typecheck` passes across all three packages
- `GET /health` returns `{"status":"ok","service":"azmap-backend"}`
- Frontend starts via `pnpm dev:frontend`

### Follow-Up Work
- Define TypeScript standards, testing strategy, logging strategy (Phase 1)
- Implement import pipeline (Phase 2)

---

## CHG-001 — 2026-05-10 — Repository Governance Foundations

### Summary
Established foundational architectural governance, workflow standards, AI operational guidance, implementation sequencing, and engineering learning structures for AzMap.

Expanded and standardized:
- governance documentation
- architectural ownership rules
- graph-centric architectural direction
- implementation workflow guidance
- architectural blast-radius documentation
- learning continuity systems

### Why
AzMap is intended to evolve into a graph-centric Azure topology analysis platform with overlays, traversal systems, exports, and governance analysis.

Strong foundational governance was established before implementation work to:
- reduce architectural drift
- improve AI-assisted engineering consistency
- preserve deterministic architecture evolution
- enforce ownership boundaries
- improve long-term maintainability
- support structured engineering learning

### Files Affected
- `MASTER_PROJECT_BRIEF.md`
- `CLAUDE.md`
- `DECISIONS.md`
- `CHANGE_IMPACT_MAP.md`
- `FILES_OF_INTEREST.md`
- `tasks/todo.md`
- `tasks/lessons.md`
- `CHANGELOG.md`

### Architectural Impact
Defined:
- canonical graph ownership
- immutable topology philosophy
- overlay/simulation constraints
- traversal ownership boundaries
- rendering ownership boundaries
- progressive rendering direction
- documentation governance
- architectural sequencing expectations

Established the governance foundation that future implementation work will derive from.

### Validation
Verify:
- all governance documents are internally consistent
- architectural responsibilities are clearly separated
- no contradictory ownership rules exist
- implementation sequencing aligns with todo phases
- documentation references remain accurate

### Follow-Up Work
Next implementation phase:
- repository scaffolding
- frontend/backend initialization
- domain model definition
- canonical graph contracts
- initial import pipeline

---

## CHG-002 — 2026-05-10 — V1 Architectural Decisions (ADR-010 through ADR-014)

### Summary
Recorded five concrete architectural decisions that close the gap between governance foundations (CHG-001) and implementation readiness.

- **ADR-010** — V1 canonical graph contracts (`GraphNode`, `GraphEdge`) defined in TypeScript before any import or normalization code is written. Graph model explicitly decoupled from SQLite persistence.
- **ADR-011** — Vite chosen over Next.js. AzMap is a local-first tool with no SSR requirements. Next.js complexity is not justified.
- **ADR-012** — React Flow + dagre chosen for rendering. ELK deferred until topology complexity demands it.
- **ADR-013** — pnpm workspaces chosen for monorepo structure. Shared canonical graph contracts must live in a shared package imported by both frontend and backend. Turborepo/NX deferred.
- **ADR-014** — `System_Prompt.md` removed. CLAUDE.md is the single Claude Code operating document. Duplicate governance sources are forbidden.

### Why
These decisions resolve the key pre-implementation questions identified during architectural review:
- graph contracts must exist before normalization code can be written
- frontend framework selection affects all subsequent scaffolding
- monorepo structure must be established before any packages are initialized
- governance duplication introduces drift risk

### Files Affected
- `DECISIONS.md` (ADR-010 through ADR-014 appended)
- `MASTER_PROJECT_BRIEF.md` (section 9 updated: Next.js → Vite + dagre)
- `System_Prompt.md` (deleted)

### Architectural Impact
- `GraphNode` and `GraphEdge` are now the stable V1 graph contracts. Normalization must produce these. Rendering must consume these.
- `ResourceType` and `RelationshipType` enumerations must be defined centrally in the shared package.
- Frontend scaffolding starts with Vite, not Next.js.
- All shared TypeScript types belong in the pnpm shared workspace package.

### Validation
- DECISIONS.md contains no contradictions between ADR-001–014
- MASTER_PROJECT_BRIEF.md section 9 reflects Vite + dagre
- System_Prompt.md no longer exists in the repository

### Follow-Up Work
- Initialize repository structure (pnpm workspace root, `packages/shared`, `apps/frontend`, `apps/backend`)
- Define `ResourceType` and `RelationshipType` enumerations in shared package
- Scaffold Vite + React + TypeScript frontend
- Scaffold Node.js + TypeScript backend

---

# Future Guidance

Avoid vague changelog entries.

Good entries explain:
- what changed
- why it mattered
- what architectural assumptions changed
- what future sessions should understand

This file is both engineering history and architectural memory.