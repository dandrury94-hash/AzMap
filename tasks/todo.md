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

### Governance & Repository Foundations
- [ ] Finalize governance markdown structure
- [ ] Finalize architectural guidance documents
- [ ] Establish implementation workflow standards

---

## Completed This Session

### Platform Vision
- [x] Defined AzMap long-term platform vision
- [x] Defined Azure-focused platform scope
- [x] Defined graph-centric architecture direction
- [x] Defined overlay and simulation philosophy
- [x] Defined progressive rendering philosophy

### Governance Foundations
- [x] Created MASTER_PROJECT_BRIEF.md
- [x] Expanded DECISIONS.md architecture governance
- [x] Expanded CLAUDE.md operational governance
- [x] Expanded CHANGE_IMPACT_MAP.md
- [x] Expanded FILES_OF_INTEREST.md

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
In Progress

### Tasks
- [ ] Finalize governance documentation
- [ ] Define initial repository structure
- [ ] Define architectural layer boundaries
- [ ] Define naming conventions
- [ ] Define TypeScript standards
- [ ] Define testing strategy
- [ ] Define logging strategy

### Learning Goals
- Clean architecture
- Repository organization
- Layer ownership
- Engineering governance

---

## Frontend Foundation

### Status
Pending

### Tasks
- [ ] Initialize React application
- [ ] Configure TypeScript
- [ ] Configure linting and formatting
- [ ] Configure routing
- [ ] Configure state management approach
- [ ] Configure UI component structure

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
Pending

### Tasks
- [ ] Define import interfaces
- [ ] Implement JSON import
- [ ] Implement ARM import
- [ ] Implement Resource Graph import
- [ ] Preserve immutable raw payloads
- [ ] Add import validation
- [ ] Add import diagnostics

### Learning Goals
- Parsing pipelines
- Validation architecture
- Immutable data handling
- Data contracts

---

## Normalization Layer

### Status
Pending

### Tasks
- [ ] Define canonical entity contracts
- [ ] Define canonical relationship contracts
- [ ] Implement entity normalization
- [ ] Implement relationship generation
- [ ] Define resource identity rules

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
Pending

### Tasks
- [ ] Define graph schema
- [ ] Define node contracts
- [ ] Define edge contracts
- [ ] Implement graph storage structures
- [ ] Implement graph validation
- [ ] Implement graph integrity checks

### Learning Goals
- Graph modeling
- Relationship architecture
- Identity management
- Topology systems

---

## Initial Supported Topology

### Status
Pending

### Initial Scope
- [ ] Management Groups
- [ ] Subscriptions
- [ ] Virtual Networks
- [ ] Virtual Machines
- [ ] NICs
- [ ] NSGs

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
Pending

### Tasks
- [ ] Integrate React Flow
- [ ] Define node rendering system
- [ ] Define edge rendering system
- [ ] Implement topology layouts
- [ ] Implement zoom-level rendering behavior
- [ ] Implement layered topology navigation

### Learning Goals
- Visualization architecture
- UI layering
- Rendering performance
- Interactive topology systems

---

# Phase 6 — Export Systems

Goal:
Export topology views into reusable formats.

---

## Export Features

### Status
Pending

### Tasks
- [ ] Draw.io export
- [ ] Visio export
- [ ] Markdown topology export
- [ ] API documentation generation

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
Future

### Tasks
- [ ] Define overlay architecture
- [ ] Implement failover simulation
- [ ] Implement SPOF highlighting
- [ ] Implement failover path visualization

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
Future

### Tasks
- [ ] CAF alignment overlays
- [ ] WAF alignment overlays
- [ ] Azure Security Benchmark overlays
- [ ] ISO/NIS2 overlay concepts

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