# DECISIONS.md — AzMap

> Architectural decisions in this file should be treated as append-oriented historical records wherever possible.
>
> Existing decisions should remain unless they are explicitly:
>
> * Superseded
> * Deprecated
> * Replaced by a newer ADR
>
> Historical architectural context is considered important project memory.
>
> Superseded decisions should not be silently removed. Instead, they should be marked with an updated status and linked to the newer decision that replaces them.
>
> Example:
>
> ```md
> Status: Superseded by ADR-006
> ```
>
> This approach improves:
>
> * Architectural traceability
> * AI session continuity
> * Historical reasoning
> * Change transparency
> * Long-term maintainability

# DECISIONS.md — AzMap

This document records architectural decisions that define the long-term structure, behavior, and evolution constraints of AzMap.

These decisions are considered foundational unless explicitly superseded by a newer documented decision.

The purpose of this document is to:

* Preserve architectural intent
* Prevent architectural drift
* Improve AI session continuity
* Reduce accidental redesigns
* Make tradeoffs explicit
* Explain why decisions were made

---

# ADR-001 — Canonical Resource Graph As Single Source Of Truth

## Status

Accepted

---

## Decision

AzMap will use a canonical normalized resource graph as the authoritative representation of imported infrastructure.

All downstream systems must derive from this graph, including:

* Visualization
* Governance analysis
* Connectivity analysis
* Export systems
* Search systems
* Future AI systems

The graph owns:

* Canonical resource identity
* Infrastructure topology
* Explicit resource relationships

---

## Rationale

Azure infrastructure is fundamentally relationship-driven.

Using a graph-centric architecture provides:

* Deterministic topology modeling
* Consistent relationship traversal
* Reusable rendering logic
* Simpler governance analysis
* Simpler future simulation systems
* Improved architectural clarity

Without a centralized graph model, downstream systems would independently recompute relationships, creating inconsistency and architectural entropy.

---

## Consequences

### Positive

* Simplifies rendering systems
* Simplifies governance systems
* Enables future overlays and simulations
* Enables future pathfinding and connectivity analysis
* Improves testing and determinism
* Creates a strong architectural center

### Negative

* Requires explicit normalization layer
* Requires ongoing Azure schema mapping maintenance
* Introduces graph modeling complexity earlier

---

## Rules

* Downstream systems must not independently redefine topology relationships.
* Relationship ownership belongs to the graph layer.
* Graph traversal logic should remain centralized.

---

# ADR-002 — Hybrid Modeling Strategy

## Status

Accepted

---

## Decision

AzMap will preserve:

1. Immutable raw Azure payloads
2. Normalized canonical entities

Raw payloads are preserved exactly as imported.

Normalization occurs separately.

---

## Rationale

Azure schemas evolve over time and may contain metadata not immediately modeled in the canonical graph.

Preserving raw payloads:

* Prevents data loss
* Simplifies future feature expansion
* Improves troubleshooting
* Allows future re-normalization
* Preserves import fidelity

Normalization provides:

* Stable traversal structures
* Simplified rendering
* Consistent topology modeling
* Simplified governance analysis

---

## Consequences

### Positive

* Preserves future flexibility
* Improves debuggability
* Avoids importer dead ends

### Negative

* Increases storage requirements
* Adds import complexity

---

## Rules

* Raw imported payloads are immutable.
* Canonical entities must not overwrite imported payloads.
* Topology derivation occurs only during normalization.

---

# ADR-003 — Read-Only Platform Architecture

## Status

Accepted

---

## Decision

AzMap is permanently read-only.

AzMap may:

* Import
* Normalize
* Analyze
* Visualize
* Export

AzMap will not:

* Modify Azure resources
* Deploy infrastructure
* Reconcile live infrastructure state
* Perform infrastructure mutations

---

## Rationale

A read-only model significantly simplifies:

* Security boundaries
* Operational safety
* Authentication complexity
* State management
* Failure recovery
* Governance trust

This aligns directly with the platform goal of architecture intelligence and topology reasoning.

---

## Consequences

### Positive

* Safer architecture
* Reduced operational complexity
* Easier local-first execution
* Reduced risk exposure

### Negative

* Cannot automate remediation
* Cannot function as deployment tooling

---

## Rules

* AzMap never writes back to Azure.
* Future integrations must preserve read-only behavior.

---

# ADR-004 — Explicit Relationship Modeling

## Status

Accepted

---

## Decision

Infrastructure relationships will be explicitly stored within the canonical graph.

Relationships are first-class architectural entities.

Example relationship types may include:

* contains
* attached_to
* connected_to
* secured_by
* routes_to
* peered_with
* depends_on
* fails_over_to

---

## Rationale

Repeatedly inferring relationships across multiple systems creates:

* Inconsistency
* Duplicate logic
* Hidden behavior
* Increased complexity

Explicit relationships provide:

* Deterministic traversal
* Simpler rendering
* Simpler analysis
* Better graph reasoning
* Better simulation support

---

## Consequences

### Positive

* Enables future traversal engines
* Enables path analysis
* Enables overlay systems
* Simplifies governance analysis

### Negative

* Requires relationship schema maintenance
* Requires stronger normalization discipline

---

## Rules

* Relationships should be generated during normalization.
* Consumers should traverse relationships rather than infer topology independently.

---

# ADR-005 — Progressive Rendering Architecture

## Status

Accepted

---

## Decision

AzMap will progressively expose topology layers as they become available.

The system should avoid requiring complete infrastructure rendering before becoming interactive.

Example progression:

1. Tenant hierarchy
2. Management groups
3. Subscriptions
4. Network topology
5. Compute topology
6. Security overlays
7. Governance overlays

---

## Rationale

Azure environments can become visually overwhelming.

Progressive rendering:

* Improves responsiveness
* Reduces cognitive overload
* Improves perceived performance
* Supports future scalability
* Aligns with topology-centric exploration

---

## Consequences

### Positive

* Better UX
* More scalable rendering model
* Better topology navigation

### Negative

* Requires asynchronous rendering coordination
* Adds UI state complexity

---

## Rules

* Views should derive from graph projections.
* Rendering systems should avoid full-environment rendering where unnecessary.

---

# ADR-006 — Overlay & Simulation Philosophy

## Status

Accepted

---

## Decision

Future simulation and analytical systems will operate as overlays on top of immutable imported topology.

Examples include:

* BCP/DR simulation
* SPOF analysis
* Connectivity analysis
* Security overlays
* Governance overlays
* Traffic flow visualization

Overlay systems must not mutate the baseline imported graph.

---

## Rationale

Separating imported truth from analytical overlays preserves:

* Determinism
* Traceability
* Reproducibility
* Safe experimentation

This architecture also enables multiple simultaneous analytical perspectives of the same topology.

---

## Consequences

### Positive

* Safer simulation systems
* Reversible analytical workflows
* Cleaner architectural separation
* Improved reasoning consistency

### Negative

* Requires overlay composition logic
* Adds future state-management complexity

---

## Rules

* Imported topology remains immutable.
* Overlays compose additional state.
* Simulations must not corrupt baseline topology.

---

# ADR-007 — Azure-Specific Platform Scope

## Status

Accepted

---

## Decision

AzMap is intentionally Azure-specific.

The platform will optimize for:

* Azure topology understanding
* Azure governance alignment
* Azure architectural analysis
* Azure networking and connectivity reasoning

Multi-cloud support is intentionally excluded.

---

## Rationale

Multi-cloud abstraction introduces:

* Excessive schema complexity
* Reduced governance quality
* Weak relationship semantics
* Increased learning overhead

An Azure-focused approach enables:

* Stronger architectural fidelity
* Better governance alignment
* Better visualization semantics
* Simpler normalization

---

## Consequences

### Positive

* Higher Azure fidelity
* Cleaner architecture
* Reduced complexity
* Better long-term governance analysis

### Negative

* Reduced platform breadth
* No cross-cloud topology support

---

## Rules

* Azure architecture quality is prioritized over multi-cloud abstraction.
* Azure semantics should remain first-class concepts.

---

# ADR-008 — Local-First Execution Model

## Status

Accepted

---

## Decision

AzMap initially operates as a local-first platform.

Imported infrastructure data remains on the local machine.

Cloud synchronization is intentionally excluded.

---

## Rationale

Local-first execution:

* Simplifies security
* Improves privacy
* Simplifies operational complexity
* Reduces hosting requirements
* Improves experimentation safety

This aligns with:

* Read-only architecture
* Learning-focused workflows
* Architecture analysis use cases

---

## Consequences

### Positive

* Improved privacy
* Reduced infrastructure complexity
* Easier onboarding

### Negative

* No collaborative multi-user workflows
* No centralized topology persistence

---

## Rules

* Imported customer topology data should never leave the local environment.

---

# ADR-009 — Engineering Learning-Oriented Development

## Status

Accepted

---

## Decision

AzMap is both:

1. A useful engineering platform
2. A structured engineering learning environment

Claude Code should prioritize:

* Architectural explanation
* Tradeoff analysis
* Dependency explanation
* System reasoning
* Workflow education

Over purely rapid implementation.

---

## Rationale

The project exists partially to:

* Learn system architecture
* Understand engineering workflow
* Learn clean architecture concepts
* Understand DevOps and testing workflows
* Learn application structure

Understanding system design is prioritized over memorizing implementation syntax.

---

## Consequences

### Positive

* Better long-term understanding
* Improved architectural consistency
* More intentional engineering decisions

### Negative

* Slower implementation pace
* Increased documentation overhead

---

## Rules

* Major architectural changes should be explained before implementation.
* Claude should explain dependency choices and tradeoffs.
* Architectural clarity is prioritized over rapid feature delivery.

---

# ADR-010 — V1 Canonical Graph Contracts

## Status

Accepted

---

## Decision

The V1 canonical graph model is defined by two TypeScript contracts:

```typescript
type GraphNode = {
  id: string;
  type: ResourceType;
  name: string;

  subscriptionId?: string;
  resourceGroup?: string;
  location?: string;

  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
  rawPayload?: unknown;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  metadata?: Record<string, unknown>;
};
```

---

## Rationale

The graph model must be defined before import or normalization implementation begins.
These contracts are the architectural center — all downstream systems (rendering, traversal,
export, governance) depend on them.

The contracts are intentionally kept abstract. SQLite is the persistence mechanism,
not the architecture. The graph contracts must remain independent of any storage
implementation details.

---

## Consequences

### Positive

* Normalization has a clear target contract
* Rendering systems have a stable input contract
* Traversal engines have a stable graph model to operate against
* Storage can evolve without changing graph semantics

### Negative

* `ResourceType` and `RelationshipType` enums need ongoing maintenance as new Azure resource types are supported

---

## Rules

* Normalization must produce `GraphNode` and `GraphEdge` records.
* Storage implementation must not leak into graph contracts.
* `ResourceType` and `RelationshipType` enumerations must be defined centrally and imported.

---

# ADR-011 — Vite Over Next.js For Frontend

## Status

Accepted

---

## Decision

The AzMap frontend will use Vite + React rather than Next.js.

---

## Rationale

AzMap is a locally hosted, single-user analysis tool. It has no requirements for:

* Server-side rendering
* Static site generation
* File-based routing
* Deployment to a CDN or edge network

Next.js introduces complexity optimized for none of these use cases.

Vite provides:

* Faster development iteration
* Simpler mental model
* No SSR overhead
* Clearer frontend architecture as a learning surface

---

## Consequences

### Positive

* Simpler frontend architecture
* Faster development startup
* Clearer layer boundaries for learning
* No SSR complexity in V1

### Negative

* If AzMap ever becomes a hosted web service, a migration to a server-rendering framework may be required

---

## Rules

* Frontend is a Vite + React + TypeScript application.
* No SSR patterns should be introduced in V1.

---

# ADR-012 — React Flow + Dagre For Rendering

## Status

Accepted

---

## Decision

Topology rendering will use React Flow as the rendering system and dagre as the initial layout engine.

ELK (Eclipse Layout Kernel) will be evaluated later if topology complexity or layout requirements exceed dagre's capabilities.

---

## Rationale

React Flow is purpose-built for node-graph visualization and integrates naturally with React.

Dagre provides hierarchical layout algorithms suitable for:

* Management group hierarchies
* Subscription trees
* Network topology

ELK provides more sophisticated layout algorithms (layered, force-directed, orthogonal routing)
but adds significant complexity. Deferring ELK avoids premature dependency introduction.

---

## Consequences

### Positive

* React Flow is well-documented and actively maintained
* Dagre is lightweight and sufficient for V1 topology
* Clear upgrade path to ELK if needed

### Negative

* Dagre may have limitations with very large or deeply nested topologies
* Layout algorithm selection may need revisiting in later phases

---

## Rules

* React Flow is the rendering system.
* Dagre is the V1 layout engine.
* ELK adoption requires an explicit decision (new ADR) if pursued.

---

# ADR-013 — pnpm Workspaces For Monorepo Structure

## Status

Accepted

---

## Decision

The AzMap repository will use pnpm workspaces as its monorepo structure.

This enables:

* Shared TypeScript packages (canonical graph contracts, domain types, API contracts)
* Separate frontend and backend packages
* Lightweight workspace management without premature orchestration tooling

---

## Rationale

With both a TypeScript frontend and a TypeScript backend, shared types are necessary
to keep graph contracts, API response shapes, and domain models consistent across the stack.

pnpm workspaces provides this with minimal configuration overhead.

Turborepo or NX are intentionally deferred — they solve build orchestration problems
that do not yet exist at this scale.

---

## Consequences

### Positive

* Shared canonical graph contracts across frontend and backend
* Avoids duplicated type definitions
* Lightweight and understandable
* Clear upgrade path to Turborepo if build complexity grows

### Negative

* pnpm workspace configuration requires upfront structure decisions

---

## Rules

* Shared TypeScript types must live in a shared workspace package.
* Canonical graph contracts (`GraphNode`, `GraphEdge`, `ResourceType`, `RelationshipType`) must be imported from the shared package, never duplicated.

---

# ADR-014 — Single Governance Source

## Status

Accepted

---

## Decision

`System_Prompt.md` is removed.

CLAUDE.md is the single authoritative operating document for Claude Code within this repository.

Duplicate governance sources are explicitly forbidden.

---

## Rationale

Multiple governance documents covering the same responsibility create drift.
If CLAUDE.md and System_Prompt.md diverge, Claude Code may receive inconsistent instructions.

CLAUDE.md is read automatically by Claude Code. A separate system prompt file adds
maintenance overhead with no architectural benefit.

---

## Rules

* CLAUDE.md is the only Claude Code operating document.
* Governance documents must not duplicate each other's responsibilities.
* If a governance gap exists, add it to the appropriate existing document.

---

# ADR-015 — Visual Hierarchy: Swimlane Subscription, Region Column Overhang

## Status

Accepted

---

## Decision

The topology canvas uses three distinct container rendering modes, each with a specific visual contract:

1. **Regular containers** (`azureContainer`) — standard resource containers (ResourceGroup, VirtualNetwork, Subnet). Rendered with a coloured top header band and a full border. Children are positioned below the header.

2. **Swimlane containers** (`azureSwimLane`) — Subscription and ManagementGroup. Rendered as a horizontal band with a narrow vertical label strip on the left (36px). No top/bottom header band. Region columns sit to the right of the strip. Multiple subscriptions stack as additional swimlane rows.

3. **Region columns** (`azureRegionColumn`) — Region nodes. Rendered as a bordered, tinted column card that protrudes `REGION_OVERHANG = 36px` above and below the subscription swimlane edge. The region header label sits in the top overhang area. React Flow's `extent: 'parent'` is omitted so the card is not clipped to the subscription boundary.

The layout hierarchy is: `Subscription (swimlane) → Region (column) → ResourceGroup → resources`.

Subscriptions are the outer layout container because a subscription is the billing/RBAC boundary that *owns* the resources in each region. Regions are not independent Azure resources — they are a deployment location attribute. Rendering regions as swimlane rows inside subscriptions (rather than the inverse) means that each subscription's region set is explicit and independently visible.

---

## Rationale

When a second subscription is imported, it adds a second swimlane row. Each row contains its own set of region column labels. Region labels are not shared across subscriptions — this is intentional. A Resource Group in "Production / UK South" is semantically distinct from one in "Development / UK South" even though the Azure region is the same physical location.

This avoids the false implication that resources in different subscriptions share a governance boundary simply because they share a region.

---

## Consequences

### Positive

* Subscription boundary is always visually explicit
* Region labels are unambiguous — each belongs to a specific subscription context
* Multiple subscriptions are cleanly supported by adding swimlane rows
* Region overhang provides clear column delineation without covering the subscription label

### Negative

* A region name (e.g. "UK South") appears once per subscription row, not once globally
* Cross-subscription region alignment requires future layout work if desired

---

## Rules

* Subscription always renders as `azureSwimLane`.
* Region always renders as `azureRegionColumn` with `extent: 'parent'` omitted.
* Layout engine derives swimlane height from region *content* height (not inflated region dims) to ensure symmetric overhang.
* `SWIMLANE_W` in the layout engine and `STRIP_W` in `AzureSwimLane.tsx` must remain equal.
* `REGION_OVERHANG` in the layout engine is the single source of truth for how far region cards protrude.

---

# ADR-016 — Container Handle Semantics

## Status

Accepted

---

## Decision

Container nodes (`azureContainer`, `azureRegionColumn`) use differentiated handle positioning to encode visual meaning:

- **Target handle (inbound connections)**: centred within the container (`top: 50%, left: 50%`). Edges terminate *inside* the box. Used for relationships where a resource is *attached to* or *inside* the container — e.g. `ConnectedTo` (NIC → Subnet) signals that the NIC's IP lives within the subnet's address space.

- **Source handle (outbound connections)**: on the bottom border (standard position). Edges exit from the *outer wall*. Used for relationships where the container *governs* or *points to* something external — e.g. `SecuredBy` (Subnet → NSG) signals that the NSG enforces a boundary at the subnet's edge.

---

## Rationale

In Azure, the distinction matters architecturally:

- A NIC *lives inside* a subnet — its IP is allocated from the subnet's address prefix. The edge should appear to enter the subnet.
- An NSG *governs the boundary* of a subnet — it filters traffic at the perimeter. The edge should appear to exit from the outer wall toward the NSG.

Uniform handle positioning (all edges at the border) loses this semantic distinction.

---

## Consequences

### Positive

* Edges carry architectural meaning beyond their colour/style
* Subnet boxes no longer appear empty — the inbound NIC edge visually occupies the interior
* Security boundary relationships are visually distinct from attachment relationships

### Negative

* Handle positioning is a visual convention — not enforced by the graph model
* Edge routing in React Flow may occasionally produce curved paths that look unexpected when handles are centred

---

## Rules

* Target handles on containers must remain centred.
* Source handles on containers must remain on the bottom border.
* This convention must be preserved when adding new container node types.

---

# ADR-017 — Two-Pass Normalization Strategy

## Status

Accepted

---

## Decision

The `normalizeAzureResources` function in `jsonNormalizer.ts` processes the resource array in exactly two passes:

**Pass 1** — Nodes, organisational hierarchy, and self-contained relationships.
For each resource: create its GraphNode, build the Subscription → Region → ResourceGroup hierarchy
on demand, and extract any relationships that are derivable from the resource's own `properties`
object (e.g. RouteTable → associated subnets, AzureFirewall → FirewallPolicy). VNet subnets are
also extracted here because they are embedded inside the VNet payload, not separate top-level
resources.

**Pass 2** — Cross-resource NIC and VM relationships.
A second iteration over the resource array to create edges that span two resources: NIC → Subnet,
NIC → NSG, NIC → LoadBalancer, and VM → NIC. This pass runs after Pass 1 is complete, so all
Subnet and NIC nodes are guaranteed to already exist in the node map regardless of the ordering
of resources in the input array.

---

## Rationale

A single-pass design cannot safely handle cross-resource references because Azure resource exports
have no guaranteed ordering. A NIC might appear before the VNet (and thus before the Subnet nodes
embedded in that VNet) in the flat resource array. If NIC → Subnet edges were created in a single
pass, they would silently reference non-existent nodes whenever the NIC preceded its VNet in the
input.

The two-pass design eliminates this ordering dependency:
- Pass 1 is a "build the world" pass — every node that can exist, will exist after Pass 1 completes.
- Pass 2 is a "wire the world" pass — it can freely reference any node created in Pass 1.

The alternative (a topological sort of the resource array before processing) would require knowing
which resource types depend on which other types, adding fragile coupling between the pass logic
and the type system. The two-pass approach is simpler and more maintainable.

---

## Consequences

### Positive

* Resource array ordering does not affect graph correctness
* Each pass has a clear, single responsibility
* New relationship types can be added to the appropriate pass without affecting the other

### Negative

* The resource array is iterated twice (acceptable — the array is typically 10–10,000 items)
* Cross-resource relationship types that are not NIC or VM must be consciously placed in the
  correct pass (Pass 1 if self-contained, Pass 2 if cross-resource)

---

## Rules

* Pass 1 must create all nodes and all self-contained relationships.
* Pass 2 may only create relationships; it must not create nodes.
* Any relationship derivable from a single resource's own properties belongs in Pass 1
  (via `extractNetworkRelationships`).
* Any relationship that references another resource's node belongs in Pass 2.

---

# ADR-018 — Silent Skipping Policy For Unknown Resource Types

## Status

Accepted

---

## Decision

Azure resource types that do not appear in `AZURE_TYPE_MAP` are silently skipped during
normalization. No warning is emitted, no error is thrown, and no placeholder node is created.
The resource is simply not included in the output graph.

---

## Rationale

Real Azure environments always contain resource types that AzMap has not modeled:

* Management-plane-only services (e.g. `Microsoft.Authorization/roleAssignments`,
  `Microsoft.PolicyInsights/policyStates`)
* Preview services that exist in some tenants but not others
* Provider registration resources (e.g. `Microsoft.Features/featureProviders`)
* Resource types added to Azure after the last AzMap update

If AzMap emitted a warning for every unknown type, a typical Resource Graph export would produce
dozens of warnings for resources the user cannot do anything about. This noise would hide the
genuinely useful warnings (e.g. a resource with a missing `id` field that may indicate a malformed
export).

The silent-skip policy keeps the warning surface meaningful: warnings are only emitted for
resources that look broken, not for resources that are simply unrecognized.

---

## Consequences

### Positive

* Imports from realistic environments do not produce noisy warning lists
* Warnings remain high-signal and actionable
* Adding support for a new resource type is always additive — existing behavior is unchanged

### Negative

* A user cannot easily discover which resource types were silently dropped from their import
* If `AZURE_TYPE_MAP` has a typo, the affected type will be silently skipped rather than
  surfacing as an error

---

## Rules

* Unknown ARM types must be silently skipped (`continue` in the normalizer loop).
* Warnings are reserved for structurally malformed resources (missing `id` or `type`).
* A future "import summary" feature may expose skipped type statistics without promoting them to warnings.

---

# ADR-019 — Canvas-Level Peering Bus Zone

## Status

Accepted

---

## Decision

VNet peering edge bus lanes run in a dedicated vertical strip on the canvas between the MG section and the subscription swimlane section. The strip height is computed from the number of deduplicated peering pairs:

```
peeringBusZoneHeight = PEER_BUS_PAD × 2 + numPeeringEdges × PEER_LANE_STEP
```

Each peering edge receives an absolute canvas Y coordinate (`busY = peeringBusOriginY + laneIndex × PEER_LANE_STEP`) injected into its `data` property in `Topology.tsx`. `PeeringEdge` reads `data.busY` directly and draws a ⊓-shaped path (tine up → bus → tine down). The bus Y is never re-derived from handle positions.

If there are no peering edges, `peeringBusZoneHeight = 0` and swimlanes are positioned at their normal offset with no gap.

Per-peer handles on VNet nodes (`peer-src-{peerId}` / `peer-tgt-{peerId}`) are spread evenly across the top edge of each VNet container. Handle positions are derived from the sorted `peerIds` list injected into each VNet's node data from `Topology.tsx`.

---

## Rationale

The previous design computed `busY = min(sourceY, targetY) − LIFT − laneIndex × STEP`. Because VNet nodes are deeply nested inside RG → Region → Swimlane containers, the resulting `busY` value often fell within the card stack, causing horizontal bus segments to visually intersect container header bands.

Using an absolute canvas Y that is structurally above all swimlane content — enforced by layout offset, not by a large enough lift constant — makes the guarantee architectural rather than fragile. No value of `LIFT` is reliably "large enough" because swimlane content depth varies per environment.

Single-handle peering (all edges converging on `id="peer"` at center-top) produced a visual star-burst of lines from one point, making individual peering relationships impossible to trace.

---

## Consequences

### Positive

* Horizontal bus segments are guaranteed clear of all card content regardless of nesting depth
* Per-peer handles spread the connection points across the VNet, making individual peerings traceable
* Peering bus zone height responds to data — zero overhead when no peerings are present
* `peeringBusOriginY` is the single source of truth; no consumer re-derives it

### Negative

* Tine segments (vertical lines from VNet handle up to bus) still cross card borders — unavoidable since VNets are nested
* Canvas layout must be recomputed when the peering edge count changes

---

## Rules

* `PeeringEdge` must read `data.busY` directly — it must never re-derive bus Y from handle positions.
* `peeringBusOriginY` is owned by `Topology.tsx`; all peering edge `busY` values must derive from it.
* Swimlane offset must account for both `mgLayout.sectionHeight` and `peeringBusZoneHeight`.
* VNet `peerIds` must be sorted alphabetically before being injected into node data (stable handle positions).

---

# ADR-020 — HTML-Layer Edge Labels via EdgeLabelRenderer

## Status

Accepted

---

## Decision

All edge label rendering must use React Flow's `EdgeLabelRenderer` portal component, which places labels in an HTML div overlay above the node card layer. SVG-native edge labels (`labelBgStyle`/`labelStyle` props on default React Flow edges) are not used.

Each custom edge component (`BusEdge`, `PeeringEdge`, `MgBusEdge`, `RelationshipEdge`) renders its label inside `<EdgeLabelRenderer>` as an HTML `<div>` with `position: absolute` and a `transform: translate(...)` derived from the edge's canvas coordinates.

---

## Rationale

React Flow's rendering architecture stacks:
1. SVG edges layer (bottom)
2. HTML node cards layer (above SVG)
3. `EdgeLabelRenderer` HTML portal layer (top)

SVG-rendered labels (`<text>` elements within the edges SVG) are structurally below the HTML node card layer. In environments where edges pass beneath containers, their labels are occluded by the card backgrounds. This is not a z-index problem — it is a DOM stacking order problem that cannot be resolved by CSS `z-index` on SVG elements.

`EdgeLabelRenderer` places a `position: absolute` HTML div that is a sibling of the node card layer and sits above it, guaranteeing labels are always readable regardless of card overlap.

---

## Consequences

### Positive

* Edge labels always appear in front of all node card backgrounds
* Label styling uses standard CSS — no SVG text rendering constraints
* Consistent behavior across all edge types

### Negative

* Labels must be positioned manually using computed canvas coordinates (no automatic midpoint from React Flow's label system)
* Custom edges must import and use `EdgeLabelRenderer` explicitly

---

## Rules

* No custom edge component may use the `label`, `labelStyle`, or `labelBgStyle` React Flow props to render labels — these produce SVG-layer labels that will be obscured by node cards.
* All edge labels must be rendered inside `<EdgeLabelRenderer>`.
* The background behind label text must be a solid-fill HTML element (e.g. `background: '#111827'`) — not SVG `labelBgStyle`.
