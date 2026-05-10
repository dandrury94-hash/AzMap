# tasks/lessons.md — AzMap

Purpose:
Capture durable engineering lessons, architectural insights, implementation mistakes, and conceptual understanding gained during development.

This file is:
- engineering memory
- architectural memory
- implementation guidance
- anti-regression guidance
- learning reinforcement

Update this file whenever:
- an important mistake is corrected
- a design assumption changes
- a better architectural approach is discovered
- a workflow improvement is identified
- a new engineering concept becomes understood

---

# Core Principles

- Lessons should be durable and reusable
- Focus on engineering understanding, not session history
- Capture why something mattered
- Capture what initially seemed correct but was wrong
- Prefer distilled insights over raw notes

---

# Session Workflow Lessons

## Wait for user confirmation before committing

After implementing a change, describe what to test and wait for explicit confirmation
that it works before running `git commit`.

Do not pre-emptively commit.

---

## Confirm repo and branch before touching any file

At session start:
- run `git status`
- run `git branch`

Confirm the correct repo and branch before proceeding.

---

## Check CHG number from CHANGELOG.md before writing any entry

Search CHANGELOG.md for the latest CHG number before writing a new entry.

Never assume numbering from memory.

---

## Scope work to what fits within remaining session limits

If context is running low:
- reduce scope
- complete cleanly
- avoid partial architectural implementations

A clean small change is better than a fragmented large one.

---

# Documentation Governance Lessons

## Lock architectural decisions before the session ends

Any locked architectural decision must be added to:
- CLAUDE.md
- DECISIONS.md

Decisions that exist only in chat are effectively lost.

---

## Keep documentation synchronized with architecture

Any session that changes:
- topology contracts
- relationship behavior
- protection models
- traversal logic
- overlay behavior
- rendering ownership

must update:
- DECISIONS.md
- FILES_OF_INTEREST.md
- CHANGE_IMPACT_MAP.md
- CHANGELOG.md

Documentation drift creates architectural drift.

---

# Engineering Lessons

## Read the actual source before writing integration code

Never write integration code until:
- the actual API shape
- source format
- documentation
- contracts

have been verified directly.

Do not guess shapes.

---

## Verify API response envelopes before writing client code

Inspect raw API responses first.

Do not assume:
- `.data`
- `.items`
- `.records`

or similar wrappers exist without verification.

---

## Per-item API calls must be isolated

A single item failure must not abort an entire batch operation.

Per-item integrations should:
- isolate failures
- continue processing
- log failures clearly

---

## Resolve stable values once before loops

Resolve:
- IDs
- configuration
- profiles
- static references

once before entering loops.

Avoid repeated resolution inside iterative operations.

---

## New persistent schema fields require compatibility planning

Any new stored field must consider:
- backward compatibility
- fallback behavior
- historical persistence

Treat stored data as immutable historical state.

---

## New integrations should default to restrictive behavior

New integrations or data sources should:
- default to disabled
- require explicit enablement
- avoid production-impacting behavior by default

---

# Architecture Lessons

## The canonical graph is the system

The graph is not just a storage structure.

It is:
- the infrastructure truth model
- the relationship authority
- the traversal authority
- the projection source
- the overlay foundation

Everything derives from it.

---

## Relationship ownership must remain centralized

Relationship logic scattered across:
- UI
- rendering
- exports
- overlays

creates inconsistent topology reasoning.

Relationship ownership belongs in normalization/graph layers.

---

## Views are projections, not owners

Topology views should:
- consume projections
- never own infrastructure truth
- never recompute topology independently

---

## Imported topology should remain immutable

Imported Azure payloads are baseline truth.

Simulations, overlays, and analytical systems should compose state on top rather than mutate imported topology.

This preserves:
- determinism
- replayability
- analytical consistency

---

## Overlay systems are analytical layers

BCP/DR, SPOF, security, and compliance systems should behave as overlays rather than alternate graph implementations.

This prevents topology corruption.

---

## Avoid parallel traversal systems

Traversal logic duplicated across:
- overlays
- exports
- rendering
- governance systems

will eventually diverge.

Traversal ownership should remain centralized.

---

## Progressive rendering scales better than full-environment rendering

Large Azure environments should progressively expose topology layers.

Avoid rendering entire environments simultaneously when projections can scope visibility.

---

# Mistakes & Anti-Patterns

## Things that initially seem correct but are usually wrong

- Recomputing topology inside UI components
- Mutating imported topology directly
- Embedding rendering assumptions into normalization
- Duplicating traversal logic
- Creating secondary relationship systems
- Premature abstractions before ownership is understood
- Combining overlays with canonical graph ownership
- Adding state before ownership boundaries are clear

---

# Azure & Infrastructure Lessons

## Azure relationships are more important than individual resources

The value of AzMap is not simply listing Azure resources.

The value comes from:
- relationships
- dependencies
- topology structure
- connectivity reasoning
- governance visibility

Relationship quality matters more than raw inventory size.

---

## Connectivity analysis requires layered reasoning

End-to-end flow analysis depends on:
- routing
- NSGs
- firewall policy
- peering
- identity boundaries
- topology traversal

This should evolve incrementally rather than being implemented prematurely.

---

## Governance overlays should remain explainable

CAF/WAF/compliance overlays should:
- explain reasoning
- expose assumptions
- remain traceable

Avoid opaque scoring systems.

---

# DevOps & Workflow Lessons

## Architectural sequencing matters

Advanced features should not begin before foundational contracts stabilize.

Examples:
- overlays
- simulations
- advanced exports
- connectivity analysis

all depend on:
- stable graph contracts
- stable traversal systems
- stable projections

---

## Clean architecture reduces AI drift

Strong:
- ownership boundaries
- documentation
- layer separation
- governance rules

significantly improve AI-assisted engineering consistency.

---

# Concepts To Revisit Later

These concepts are important but should not necessarily be implemented immediately.

---

## Potential Future Topics

- Graph databases
- CQRS
- Event sourcing
- Distributed caching
- Worker orchestration
- Async processing pipelines
- Incremental graph updates
- Background topology indexing
- Real-time topology updates
- Policy engines
- Graph query languages

---

# Question → Answer → Why It Matters

Use this structure when adding future lessons.

Example:

## Question
Why should overlays avoid mutating topology?

### Answer
Because overlays represent analytical perspectives rather than infrastructure truth.

### Why It Matters
Mutating baseline topology creates inconsistent traversal behavior, invalid exports, and unreliable simulations.

---

# Final Guidance

The objective of this file is not to record activity.

The objective is to accumulate engineering understanding over time.

Good engineering organizations institutionalize lessons.

This file is the beginning of that process for AzMap.