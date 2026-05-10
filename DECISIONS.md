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
