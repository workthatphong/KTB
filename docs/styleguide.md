# STYLEGUIDE.md — Project Architectural Standards

## Core Principles

1. **Anti-Monolith:** Never create large files that combine data, logic, and UI. Decomposition is mandatory.
2. **Modular Decomposition:**
   - **Frontend:** Features must be separated into `frontend/src/features/` (e.g., charts, timeline). Shared components live in `frontend/src/components/shared/`. Business logic/utils live in `frontend/src/lib/`.
   - **Backend:** Modularize services into `backend/app/services/` and logic into domain-specific modules.
3. **Clean Composition:** Main entry points (like `app.jsx` or `main.py`) should focus on orchestration and composition, delegating complexity to modular sub-components.
4. **Consistent Imports:** Follow the established ESM import patterns and backend bundling strategies where applicable.

## Rule for All Agents
Every file created or modified must adhere to these standards. If a monolith is detected, it must be decomposed as part of the current task.
