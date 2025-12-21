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
- Branches: `feature/...`, `fix/...`, `chore/...` (worktree branches may also use `task/...`, see below)
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

### Recommended naming
Worktree dirs (examples):
- `../repo-wt-task-<TASK>`
- `../repo-wt-design`
- `../repo-wt-release`

Branch naming (choose one style consistently):
- Option A (aligned with existing): `feature/<TASK>`, `fix/<TASK>`, `chore/<TASK>`
- Option B (explicit parallel): `task/<TASK>`, `design/<TOPIC>`, `release/<VERSION>`

### Required checks before doing any work
At the start of any command execution:
- `git status`
- `git branch --show-current`
- `git worktree list`
If not in the intended worktree, stop and `cd` to the correct directory.

### Worktree lifecycle
- Create: `git worktree add <path> -b <branch> <start-point>`
- Remove safely: `git worktree remove <path>` then `git worktree prune`
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
The custom command `tasklist.md` is the main entrypoint and MUST follow:

For each TASK in `TASKLIST.md` (or the selected `$1` task):
1. **Create a task worktree** for this task if not already present.
2. Read the task and extract a clear “タスク仕様”.
3. Copy `GAMEDESIGN.md` → `GAMEDESIGN-new.md`
4. Merge “タスク仕様” into `GAMEDESIGN-new.md`
5. Run “タスク仕様確認処理”:
   - No conflicts/batting with existing specs
   - No contradictions
   - No excessive ambiguity that cannot be resolved
6. Show `GAMEDESIGN.md` vs `GAMEDESIGN-new.md` DIFF and **require approval**
7. On approval:
   - Create a GitHub issue for the task spec using `gh` (include “タスク仕様”)
   - Regenerate app sources/config/assets from `GAMEDESIGN-new.md`
   - Leave human-readable 1-line intent comments where possible
8. Show code/config/assets DIFF:
   - Provide file list + diff summary
   - **Require approval**
9. On approval:
   - Reload dev server (`make dev` running state) so changes are reflected
   - Commit/push
   - Update the GitHub issue with commit SHA + log
   - Close the issue
   - Mark `[done]` in `TASKLIST.md`
10. If not approved at any approval gate:
   - Incorporate user feedback into `GAMEDESIGN-new.md`
   - Re-run from the appropriate validation step

### Merging back to GAMEDESIGN.md
After tasks complete:
- Apply the diff between `GAMEDESIGN-new.md` and `GAMEDESIGN.md` into `GAMEDESIGN.md`
- Show diff and request approval before committing

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
- Confirm commit diffs between the feature branch (e.g. `feature/rewrite-from-gamedesign`) and `main`
- Create PR, get approval, merge to `main`
- Release must not run from random task worktrees.

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
- `GAMEDESIGN.md` ↔ `GAMEDESIGN-new.md` diff

### Implementation DIFF approval request
- Changed files list:
- 1-line summary per change:
- How to test (`make dev`, `make test`, etc.)
- Risks / rollback notes

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
