# MASTER_PROJECT_BRIEF.md — AzMap

## 1. Purpose

AzMap is a locally hosted Azure topology intelligence platform designed to ingest Azure infrastructure exports, normalize them into a canonical graph model, and progressively render layered architectural views for visualization, governance analysis, resilience planning, and connectivity reasoning.

The primary purpose of AzMap is to help Azure architects and engineers:

* Understand Azure environments visually
* Navigate complex Azure topologies
* Identify architectural risks and SPOFs
* Analyze network and security relationships
* Explore failover and resiliency scenarios
* Understand governance alignment
* Learn and reason about cloud architecture more effectively

AzMap is intentionally designed as a read-only analysis platform.

It will never modify Azure resources.

---

# 2. Product Vision

AzMap aims to evolve into a topology-centric Azure architecture analysis platform built around a canonical infrastructure graph.

The long-term vision is to provide:

* Progressive layered topology exploration
* Governance and architecture analysis
* Connectivity and traffic flow reasoning
* BCP/DR simulation overlays
* Security and compliance visualization
* Architecture documentation generation
* Export capabilities for engineering and architecture workflows

The system should allow users to move between different architectural perspectives of the same environment, including:

* Tenant and management hierarchy
* Subscription structure
* Network topology
* Connectivity flows
* Security boundaries
* Failover and resiliency paths
* Governance and compliance overlays

All views must derive from the same canonical graph model.

---

# 3. Non-Goals

The following are explicitly out of scope for early AzMap versions:

* Multi-cloud support
* Real-time Azure synchronization
* Azure resource modification
* Enterprise SaaS architecture
* Multi-user collaboration
* Continuous configuration drift reconciliation
* Infrastructure deployment orchestration
* Advanced AI copilots in V1
* Enterprise-scale distributed processing
* Manual diagram editing systems

AzMap is not intended to become:

* A generic diagramming tool
* A replacement for Azure Portal
* A CMDB platform
* A live infrastructure automation platform

The focus is topology intelligence and architectural reasoning.

---

# 4. Core Architectural Principles

## 4.1 Canonical Graph Is The Single Source Of Truth

AzMap uses a canonical normalized resource graph as the authoritative representation of imported infrastructure.

All downstream systems derive from this graph, including:

* Visualization
* Governance analysis
* Connectivity reasoning
* Exports
* Search
* Future AI capabilities

No downstream layer should independently recompute topology relationships.

---

## 4.2 Read-Only Architecture

AzMap is permanently read-only.

The platform:

* Ingests
* Normalizes
* Analyzes
* Visualizes
* Exports

It does not modify Azure resources.

This simplifies:

* Security
* State management
* Operational safety
* Authentication complexity
* Drift reconciliation

---

## 4.3 Deterministic System Design

AzMap should behave deterministically.

Given the same imported input:

* The same graph should be produced
* The same relationships should exist
* The same views should render
* The same governance results should appear

Hidden state and implicit behavior should be avoided.

---

## 4.4 Progressive Topology Rendering

Large Azure environments should not require full rendering before becoming usable.

AzMap should progressively expose topology layers as they become available.

Example progression:

1. Tenant / Management Group structure
2. Subscriptions
3. Networking topology
4. Compute topology
5. Connectivity relationships
6. Security overlays
7. Governance overlays

This improves:

* User experience
* Responsiveness
* Scalability
* Cognitive clarity

---

## 4.5 Explicit Relationship Modeling

Relationships are first-class architectural entities.

Relationships should be explicitly stored rather than inferred repeatedly.

Examples include:

* contains
* attached_to
* connected_to
* secured_by
* routes_to
* peered_with
* depends_on
* fails_over_to

Explicit relationships simplify:

* Graph traversal
* Rendering
* Governance analysis
* Connectivity analysis
* Simulation overlays

---

## 4.6 Layer Separation

AzMap must maintain clear separation between:

* Importing
* Normalization
* Graph storage
* Traversal/query logic
* Visualization
* Governance analysis
* Export systems
* Simulation overlays

Business logic must not leak into the presentation layer.

---

## 4.7 Architectural Integrity Over Feature Velocity

AzMap prioritizes:

* Clarity
* Determinism
* Inspectability
* Maintainability
* Explicit ownership

Over:

* Clever abstractions
* Premature optimization
* Feature quantity
* Rapid uncontrolled iteration

If a feature introduces architectural confusion, it should be reconsidered.

---

# 5. Canonical Resource Graph

## 5.1 Overview

The canonical resource graph is the architectural center of AzMap.

It represents:

* Normalized Azure infrastructure entities
* Explicit relationships
* Topology metadata
* Immutable references to imported payloads

The graph acts as the single source of truth.

---

## 5.2 Hybrid Modeling Strategy

AzMap preserves:

1. Raw imported Azure payloads
2. Normalized canonical entities

Raw payloads are immutable.

Normalization creates stable graph entities suitable for:

* Rendering
* Traversal
* Governance analysis
* Export generation

---

## 5.3 Graph Ownership Rules

The graph owns:

* Infrastructure topology
* Resource relationships
* Canonical entity identity

Other systems may attach metadata overlays later, including:

* Governance annotations
* Visualization metadata
* Simulation overlays
* User annotations
* AI-generated insights

However, topology ownership remains centralized.

---

## 5.4 Graph Consumers

The following systems consume graph data:

* UI rendering
* Governance engine
* Connectivity engine
* Export engine
* Search systems
* Future AI systems

Consumers must not redefine topology relationships independently.

---

# 6. Rendering Philosophy

AzMap uses topology-specific views rather than rendering all infrastructure simultaneously.

Initial views may include:

* Tenant hierarchy
* Management groups
* Subscription structure
* Network topology
* Compute topology
* Security topology

Future views may include:

* Connectivity paths
* Traffic flow analysis
* BCP/DR overlays
* Governance overlays
* Compliance overlays

Views are projections of the canonical graph.

Views do not own infrastructure truth.

---

# 7. Import Philosophy

AzMap is Azure-specific.

Initial import formats:

* Azure Resource Graph exports
* ARM templates
* Generic Azure JSON exports

Future support may include:

* Terraform state ingestion
* Azure SDK live discovery
* Policy exports
* Defender exports

Importers should:

* Normalize infrastructure consistently
* Preserve immutable raw payloads
* Emit warnings rather than fail entire imports
* Support partial import success where possible

---

# 8. V1 Scope

V1 is intentionally constrained.

Primary objective:

Import Azure topology data and progressively render layered infrastructure views.

V1 resource focus:

* Management Groups
* Subscriptions
* VNets
* VMs
* NICs
* NSGs

V1 capabilities:

* Import
* Normalize
* Graph generation
* Interactive rendering
* Metadata inspection
* Search/filtering
* Structured logging
* Documentation generation

Explicitly deferred:

* Governance engines
* AI analysis
* BCP simulation
* Connectivity path analysis
* Draw.io export
* Visio export
* Advanced authentication
* Multi-user systems

---

# 9. Technical Stack

## Frontend

* Vite
* React
* TypeScript
* Tailwind CSS
* React Flow + dagre (layout engine)

Reasoning:

* Local-first tool — no SSR requirements
* Vite is simpler and faster than Next.js for this use case
* Removes routing and server complexity not needed in V1
* Clearer learning surface for frontend architecture
* dagre provides hierarchical layout; ELK available if complexity demands it later

---

## Backend

* Node.js
* TypeScript
* REST APIs

Reasoning:

* Shared language across stack
* Reduced cognitive overhead
* Strong Azure SDK ecosystem
* Easier architectural learning

---

## Data Storage

Initial:

* SQLite

Future:

* PostgreSQL
* Potential graph-oriented storage later if justified

Premature complexity should be avoided.

---

## Runtime

Initial:

* Local-only execution

Future:

* Dockerized local execution
* AKS-hosted deployments

---

# 10. Governance & Analysis Roadmap

Governance functionality will evolve after topology rendering stabilizes.

Planned future governance areas:

* CAF alignment
* WAF alignment
* Azure Security Benchmark overlays
* ISO alignment overlays
* NIS2 overlays
* Network exposure analysis
* Segmentation analysis
* SPOF analysis
* Resiliency analysis

Governance systems should operate against the canonical graph.

---

# 11. Future Overlay & Simulation Architecture

AzMap is expected to evolve toward overlay-based architectural reasoning.

Examples:

* BCP/DR simulation
* Connectivity path analysis
* Traffic flow visualization
* Security boundary analysis
* Governance overlays
* Risk scoring overlays

Overlay systems must not mutate imported topology.

Instead:

* Imported topology remains immutable
* Overlays compose transient analytical state
* Visualization consumes composed state

This separation is critical for deterministic behavior.

---

# 12. Connectivity & Flow Analysis Direction

Future versions of AzMap should support source-to-destination connectivity reasoning.

Example capabilities:

* Path tracing
* NSG traversal analysis
* Firewall inspection point visualization
* Route analysis
* Peering analysis
* Connectivity validation
* Segmentation reasoning

Connectivity analysis should operate through graph traversal.

Example conceptual flow:

Source
→ NIC
→ Subnet
→ NSG
→ UDR
→ Firewall
→ Peering
→ Destination

This functionality is intentionally deferred until the canonical graph and traversal layers are stable.

---

# 13. AI Development Philosophy

Claude Code acts as:

* Architecting assistant
* Engineering educator
* Implementation accelerator
* Documentation assistant

Claude should:

* Explain before implementing
* Explain architectural tradeoffs
* Explain dependency choices
* Explain scaling implications
* Explain testing rationale
* Explain folder structure decisions
* Ask before major refactors
* Prioritize clarity over cleverness

The objective is understanding system architecture and engineering workflow, not memorizing syntax.

---

# 14. Learning Objectives

Primary learning goals:

* System design
* Application architecture
* DevOps concepts
* API design
* Clean architecture
* Testing philosophy
* Engineering workflow
* Terraform exposure
* Azure DevOps exposure

AzMap exists both as:

* A useful platform
* A structured engineering learning environment

---

# 15. Repository Philosophy

The repository should behave as persistent architectural memory.

Key goals:

* Traceability
* Explicit decisions
* Predictable evolution
* Reduced architectural drift
* Session continuity across AI-assisted development

Key operational documents:

* CLAUDE.md
* DECISIONS.md
* CHANGELOG.md
* CHANGE_IMPACT_MAP.md
* FILES_OF_INTEREST.md
* tasks/todo.md
* tasks/lessons.md

These documents are considered core project infrastructure.

---

# 16. Future Expansion Constraints

Future growth should extend the architecture rather than replace it.

Future systems should:

* Build on the canonical graph
* Preserve deterministic behavior
* Respect layer ownership
* Avoid introducing duplicate truth
* Maintain progressive rendering principles

Large-scale architectural changes should be documented in DECISIONS.md before implementation.

---

# 17. Success Criteria

AzMap is considered successful if it:

* Helps visualize Azure environments clearly
* Helps explain architecture relationships
* Helps identify topology risks and SPOFs
* Helps reason about connectivity and failover
* Remains understandable and maintainable
* Teaches modern application architecture concepts
* Demonstrates clean engineering workflow practices
* Evolves predictably without architectural entropy

Long-term success is measured not only by features, but by architectural clarity and learning value.
