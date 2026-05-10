# AzMap

A locally hosted Azure topology intelligence platform.

AzMap ingests Azure infrastructure exports, normalizes them into a canonical graph model, and renders layered architectural views for visualization, governance analysis, resilience planning, and connectivity reasoning.

---

## What it does

- **Import** Azure infrastructure from ARM templates, Resource Graph exports, and Azure JSON exports
- **Normalize** raw payloads into a canonical graph of typed nodes and explicit relationships
- **Render** layered topology views — management hierarchy, network topology, compute, security overlays
- **Analyze** architectural risks, SPOFs, connectivity paths, and governance alignment
- **Export** topology views and architecture documentation

AzMap is permanently read-only. It never modifies Azure resources.

---

## Architecture

AzMap is built around a canonical resource graph as the single source of truth.

```
Azure Imports
    ↓
Import Layer          — parse and preserve raw payloads
    ↓
Normalization Layer   — transform into canonical GraphNode / GraphEdge contracts
    ↓
Canonical Graph       — authoritative topology model (SSOT)
    ↓
Traversal Layer       — path analysis, dependency traversal, connectivity reasoning
    ↓
Projection Layer      — topology-specific views derived from the graph
    ↓
Rendering Layer       — React Flow visualization with dagre layout
    ↓
Overlays / Exports    — BCP/DR simulation, governance, documentation (future)
```

All downstream systems derive from the graph. No layer independently recomputes topology relationships.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React + TypeScript + Tailwind CSS |
| Visualization | React Flow + dagre |
| Backend | Node.js + TypeScript + REST API |
| Storage | SQLite (PostgreSQL later) |
| Monorepo | pnpm workspaces |

---

## Repository Structure

```
AzMap/
├── apps/
│   ├── frontend/        # Vite + React application
│   └── backend/         # Node.js REST API
├── packages/
│   └── shared/          # Canonical graph contracts, shared types
├── tasks/
│   ├── todo.md          # Implementation phases and task tracking
│   └── lessons.md       # Engineering lessons and anti-patterns
├── MASTER_PROJECT_BRIEF.md
├── CLAUDE.md
├── DECISIONS.md
├── CHANGE_IMPACT_MAP.md
├── FILES_OF_INTEREST.md
└── CHANGELOG.md
```

---

## V1 Scope

V1 focuses on import, normalization, graph construction, and interactive rendering.

Supported resource types in V1:

- Management Groups
- Subscriptions
- Virtual Networks
- Virtual Machines
- NICs
- NSGs

Deferred to later phases: governance engines, BCP/DR overlays, connectivity path analysis, Draw.io/Visio export, AI analysis.

---

## Governance

This project follows a structured governance approach designed to prevent architectural drift across AI-assisted development sessions.

| Document | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Claude Code operating rules and workflow |
| [DECISIONS.md](DECISIONS.md) | Architectural decision records (ADR-001 through ADR-014) |
| [MASTER_PROJECT_BRIEF.md](MASTER_PROJECT_BRIEF.md) | Platform vision, scope, and engineering goals |
| [CHANGE_IMPACT_MAP.md](CHANGE_IMPACT_MAP.md) | Blast radius by change type |
| [FILES_OF_INTEREST.md](FILES_OF_INTEREST.md) | Layer ownership and codebase navigation |
| [CHANGELOG.md](CHANGELOG.md) | Full change history |
| [tasks/todo.md](tasks/todo.md) | Phased implementation plan |
| [tasks/lessons.md](tasks/lessons.md) | Engineering lessons and anti-patterns |

---

## Status

Pre-implementation. Governance and architectural decisions are complete. Scaffolding in progress.
