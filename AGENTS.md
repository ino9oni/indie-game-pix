# AGENT.md — Repository Guidelines + Game Build Process + Parallel Worktrees

This document is the single source of truth for how Codex operates in this repo.
It merges:
- Repository engineering guidelines
- GAMEDESIGN/TASKLIST driven build workflow
- Parallel development using git worktree

If any instruction conflicts, **AGENT.md wins**.

---

## 0. Core Principles (Non-Negotiable)

1. **User approval is mandatory** before any commit/push or deploy.
2. **One task = one worktree = one branch**. Do not mix unrelated changes.
3. **Design-first**: update/validate design artifacts before regenerating code/assets.
4. **Show DIFFs** (design diff + code/assets diff) and provide human-readable summaries.
5. **No destructive operations** without explicit instruction:
   - No `rm -rf` worktree directories
   - No `git reset --hard`, `git clean -fdx`, `git push --force`
6. **Never block** waiting on other worktrees:
   - If shared changes are needed, raise an explicit proposal and continue with adapters/stubs.

---

## 1. Context Governance (Layer Model)

To balance consistency and parallelism, context is split into layers.

### Layer 0 — Immutable Governance
- This file: `AGENT.md`
- Global safety/approval rules
- Worktree rules

### Layer 1 — Shared Contracts (Consistency Anchor)
- `GAMEDESIGN.md` (design source of truth)
- Public API / schema / shared interface expectations
- Versioning rules (x.y)

Changes to Layer 1 must be explicitly diffed and approved.

### Layer 2 — Local Implementation (Parallel Friendly)
- Source code, configs, assets generated from approved design
- Refactors and optimizations that do not break Layer 0/1

---

## 2. Repository Structure & Engineering Standards

### Project Structure
- Code: `src/` (packages/modules). CLIs/scripts in `scripts/` or `bin/`.
- Tests: `tests/` mirrors `src/`.
- Config: `config/` and `.env.example` (never commit real secrets). Runtime `.env` is gitignored.
- Assets & docs: `public/assets/`, `public/`, `docs/`, root `README.md`.

### Build / Test / Dev Commands
- Install deps: `make install` (fallback to stack tool: `npm ci`, `pip install -e .[dev]`, etc.)
- Run locally: `make dev` for hot-reload (else `make run` or stack entry).
- Lint & format: `make lint`, `make fmt`
- Tests: `make test`, `make test-watch`, `make coverage`

### Coding Style & Naming
- Spaces only; formatter decides width.
- Files/modules: `snake_case`
- Classes: `PascalCase`
- Functions/vars: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Prefer absolute imports within `src/`; avoid side-effectful top-level init.
- Keep public APIs stable; document breaking changes in `CHANGELOG.md`.

### Testing
- Unit tests in `tests/`, name `test_*` or `*.spec.*` / `*.test.*`
- Target ≥ 90% coverage for touched code
- Arrange-Act-Assert; avoid network/real services (use mocks/fakes)

### Commits / PRs
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`
- Branches: `feature/...`, `fix/...`, `chore/...`; task worktrees **must** use `task/<TASK>`
- PR: concise title/description, linked issues (`Closes #123`), screenshots for UI, risks/rollout, CI passing

### Security
- Never commit secrets; keep `.env.example` in sync.
- Validate inputs; treat external data as untrusted.
- Run `make security-scan` if provided.

---

## 3. Worktree & Parallel Development Rules

### Why worktrees
We use `git worktree` to run tasks in parallel while maintaining consistency via Layer 1.

### Worktree invariants
- Each worktree has exactly one checked-out branch.
- Each task runs only inside its worktree.
- Avoid editing multiple worktrees in one “implementation pass”.

### Required naming
Worktree dirs:
- `../repo-wt-task-<TASK>`
- `../repo-wt-design`
- `../repo-wt-release`

Branch naming:
- Tasks: `task/<TASK>`
- Design/RFC: `design/<TOPIC>`
- Release: `release/<VERSION>`

### Required checks before doing any work
At the start of any command execution:
- `git status`
- `git branch --show-current`
- `git worktree list`
If not in the intended worktree, stop and `cd` to the correct directory.

### Worktree lifecycle
- Create: `git worktree add <path> -b <branch> <start-point>`
- Remove safely: `git worktree remove <path>` then `git worktree prune`
  - After a task is merged into `main`, remove its task worktree to keep the repo tidy
Never delete worktree folders manually.

---

## 4. Build Process (GAMEDESIGN/TASKLIST Driven)

### BUILD ALL
Execute in order:
- TASKLIST
- QA (TBD)
- CICD (TBD)
- CROSSPLATFORM (Android conversion)
- VERSIONING

### BUILD GAMEDESIGN
- Regenerate required source/config/assets based on `GAMEDESIGN.md`
- Produce DIFF (files + summaries)
- Ask user approval
- On approval: commit/push
- If not approved: incorporate feedback into `GAMEDESIGN.md`, repeat

---

## 5. TASKLIST Protocol (Global) + tasklist.md (Custom Command)

TASKLIST protocol is the canonical development flow.
The custom command `tasklist.md` is the main entrypoint and MUST follow.

### Single-task mode (legacy)
If `tasklist.md` is called with a single argument (e.g., `$1`):
- Treat it as **one TASK**
- Execute the per-task workflow below

### Multi-task mode (recommended)
If `tasklist.md` is called with multiple arguments (e.g., `$@`):
- Treat it as **TASKS = all provided tasks**
- Execute the per-task workflow below **for each TASK**
- Tasks MUST be isolated:
  - **One task worktree per TASK**
  - **One design staging file per TASK**
- The agent MUST NOT merge tasks into the same branch/worktree.

---

### Per-task workflow (applies to both single/multi modes)

For each TASK in `TASKLIST.md` (or the selected task(s)):

1. **Create a task worktree** for this TASK if not already present.
2. Read the task and extract a clear “タスク仕様”.
3. Copy `GAMEDESIGN.md` → `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md` (IMPORTANT: per-task file, keep root clean)
4. Add a **Task Spec Summary** header block at the top of `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md`:
   - Objective
   - Non-goals
   - Affected files
5. Merge “タスク仕様” into `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md`
6. Run “タスク仕様確認処理”:
   - No conflicts/batting with existing specs
   - No contradictions
   - No excessive ambiguity that cannot be resolved
7. Show `GAMEDESIGN.md` vs `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md` DIFF and **require approval**
8. On approval:
   - Create a GitHub issue for the task spec using `gh` (include “タスク仕様”)
   - Regenerate app sources/config/assets from `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md`
   - Leave human-readable 1-line intent comments where possible
9. Show code/config/assets DIFF:
   - Provide file list + diff summary
   - **Require approval**
10. On approval:
   - Reload dev server (`make dev` running state) so changes are reflected
   - Commit/push
   - Update the GitHub issue with commit SHA + log
   - Close the issue
   - Mark `[done]` in `TASKLIST.md`
   - Move completed tasks into `TASKLIST-DONE.md` under a date header (`## YYYY-MM-DD`) and remove them from `TASKLIST.md`
   - Keep `TASKLIST.md` **active-only** (no completed tasks remain there)
11. If not approved at any approval gate:
   - Incorporate user feedback into `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md`
   - Re-run from the appropriate validation step

---

### Consolidating design back to GAMEDESIGN.md (Batch-safe)

Because multi-task mode produces multiple design staging files, consolidation MUST be explicit.

After one or more tasks complete:
- Consolidate the diff(s) from `docs/task_specs/archive/GAMEDESIGN-new-<TASK>.md` into `GAMEDESIGN.md`
- Show a single consolidated diff and request approval before committing

Rules:
- Do not overwrite `GAMEDESIGN.md` silently.
- If multiple tasks introduce conflicting design edits, report the conflict and request user direction.
- Consolidation is the only step that changes the shared contract (`GAMEDESIGN.md`).

---

## 6. Release Protocol + release.md (Custom Command)

`release.md` is the main deploy entrypoint and MUST follow:

### Deploy preparation
- Edit `README.md` and add release notes:
  - Include release version
  - List diffs since last release (1 line per change)
- Create a tag with the same name as the release version
- Show README diff and require approval
- On approval:
  - Commit/push README
  - Push tag
  - Deploy (`make deploy`, based on `vite.config.js`)
- If not approved:
  - Abort or incorporate additional requested changes, then re-request approval

### Main merge rule
Before/after release:
- Confirm commit diffs between task branches and `main`
- Get user approval, merge to `main`
- Release must not run from random task worktrees.

### Sequential merge flow (worktrees -> main)
Use this sequence whenever multiple task worktrees exist:
1) **Prepare main merge worktree**
   - Work in a **main worktree** (not a task worktree).
   - `git fetch`, then `git pull --ff-only` on `main`.
2) **Merge task branches into main**
   - Merge each task branch:  
     `git merge --no-ff task/<TASK>`  
   - Resolve conflicts in the main merge worktree only.
   - Show diff summary and require user approval before pushing.
   - Push: `git push origin main`.
3) **Update local branches/worktrees after merge**
   - In `main` worktree: `git pull` (only if clean).
   - For completed task worktrees: either `git pull --ff-only` to sync or remove the worktree per policy.
Notes:
- Never merge *from* a task worktree; always merge *into* main in the main merge worktree.
- `feature/rewrite-from-gamedesign` is deprecated and should not be used.

---

## 7. CROSSPLATFORM / VERSIONING

### CROSSPLATFORM
- Convert web app to Android app
- Generate under `mobile/android`

### VERSIONING
- Major: feature add/remove, mode add/remove → increment x in `x.y` and tag
- Minor: text/UI changes, bug fixes → increment y in `x.y` and tag

Any version/tag operation requires user approval.

---

## 8. Reporting Format (What Codex Must Output)

When presenting for approval, output:

### Design DIFF approval request
- Task:
- Worktree + branch:
- Design changes summary:
- `GAMEDESIGN.md` ↔ `GAMEDESIGN-new-<TASK>.md` diff

### Implementation DIFF approval request
- Changed files list:
- 1-line summary per change:
- How to test (`make dev`, `make test`, etc.)
- Risks / rollback notes

### Multi-task progress report (when applicable)
- Tasks queued:
- Tasks in progress (worktree/branch per task):
- Tasks completed:
- Conflicts/blocked items (if any) and what decision is needed:

---

## 9. QA / CICD (TBD placeholders)

### QA (TBD)
At minimum:
- `make lint`
- `make test`
- (Optional) `make coverage`

### CICD (TBD)
At minimum:
- Ensure CI passes on PR
- Ensure deploy pipeline prerequisites are met

---

## 10. If Unclear
Do not guess and do not modify shared state.
Default to read-only inspection, then ask for user direction.
