# CHANGE_IMPACT_MAP.md — AzMap

Purpose: make it immediately obvious where to look and what to touch when implementing or modifying a feature.

This prevents:
- scattered edits
- hidden coupling
- duplicated logic
- architectural drift
- accidental topology corruption

---

# Core Principle

Every meaningful change should map to one primary architectural layer, with explicitly understood ripple effects.

AzMap is a graph-centric architecture.

This means:
- downstream systems derive from the canonical graph
- relationships are centralized
- topology ownership is explicit
- overlays compose additional state rather than mutating baseline topology

---

# Safe Change Pattern

When implementing any feature:

1. Identify the primary architectural layer
2. Modify only that layer first
3. Follow the impact map to evaluate downstream effects
4. Verify:
   - No duplicated logic was introduced
   - No forbidden patterns were used
   - No secondary topology derivation was introduced
   - CHANGELOG.md is updated

---

# High-Level Architecture Flow

```text
Azure Imports
    ↓
Import Layer
    ↓
Normalization Layer
    ↓
Canonical Resource Graph (SSOT)
    ↓
Traversal / Query Layer
    ↓
Projection / View Layer
    ↓
Rendering Layer
    ↓
Overlay / Simulation Systems
    ↓
Export / Documentation Systems
```

---

# Critical Architectural Rules

## Imported topology is immutable
- Imported Azure payloads must never be modified
- Simulation systems operate as overlays
- Analytical systems compose state rather than mutating topology

---

## Relationships are first-class entities
- Relationships must be generated centrally
- Relationship ownership belongs to the graph layer
- Downstream systems must traverse relationships rather than infer topology independently

---

## Views are projections
- Views do not own infrastructure truth
- Rendering systems consume graph projections
- UI systems must not recompute topology relationships

---

# Anti-Patterns (Do Not Introduce)

- Recomputing topology in the presentation layer
- Writing to external systems outside designated service boundaries
- Adding undocumented state stores
- Mixing business logic into the UI layer
- Introducing secondary topology derivation
- Mutating imported topology during simulations
- Duplicating graph traversal logic across systems
- Introducing parallel relationship engines

---

# Impact Map

---

## 1. Import Layer Changes

Examples:
- New Azure import format
- ARM parser updates
- Resource Graph import changes
- Terraform state ingestion

### Primary Areas
- Import services
- Parsing utilities
- Import validation
- Raw payload persistence

### Likely Required Changes
- Normalization mappings
- Resource type resolution
- Validation rules
- Import test fixtures

### Must Also Check
- Normalization layer
- Graph entity generation
- Error handling behavior
- Partial import handling

### Must NOT Touch
- Rendering logic
- Overlay systems
- UI topology derivation

---

## 2. Normalization Layer Changes

Examples:
- New resource mappings
- Relationship derivation changes
- Canonical schema updates

### Primary Areas
- Entity normalization
- Relationship generation
- Canonical graph contracts

### Likely Required Changes
- Traversal logic
- Projection logic
- Graph validation
- Test fixtures

### Must Also Check
- Rendering systems
- Governance systems
- Connectivity analysis
- Export systems
- Overlay compatibility

### High-Risk Warning
This is one of the highest blast-radius areas in the platform.

Relationship changes affect nearly every downstream system.

### Must NOT Touch
- Presentation rendering behavior directly
- UI state workarounds

---

## 3. Canonical Graph Schema Changes

Examples:
- Entity identity changes
- Relationship schema changes
- Metadata contract changes

### Primary Areas
- Graph models
- Shared domain types
- Canonical schemas

### Likely Required Changes
- Traversal engines
- Rendering projections
- Export systems
- Governance logic
- Overlay systems

### Must Also Check
- Backward compatibility
- Existing imports
- Projection assumptions
- Overlay assumptions

### High-Risk Warning
Changing canonical identity rules may invalidate:
- overlays
- cached projections
- exports
- path traversal assumptions

### Must NOT Touch
- Ad-hoc compatibility patches in UI components

---

## 4. Traversal / Query Layer Changes

Examples:
- Connectivity analysis
- Pathfinding
- Dependency traversal
- Flow analysis

### Primary Areas
- Graph traversal services
- Query engines
- Relationship traversal utilities

### Likely Required Changes
- Connectivity projections
- Overlay systems
- Governance traversal logic

### Must Also Check
- Performance implications
- Circular traversal protection
- Relationship consistency

### Must NOT Touch
- Direct graph mutation
- Rendering ownership logic

---

## 5. Projection / View Layer Changes

Examples:
- New topology views
- Filter systems
- Hierarchical projections
- Topology grouping

### Primary Areas
- View builders
- Projection transformers
- Query composition

### Likely Required Changes
- UI rendering
- Filtering behavior
- Progressive loading behavior

### Must Also Check
- Rendering scalability
- Topology consistency
- Projection determinism

### Must NOT Touch
- Canonical graph ownership
- Relationship derivation logic

---

## 6. Rendering Layer Changes

Examples:
- React Flow updates
- Node rendering
- Edge rendering
- Layout behavior

### Primary Areas
- UI components
- Layout systems
- Rendering adapters
- Edge/node presentation

### Likely Required Changes
- Projection compatibility
- Interaction behavior
- Rendering performance

### Must Also Check
- Progressive rendering
- Zoom-level consistency
- Overlay rendering compatibility

### Must NOT Touch
- Canonical graph mutation
- Relationship generation

---

## 7. Overlay / Simulation Changes

Examples:
- BCP overlays
- SPOF analysis
- Failover simulation
- Security overlays
- Compliance overlays

### Primary Areas
- Overlay engines
- Simulation state
- Analytical projections

### Likely Required Changes
- Visualization rules
- Traversal logic
- Highlighting systems

### Must Also Check
- Overlay isolation
- State composition
- Baseline topology preservation

### High-Risk Warning
Overlay systems must never mutate baseline topology.

### Must NOT Touch
- Imported payloads
- Canonical graph ownership

---

## 8. Export System Changes

Examples:
- Draw.io export
- Visio export
- Markdown documentation
- API documentation

### Primary Areas
- Export adapters
- Serialization systems
- Projection formatting

### Likely Required Changes
- Projection compatibility
- Metadata formatting
- Layout translation

### Must Also Check
- Stable graph contracts
- Export determinism
- Large environment handling

### Must NOT Touch
- Graph ownership logic
- Import pipelines

---

# Mental Model

If you are unsure where something belongs, ask:

- "What was imported?" → import layer
- "What is the canonical topology?" → graph layer
- "How do resources relate?" → relationship/traversal layer
- "What topology slice is needed?" → projection layer
- "How is it displayed?" → rendering layer
- "What analytical perspective is applied?" → overlay layer
- "How is it exported?" → export layer

If a change does not clearly map to a layer:
- pause
- reassess
- clarify ownership before implementation

Architectural ambiguity usually creates future technical debt.