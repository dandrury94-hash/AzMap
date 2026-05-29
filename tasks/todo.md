# tasks/todo.md — AzMap

Purpose:
Track implementation progress, architectural sequencing, learning goals, and future platform evolution.

This file is intentionally architecture-aware.

Tasks should:
- map clearly to architectural layers
- respect dependency ordering
- avoid premature feature implementation
- preserve long-term architectural integrity

---

# Workflow Rules

## Before starting work
- Confirm architectural ownership
- Check CHANGE_IMPACT_MAP.md
- Check FILES_OF_INTEREST.md
- Verify prerequisites are complete

---

## While implementing
- Keep tasks scoped to one architectural concern where possible
- Avoid parallel implementations of the same responsibility
- Prefer extending existing systems

---

## Before marking complete
- Update CHANGELOG.md
- Add lessons learned to tasks/lessons.md if appropriate
- Ensure architectural decisions remain aligned with DECISIONS.md

---

# Current Session

## In Progress

Nothing actively in progress.

---

## Recently Completed (CHG-038 → CHG-043)

- [x] CHG-043 — Combined `test-data/00-environment.json` (156-resource full-environment import)
- [x] CHG-042 — Distinct edge color palette + `RelationshipEdge` HTML-layer labels
- [x] CHG-041 — Per-peer VNet handles + canvas-level peering bus zone (no card-header intersection)
- [x] CHG-040 — Hold-Ctrl pan mode (PanOverlay, badge indicator)
- [x] CHG-039 — Settings panel: edge visibility, resource visibility, layout controls, Legend overlay
- [x] CHG-038 — VNet-affinity column sort + chain layout for RG leaf nodes

---

# Architectural Readiness Gates

These gates help prevent premature implementation and architectural drift.

---

## Overlay & Simulation Systems

Do NOT begin advanced overlay systems until:
- [ ] Canonical graph contracts are stable
- [ ] Relationship schemas are stable
- [ ] Traversal/query APIs are stable
- [ ] Projection systems are operational
- [ ] Rendering system supports layered topology views

Applies to:
- BCP/DR overlays
- SPOF analysis
- Security overlays
- Compliance overlays
- Traffic flow analysis

---

## Connectivity Analysis

Do NOT begin endpoint flow/path analysis until:
- [ ] Relationship traversal is stable
- [ ] Network entity normalization is stable
- [ ] NSG relationship modeling exists
- [ ] Route traversal modeling exists

---

## Export Systems

Do NOT begin advanced export systems until:
- [ ] Projection systems are stable
- [ ] Rendering contracts are stable
- [ ] Layout systems are deterministic

---

# Phase 1 — Platform Foundations

Goal:
Establish deterministic architecture foundations before feature expansion.

---

## Repository Foundations

### Status
Complete

### Completed
- [x] Governance documentation (CLAUDE.md, DECISIONS.md, MASTER_PROJECT_BRIEF.md, CHANGE_IMPACT_MAP.md, FILES_OF_INTEREST.md, CHANGELOG.md, tasks/lessons.md, tasks/todo.md)
- [x] pnpm monorepo structure (`apps/frontend`, `packages/shared`)
- [x] Architectural layer boundaries defined and enforced
- [x] TypeScript strict mode throughout

### Tasks
- [ ] Define testing strategy (unit tests for normalizer, layout engine)
- [ ] Define logging strategy

### Learning Goals
- Clean architecture
- Repository organization
- Layer ownership
- Engineering governance

---

## Frontend Foundation

### Status
In Progress

### Completed
- [x] Initialize React application (Vite + React + TypeScript + Tailwind)
- [x] Configure TypeScript (strict mode, monorepo paths)
- [x] Configure routing (React Router v6, nested layout)
- [x] App shell with sidebar nav (Dashboard, Topology, Import, Settings)
- [x] Dashboard page with intro/tutorial content and import CTA
- [x] Topology page (React Flow canvas, demo topology)
- [x] Favicon (AzM)

### Tasks
- [ ] Configure linting and formatting (ESLint, Prettier)
- [ ] Configure state management approach (global graph state)
- [ ] **Add Export to sidebar nav** — below Import; always visible
- [ ] **Add Tutorial/Help to sidebar nav** — above Import; always visible; persists regardless of import state
- [ ] **Tutorial content per import type** — dedicated tutorial page/panel for each import format (JSON, ARM, Resource Graph); explains what the format is, how to get it from Azure, and what AzMap will extract from it
- [ ] **Topology dropdown** — replace Topology nav link with a dropdown showing available projections (see Phase 5: Topology Projection Dropdown)

### Learning Goals
- React architecture
- TypeScript fundamentals
- Frontend project structure
- State management philosophy

---

## Backend/API Foundation

### Status
Pending

### Tasks
- [ ] Initialize backend API
- [ ] Define REST API structure
- [ ] Define shared domain models
- [ ] Configure validation strategy
- [ ] Define API response contracts

### Learning Goals
- API layering
- Service boundaries
- DTO vs domain models
- Backend architecture

---

# Phase 2 — Import Pipeline

Goal:
Support deterministic ingestion of Azure topology data.

---

## Import System

### Status
Complete (CHG-002 through CHG-012)

### Completed
- [x] JSON import (drag-and-drop, paste) — flat array, `{ value }`, `{ data }`, `{ resources }` envelopes
- [x] AzMap native format import/export (`.azmap.json`)
- [x] Immutable raw payload preservation
- [x] Import validation and diagnostics panel
- [x] 54 Azure resource types across all major resource provider namespaces (CHG-012)

### Tasks
- [ ] ARM template import
- [ ] Resource Graph query import
- [ ] **Tutorial content per import type** — each format gets a dedicated tutorial explaining: what it is, how to export it from Azure (portal steps or CLI command), and what AzMap extracts from it. Tutorial is accessible from the sidebar at all times (not gated by import state).

### Learning Goals
- Parsing pipelines
- Validation architecture
- Immutable data handling
- Data contracts

---

## Normalization Layer

### Status
Complete (CHG-002 through CHG-013)

### Completed
- [x] Canonical `GraphNode` / `GraphEdge` contracts (`@azmap/shared`)
- [x] Two-pass normalization (Pass 1: nodes; Pass 2: cross-resource edges)
- [x] `AZURE_TYPE_MAP` as single translation point for ARM type strings
- [x] Lazy hierarchy materialization (Subscription, Region, ResourceGroup synthesised on demand)
- [x] `extractNetworkRelationships()` — NIC, NSG, Subnet, LB, AZFW, vHub relationships
- [x] Full JSDoc documentation on all normalizer functions (CHG-013)
- [x] ADR-017 (two-pass strategy) and ADR-018 (silent-skip policy) in DECISIONS.md

### Tasks
- [ ] Relationship coverage: RoutesTo edges from Route Table → next-hop targets
- [ ] Relationship coverage: PrivateEndpoint → target service
- [ ] Relationship coverage: TrafficManager → backend endpoints

### Learning Goals
- Data normalization
- Canonical modeling
- Relationship systems
- Domain-driven thinking

---

# Phase 3 — Canonical Graph

Goal:
Establish the authoritative topology model.

---

## Graph Foundation

### Status
Complete (CHG-002 through CHG-014)

### Completed
- [x] `GraphNode` and `GraphEdge` contracts in `@azmap/shared`
- [x] `RelationshipType` enum (8 types: Contains, AttachedTo, ConnectedTo, SecuredBy, RoutesTo, PeeredWith, DependsOn, FailsOverTo)
- [x] `ResourceType` enum (54+ types) with stability contract (string == enum key)
- [x] Zustand `graphStore` (full-replacement `setGraph`, `clearGraph`)
- [x] Deterministic node IDs via `nid()` (lowercase ARM ID)
- [x] Deterministic edge IDs via `eid()` (last-2-segments of source + target)

### Tasks
- [ ] Graph integrity validation (detect orphaned edges, missing nodes)
- [ ] Graph query API (find neighbors, traverse by relationship type, filter by resource type)

### Learning Goals
- Graph modeling
- Relationship architecture
- Identity management
- Topology systems

---

## Initial Supported Topology

### Status
Complete

### Completed
- [x] Management Groups (hierarchy tree with MgBusEdge fan-out rendering)
- [x] Subscriptions (swimlane layout)
- [x] Virtual Networks (with per-peer handles, peering bus zone)
- [x] Virtual Machines, NICs, NSGs, Subnets, Route Tables, PIPs
- [x] All 54+ resource types rendered with icons

### Learning Goals
- Azure topology structure
- Infrastructure relationships
- Azure networking fundamentals

---

# Phase 4 — Traversal & Query Systems

Goal:
Enable reusable topology reasoning.

---

## Traversal Engine

### Status
Pending

### Tasks
- [ ] Implement graph traversal utilities
- [ ] Implement dependency traversal
- [ ] Implement connectivity traversal
- [ ] Implement path analysis primitives

### Learning Goals
- Graph traversal algorithms
- Query design
- Dependency analysis
- Topology reasoning

---

# Phase 5 — Projection & Rendering

Goal:
Render usable topology views from graph projections.

---

## Projection Layer

### Status
Pending

### Tasks
- [ ] Define projection interfaces
- [ ] Build management hierarchy projections
- [ ] Build network topology projections
- [ ] Build security projections
- [ ] Implement progressive rendering support

### Learning Goals
- Projection systems
- View composition
- Scalable rendering design

---

## Rendering System

### Status
In Progress (core complete, enhancements ongoing)

### Completed
- [x] React Flow integration
- [x] Node types: `azureNode`, `azureContainer`, `azureSwimLane`, `azureRegionColumn`
- [x] Edge types: `BusEdge`, `MgBusEdge`, `PeeringEdge`, `RelationshipEdge` (all with HTML-layer labels)
- [x] Containment-driven layout (`containerLayout.ts`)
- [x] Subscription swimlane + region column overhang layout
- [x] MG hierarchy fan-out with `MgBusEdge` (single trunk, N tines — CHG-037)
- [x] VNet peering: per-peer handles spread across top edge, canvas-level bus zone (CHG-041)
- [x] VNet-affinity column sort + chain layout for RG leaf nodes (CHG-038)
- [x] Edge visibility, resource visibility, layout controls in Settings (CHG-039)
- [x] Legend overlay (CHG-039)
- [x] Distinct perceptually-separate edge color palette (CHG-042)
- [x] Hold-Ctrl pan mode (CHG-040)
- [x] Node detail flyout panel (raw JSON + metadata)

### Tasks
- [ ] Zoom-level rendering behavior (progressive detail: collapse small nodes at low zoom)
- [ ] Layered topology navigation (see Topology Projection Dropdown below)

### Learning Goals
- Visualization architecture
- UI layering
- Rendering performance
- Interactive topology systems

---

## Topology Projection Dropdown

### Status
Pending (depends on: stable graph contracts, import pipeline, projection layer)

### Description
The Topology nav item becomes a dropdown. Each entry is a named projection of the canonical graph — a different analytical "lens" over the same data. Projections become available automatically as the graph accumulates the relevant resource types during ingestion. Unavailable projections are shown as disabled/greyed.

**BCP/DR and Governance are NOT projections — they are overlay toggles** (see Overlay Toggles below). The dropdown contains only structural/topological views. Analytical interpretations are layered on top via overlay controls.

Planned projections (order reflects dependency complexity):
1. **Subscription Layout** — current implementation; subscription swimlane + region columns + RG contents
2. **Tenant & Management Group Structure** — MG hierarchy tree; available when MG nodes exist
3. **Network Connectivity** — VNet peering, subnet routing, NIC→subnet attachment, gateway flows
4. **Security** — NSG rule coverage, subnet security posture, exposed surfaces

### Tasks
- [ ] Define projection interface contract (input: graph slice; output: React Flow nodes + edges)
- [ ] Implement projection registry (which projections exist, what data they require)
- [ ] Implement projection availability detection (graph has required node/edge types?)
- [ ] Build Topology dropdown UI (disable unavailable projections with tooltip)
- [ ] Implement Subscription Layout as first formal projection (extract from current Topology.tsx)
- [ ] Implement MG Structure projection
- [ ] Implement Network Connectivity projection
- [ ] Implement Security projection

### Architectural Notes
- Each projection consumes the canonical graph; none may infer relationships independently
- Projections are stateless transforms: graph → layout — no caching of computed layouts in the graph layer
- The dropdown state (selected projection) is UI state only; it does not affect the canonical graph

---

## Overlay Toggles

### Status
Pending (depends on: stable graph contracts, traversal layer, projection layer)

### Description
Overlays are analytical lenses that apply to **any active projection**. They highlight issues, risks, or positive signals directly on top of whatever topology diagram is currently displayed. Unlike projections (which restructure the layout), overlays add colour, badges, and annotations without changing the underlying graph view.

Overlays are toggled on/off independently. Multiple overlays can be active simultaneously.

Planned overlays:
- **BCP / DR** — highlights failover paths, paired region coverage, and single points of failure; surfaces gaps where HA is incomplete
- **Governance** — highlights CAF/WAF alignment gaps, policy coverage, resource tagging compliance, and naming convention issues

### Tasks
- [ ] Define overlay interface contract (input: active graph slice; output: node/edge style patches)
- [ ] Build overlay toggle toolbar in the Topology UI (visible above or beside the canvas)
- [ ] Implement BCP/DR overlay (SPOF detection, paired region validation, failover link coverage)
- [ ] Implement Governance overlay (CAF alignment, policy gaps, tagging coverage)

### Architectural Notes
- Overlays compose on top of baseline topology — they never mutate the canonical graph
- Overlay state is UI state only; it is not stored in the graph layer
- Overlays must remain explainable: each highlighted issue should carry a reason string
- An overlay that cannot explain its finding is not ready to ship

### Learning Goals
- Projection system design
- Graph slicing and filtering
- View composition
- Lazy rendering patterns

---

# Phase 6 — Export Systems

Goal:
Export topology views into reusable formats, including a native save/restore format for round-tripping AzMap diagrams.

---

## Native Diagram Save / Restore

### Status
Pending (depends on: stable graph contracts, import pipeline)

### Description
AzMap should be able to export its own canonical graph snapshot to a file, and later re-import it. This enables:
- saving a point-in-time topology for later review or sharing
- round-tripping a diagram without needing to re-import from Azure
- a "session save" workflow for local-first use

The format should be JSON with a versioned envelope (e.g. `.azmap.json` or `.azmap`). The file contains the canonical `GraphNode[]` and `GraphEdge[]` arrays — the same contracts used internally. It is **not** a React Flow layout snapshot; layout is always recomputed from the graph at load time.

### Tasks
- [ ] Define `.azmap` file format (versioned JSON envelope wrapping GraphNode[] + GraphEdge[])
- [ ] Implement AzMap JSON export (serialize current graph to `.azmap` file)
- [ ] Implement AzMap JSON import (parse `.azmap` file, validate schema, load into graph)
- [ ] Add import/export UI for native format (Import and Export pages)
- [ ] Version the format schema (so future schema changes can detect and migrate old files)

### Architectural Notes
- The `.azmap` format is NOT a layout file — it is a graph snapshot. Layout is always derived fresh.
- Importing an `.azmap` file follows the same normalization path as any other import format.
- Raw Azure payloads (`rawPayload` fields) should be preserved in the snapshot so the file retains full audit fidelity.

### Learning Goals
- Serialization design
- Versioned file formats
- Round-trip data fidelity
- Import pipeline extension

---

## External Diagram Export

### Status
Pending (depends on: projection systems stable, layout deterministic)

### Tasks
- [ ] Draw.io export
- [ ] Visio export
- [ ] Markdown topology export
- [ ] API documentation generation
- [ ] PNG/SVG canvas export (React Flow built-in, low effort)

### Learning Goals
- Serialization
- Export pipelines
- Documentation generation

---

# Phase 7 — Overlay & Simulation Systems

Goal:
Enable analytical overlays on immutable topology.

---

## BCP / DR Overlay System

### Status
Future (tracked under Phase 5 Overlay Toggles for the UI layer; this section covers the traversal engine behind it)

### Description
The BCP/DR overlay is a toggle that applies to any active diagram projection. It does not restructure the layout — it annotates the existing view with resilience signals. The traversal engine that powers it lives here in Phase 7.

### Tasks
- [ ] Implement paired region validation traversal (detect regions without a pair present in the graph)
- [ ] Implement SPOF detection traversal (identify resources with no failover counterpart)
- [ ] Implement failover path tracing (follow FailsOverTo edges to build the complete DR chain)
- [ ] Surface overlay output: node colour patches + annotation badges + reason strings

### Learning Goals
- Simulation systems
- Overlay composition
- State layering
- Infrastructure resiliency concepts

---

## Connectivity Flow Analysis

### Status
Future

### Tasks
- [ ] Source-to-destination analysis
- [ ] NSG traversal analysis
- [ ] Firewall policy analysis
- [ ] Route path analysis
- [ ] Connectivity explanation engine

### Learning Goals
- Network reasoning
- Connectivity analysis
- Traversal systems
- Azure networking architecture

---

## Governance & Compliance Overlays

### Status
Future (tracked under Phase 5 Overlay Toggles for the UI layer; this section covers the analysis engine behind it)

### Description
The Governance overlay is a toggle that applies to any active diagram projection. It annotates the existing view with compliance and alignment signals — it does not restructure the layout. The analysis engine that powers it lives here in Phase 7.

### Tasks
- [ ] Implement CAF/WAF alignment analysis (resource naming conventions, tagging coverage, region pairing)
- [ ] Implement Azure Security Benchmark checks (NSG coverage, public exposure detection)
- [ ] Implement ISO/NIS2 overlay concepts (boundary identification, data residency signals)
- [ ] Surface overlay output: node annotations + reason strings (every finding must be explainable)

### Learning Goals
- Governance architecture
- Compliance systems
- Policy modeling

---

# Phase 8 — DevOps & IaC

Goal:
Introduce operational engineering workflows.

---

## Terraform

### Status
Future

### Tasks
- [ ] Learn Terraform foundations
- [ ] Define IaC repository structure
- [ ] Create local Terraform workflows
- [ ] Explore Azure landing zone concepts

### Learning Goals
- Infrastructure as Code
- Terraform architecture
- State management
- Azure provisioning workflows

---

## Azure DevOps

### Status
Future

### Tasks
- [ ] Define CI/CD workflow
- [ ] Configure build pipelines
- [ ] Configure testing pipelines
- [ ] Configure deployment pipelines

### Learning Goals
- CI/CD architecture
- DevOps workflows
- Automated testing
- Deployment pipelines

---

# Backlog

## Medium Priority
- [ ] **Paired region validation** — given a topology graph, detect whether each Region node has a corresponding paired region present and raise a warning if HA coverage is incomplete. Azure paired regions: UK South ↔ UK West, East US ↔ West US, North Europe ↔ West Europe, etc. Implement as a graph analysis function in the traversal layer (Phase 4), surface as an overlay in the topology view.
- [ ] Search system
- [ ] Tag filtering
- [ ] Saved projections
- [ ] Resource metadata side panels

---

## Low Priority
- [ ] Multi-user collaboration
- [ ] Cloud-hosted deployments
- [ ] AKS deployment exploration
- [ ] Authentication systems

---

# On Hold

Nothing currently on hold.

---

# Completed

Nothing completed yet.

---

# Final Guidance

Do not implement advanced features early if the foundational graph architecture is unstable.

Long-term platform quality depends on:
- correct ownership boundaries
- stable graph contracts
- deterministic traversal behavior
- disciplined architectural layering

Foundations first.