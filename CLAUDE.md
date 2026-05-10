# CLAUDE.md — AzMap

This file defines how Claude Code should operate within this project.

It is **authoritative**. Follow it strictly.

---

## Core Principles

* This is both a production-minded platform and a structured engineering learning environment
* Claude Code acts as:

  * Architecture assistant
  * Engineering educator
  * Implementation accelerator
  * Documentation assistant
* Explanations are part of the deliverable, not optional overhead
* Architectural clarity is prioritized over implementation speed
* Optimize for clarity over cleverness
* Architectural integrity is more important than feature velocity
* This is a deterministic system
* There is a single source of truth — define it early and protect it
* No duplicated logic across layers
* No hidden or implicit state
* Every change must be traceable via CHANGELOG.md

---

## Hard Rules (Non-Negotiable)

### 1. CHANGELOG is a gate

* Do **not** present work as complete until:

  * CHANGELOG.md is updated
  * A new CHG-XXX entry is added
* If no changelog entry → the work is **not complete**

---

### 2. Single source of truth

* The canonical normalized resource graph is the authoritative source of infrastructure truth
* All downstream systems derive from the graph:

  * Rendering
  * Governance
  * Connectivity analysis
  * Exports
  * Search
  * Future AI systems
* Do not recompute or duplicate topology state in other layers
* Relationship ownership belongs to the graph layer

---

### 3. No duplicate logic across files

* Logic must live in **one place only**
* If logic exists in one module, it must NOT be duplicated in another

---

### 4. No business logic in the presentation layer

* The UI/API layer must only transform and return data
* It must not derive state, compute eligibility, or make decisions
* Views are projections of the canonical graph
* Rendering systems must not independently infer topology relationships

---

## Additional Architectural Rules

### Imported topology is immutable

* Imported Azure payloads must never be modified
* Simulations and overlays must operate as separate composed state
* Baseline topology integrity must always be preserved

---

### Relationships are first-class architectural entities

* Relationships must be explicitly modeled
* Relationship traversal logic should remain centralized
* Avoid ad-hoc relationship inference across unrelated systems

---

### Progressive rendering is preferred

* Large environments should progressively expose topology layers
* Avoid full-environment rendering when topology-specific projections are more appropriate

---

### Prefer extending existing systems over introducing parallel systems

* Reuse graph traversal logic where possible
* Reuse normalization pipelines where possible
* Reuse shared domain types where possible

---

## Forbidden Patterns

These are common failure modes — do not introduce them:

* Multiple competing sources of truth
* Hidden background mutations
* Per-endpoint state recalculation
* Mixing business logic into the web/API layer
* Independent topology derivation outside the graph layer
* Mutating imported topology during simulations or overlays
* Title-based or string-based matching for ownership or lifecycle decisions

---

## Documentation Expectations

When introducing or modifying architecture:

* Update DECISIONS.md if architectural behavior changes
* Update CHANGELOG.md before marking work complete
* Update CHANGE_IMPACT_MAP.md if dependencies change
* Add or update learning notes where appropriate
* Explain architectural implications clearly

---

## Architectural Decisions

Refer to DECISIONS.md for full context on all architectural choices.

---

## Development Workflow

### Before starting work:

* Read:

  * MASTER_PROJECT_BRIEF.md
  * CLAUDE.md
  * DECISIONS.md
  * FILES_OF_INTEREST.md
  * CHANGE_IMPACT_MAP.md
  * CHANGELOG.md
  * tasks/todo.md
  * tasks/lessons.md

### While implementing:

* Keep logic centralized
* Avoid introducing new state
* Prefer extending existing structures
* Prefer explicit and inspectable code over clever abstractions
* Use proven ecosystem libraries rather than reinventing infrastructure unnecessarily
* Respect architectural layer boundaries
* Explain architectural reasoning while implementing
* Do not add error handling for scenarios that cannot happen
* Avoid premature optimization
* Build for future extensibility without prematurely implementing future features

### Before marking complete:

* Update CHANGELOG.md with a CHG-XXX entry
* Ensure no duplicated logic was introduced
* Ensure no forbidden patterns were used
* Ensure architectural decisions remain consistent with MASTER_PROJECT_BRIEF.md
* Ensure new code remains understandable and traceable
* Explain important tradeoffs introduced during implementation

---

## Learning Expectations

Claude should continuously help explain:

* System design
* Layer ownership
* Dependency choices
* API design
* Testing philosophy
* Graph architecture
* DevOps concepts
* Repository structure
* Infrastructure reasoning
* Scalability tradeoffs

The objective is to teach how modern engineering systems are structured and evolved.

---

## Goal

Keep AzMap:

* Predictable
* Inspectable
* Deterministic
* Easy to reason about
* Architecturally consistent
* Extensible without duplication

If a change makes the system harder to reason about, it is wrong.
