# FILES_OF_INTEREST.md — AzMap

This file highlights the most important files in the project, what they do, and when they should be modified.

Claude Code should use this as a navigation shortcut before exploring the full repo.

The purpose of this file is to:
- reduce architectural drift
- prevent duplicate logic
- improve implementation consistency
- clarify ownership boundaries
- accelerate safe navigation of the codebase

---

# Foundational Governance Files (Read First)

These files define how the project operates.

---

## MASTER_PROJECT_BRIEF.md

### Purpose
Defines the long-term platform vision, architecture philosophy, feature direction, and engineering goals.

### Responsibilities
- Defines platform scope
- Defines architectural philosophy
- Defines future platform direction
- Defines learning goals
- Defines long-term scalability direction

### Rules
- Architectural decisions should remain aligned with this document
- Major platform pivots should update this file

### Related Decisions
- ADR-001 through ADR-009

---

## CLAUDE.md

### Purpose
Defines how Claude Code should behave within the repository.

### Responsibilities
- Defines implementation workflow
- Defines engineering expectations
- Defines learning expectations
- Defines architectural guardrails
- Defines forbidden patterns

### Rules
- Treat as authoritative
- Read before implementation work
- Do not bypass documented constraints

### Related Decisions
- ADR-001
- ADR-003
- ADR-009

---

## DECISIONS.md

### Purpose
Historical and current architectural decision log.

### Responsibilities
- Stores architectural rationale
- Preserves engineering intent
- Prevents architectural drift
- Maintains architectural history

### Rules
- Prefer append-oriented updates
- Mark superseded decisions explicitly
- Do not silently remove historical decisions

---

## CHANGE_IMPACT_MAP.md

### Purpose
Defines architectural blast radius and dependency relationships.

### Responsibilities
- Explains ripple effects
- Identifies high-risk areas
- Clarifies layer ownership
- Prevents unsafe refactors

### Rules
- Consult before modifying core systems
- Update when architectural dependencies change

---

## CHANGELOG.md

### Purpose
Tracks all meaningful repository changes.

### Responsibilities
- Historical implementation tracking
- Engineering audit trail
- Session continuity support

### Rules
- Required before work is considered complete
- Use CHG-XXX style entries

---

# Core Architecture

These systems define the canonical platform behavior.

---

## Import Layer

### Purpose
Handles ingestion of Azure infrastructure data.

### Likely Locations
- `/src/imports`
- `/src/parsers`
- `/src/adapters`

### Responsibilities
- ARM ingestion
- JSON ingestion
- Resource Graph ingestion
- Terraform state ingestion (future)
- Raw payload preservation

### Rules
- Imported payloads are immutable
- Do not derive topology here
- Do not implement rendering behavior here

### Must NOT
- Generate view logic
- Render topology
- Mutate imported data

### Related Decisions
- ADR-002
- ADR-003

---

## Normalization Layer

### Purpose
Transforms imported Azure payloads into canonical graph entities.

### Likely Locations
- `/src/normalization`
- `/src/mappers`
- `/src/relationships`

### Responsibilities
- Entity normalization
- Relationship generation
- Canonical schema mapping
- Identity resolution

### Rules
- Relationship generation happens here
- Normalization owns topology interpretation
- Preserve deterministic transformation behavior

### Must NOT
- Render UI
- Implement visualization logic
- Store UI state

### Related Decisions
- ADR-001
- ADR-002
- ADR-004

---

## Canonical Resource Graph

### Purpose
Authoritative infrastructure topology model.

### Likely Locations
- `/src/graph`
- `/src/domain`
- `/src/models`

### Responsibilities
- Canonical entities
- Canonical relationships
- Graph contracts
- Resource identity
- Shared topology semantics

### Rules
- This is the single source of truth
- Relationship ownership belongs here
- Downstream systems derive from this layer

### Must NOT
- Perform rendering
- Implement UI behavior
- Contain overlay state

### High-Risk Warning
Changes here affect nearly the entire platform.

### Related Decisions
- ADR-001
- ADR-004

---

## Traversal / Query Layer

### Purpose
Provides reusable graph traversal and analysis behavior.

### Likely Locations
- `/src/traversal`
- `/src/query`
- `/src/analysis`

### Responsibilities
- Path traversal
- Connectivity analysis
- Dependency analysis
- Flow analysis
- Topology querying

### Rules
- Traversal logic should remain centralized
- Reuse traversal systems rather than duplicating traversal behavior

### Must NOT
- Mutate graph ownership
- Implement rendering logic

### Related Decisions
- ADR-004
- ADR-006

---

## Projection / View Layer

### Purpose
Builds topology-specific graph projections for rendering and export.

### Likely Locations
- `/src/projections`
- `/src/views`
- `/src/transforms`

### Responsibilities
- Management hierarchy projections
- Network topology projections
- Security topology projections
- Layered topology views
- Progressive rendering support

### Rules
- Views are projections, not owners of state
- Do not independently infer topology relationships

### Must NOT
- Mutate canonical topology
- Duplicate traversal logic

### Related Decisions
- ADR-005

---

## Rendering Layer

### Purpose
Visualizes topology projections.

### Actual Locations (implemented)
- `apps/frontend/src/topology/containerLayout.ts` — layout engine: computes React Flow node positions from graph `Contains` edges; defines swimlane, region column, and container sizing
- `apps/frontend/src/topology/toFlowElements.ts` — converts `GraphEdge[]` → React Flow `Edge[]`; applies colour/style per `RelationshipType`
- `apps/frontend/src/topology/AzureNode.tsx` — leaf resource node (VM, NIC, NSG, etc.)
- `apps/frontend/src/topology/AzureContainer.tsx` — container node (RG, VNet, Subnet); centred target handle, border source handle
- `apps/frontend/src/topology/AzureSwimLane.tsx` — swimlane node (Subscription, ManagementGroup); vertical left label strip
- `apps/frontend/src/topology/AzureRegionColumn.tsx` — region column node; overflows swimlane top/bottom by `REGION_OVERHANG`
- `apps/frontend/src/topology/NodeDetailPanel.tsx` — right-side flyout panel; shows selected node metadata and raw JSON payload
- `apps/frontend/src/topology/nodeConfig.ts` — shared config per `ResourceType`: label, accent colour, icon component
- `apps/frontend/src/topology/icons.ts` — direct deep-import workaround for `@threeveloper/azure-react-icons` (broken barrel)
- `apps/frontend/src/pages/Topology.tsx` — React Flow canvas page; wires node types, click handlers, detail panel
- `apps/frontend/src/fixtures/azure-topology.ts` — demo topology: UK South + UK West HA/failover, single subscription

### Responsibilities
- React Flow rendering
- Node rendering (three modes: leaf, container, swimlane/region)
- Edge rendering with semantic colour coding
- Containment-driven layout (graph edges → nested React Flow nodes)
- Interaction behavior (click to inspect, pan/zoom)

### Rules
- Layout is driven entirely by `Contains` edges — the engine must not infer containment from resource types
- Handle positioning on containers is semantic: target = centred (attachment), source = border (boundary)
- `SWIMLANE_W` in `containerLayout.ts` and `STRIP_W` in `AzureSwimLane.tsx` must remain equal
- `REGION_OVERHANG` in `containerLayout.ts` is the single constant controlling region protrusion
- Rendering must remain topology-agnostic: no relationship inference in components

### Must NOT
- Derive topology independently
- Mutate graph state
- Infer `Contains` relationships from resource type names

### Related Decisions
- ADR-005, ADR-015, ADR-016

---

## Overlay / Simulation Systems

### Purpose
Provides analytical overlays on top of immutable topology.

### Likely Locations
- `/src/overlays`
- `/src/simulations`
- `/src/analysis`

### Responsibilities
- BCP/DR simulation
- SPOF analysis
- Security overlays
- Compliance overlays
- Connectivity overlays

### Rules
- Overlays compose state
- Baseline topology remains immutable

### Must NOT
- Mutate imported topology
- Replace canonical graph ownership

### High-Risk Warning
Overlay mutation bugs can corrupt architectural reasoning.

### Related Decisions
- ADR-006

---

## Export Systems

### Purpose
Exports topology views into external formats.

### Likely Locations
- `/src/export`
- `/src/serializers`

### Responsibilities
- Draw.io export
- Visio export
- Markdown export
- API documentation export

### Rules
- Export systems consume projections
- Exports should remain deterministic

### Must NOT
- Recompute topology
- Own relationship logic

---

# Configuration & Settings

## Environment Configuration

### Likely Locations
- `.env`
- `/config`
- `/settings`

### Responsibilities
- Runtime configuration
- Feature flags
- Local environment behavior

### Rules
- Keep secrets local-only
- Avoid embedding configuration into business logic

---

# High-Risk Areas (Handle Carefully)

These systems have large architectural blast radius.

---

## Canonical Graph Contracts
Changes affect:
- rendering
- overlays
- exports
- traversal
- governance systems

---

## Relationship Generation
Changes affect:
- topology correctness
- path analysis
- visualization
- simulation systems

---

## Traversal Logic
Changes affect:
- flow analysis
- overlay reasoning
- governance analysis
- connectivity systems

---

## Projection Systems
Changes affect:
- rendering behavior
- scalability
- progressive loading
- topology navigation

---

# Common Mistakes To Avoid

- Recomputing topology in UI components
- Duplicating traversal logic
- Mutating imported topology
- Introducing secondary topology ownership
- Embedding rendering assumptions into normalization
- Mixing overlays into baseline topology
- Creating parallel relationship systems

---

# How To Navigate The Codebase

## If you need to...

### Import new Azure resource types
→ Start in:
- import layer
- normalization layer

---

### Add new topology relationships
→ Start in:
- normalization layer
- canonical graph contracts

---

### Add new visualization types
→ Start in:
- projection layer
- rendering layer

---

### Add BCP/DR simulation
→ Start in:
- overlay systems
- traversal layer

---

### Add connectivity flow analysis
→ Start in:
- traversal/query systems
- overlay systems

---

### Add governance analysis
→ Start in:
- traversal layer
- projection layer
- overlay systems

---

### Add exports
→ Start in:
- projection layer
- export systems

---

### Diagnose topology inconsistencies
→ Check:
- normalization layer
- relationship generation
- graph contracts

---

### Diagnose rendering inconsistencies
→ Check:
- projections
- rendering adapters
- layout systems

---

# Final Guidance

If you are unsure where logic belongs:

1. Identify ownership
2. Identify the canonical layer
3. Avoid introducing parallel systems
4. Prefer extending existing architecture
5. Reassess before introducing new state

Architectural clarity is more important than implementation speed.