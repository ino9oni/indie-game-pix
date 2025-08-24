# Repository Guidelines

This guide keeps contributions consistent and predictable. Prefer small, focused pull requests and update this document when commands or structure change.

## Project Structure & Module Organization
- Code: `src/` (packages and modules). CLIs/scripts in `scripts/` or `bin/`.
- Tests: `tests/` mirrors `src/` (e.g., `tests/pkg/test_utils.py`).
- Config: `config/` and `.env.example` (never commit real secrets). Runtime env lives in `.env` (gitignored).
- Assets & docs: `assets/`, `public/`, `docs/`, and root `README.md`.

## Build, Test, and Development Commands
- Install deps: `make install` (wraps language-specific install). If absent, use the stack tool (e.g., `npm ci`, `pip install -e .[dev]`).
- Run locally: `make dev` for hot-reload; otherwise `make run` or a domain-specific entry (e.g., `python -m src.app`, `npm start`).
- Lint & format: `make lint` and `make fmt` (expect ESLint/Prettier or Ruff/Black under the hood).
- Tests: `make test` runs unit tests; `make test-watch` for TDD; `make coverage` for a report.

## Coding Style & Naming Conventions
- Indentation: spaces only; formatter decides width.
- Names: modules/files `snake_case`; classes `PascalCase`; functions/vars `snake_case`; constants `UPPER_SNAKE_CASE`.
- Imports: prefer absolute within `src/`; keep top-level initialization side-effect free.
- Keep public APIs stable; document breaking changes in `CHANGELOG.md`.

## Testing Guidelines
- Frameworks: unit tests live in `tests/`; name files `test_*.py` or `*.spec.*`/`*.test.*` (JS/TS).
- Coverage: target ≥ 90% for touched code; add regression tests with bug fixes.
- Arrange-Act-Assert; avoid relying on network or real services—use fakes/mocks.

## Commit & Pull Request Guidelines
- Conventional Commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `perf:`. Scope optional (e.g., `feat(api): add pagination`).
- Branches: `feature/…`, `fix/…`, `chore/…`.
- PRs: concise title/description, linked issues (`Closes #123`), screenshots for UI, notes on risks/rollout, and check passing CI.

## Security & Configuration Tips
- Do not commit secrets; sync example defaults in `.env.example`.
- Validate inputs; treat all external data as untrusted; run `make security-scan` if provided.

