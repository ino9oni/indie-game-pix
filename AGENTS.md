co# Repository Guidelines

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

# Build Process
## MAIN
### DO TASKLIST
- 以下を行う
    - TASKLIST.mdを読み込む
    - TASKLIST毎に以下を行う
        - TASKの変更を行う前に、仕様を整理する（"タスク仕様"とする）
        - GAMEDESIGN.md を GAMEDESIGN-new.md にコピーする
        - GAMEDESIGN-new.md に、"タスク仕様"をマージする
        - GAMEDESIGN-new.md が "タスク仕様"を満たしているかを確認する
            - 満たせている場合は、GAMEDESIGN-new.md に基づいてアプリ実行に必要なソースファイル・アプリ設定、アセットを再生する
            - ソース・設定・変更点、変更内容についてDIFFを取る
            - 上記DIFFの内容をユーザに確認する
        - ユーザからの承認が得られたら、コミット・Pushを行う
            - 承認が得られなかった場合は、修正案を受け取り、GAMEDESIGN-new.mdに再度取り込み同様のプロセスを行う。
        - TASK完了後タスクにTASKLIST.md内の当該タスクのラベルに、[done]ラベルを付与する
    - GAMEDESIGN-new.md と GAMEDESIGN.mdの差分を、GAMEDESIGN.mdに取り込む
#### DO QA
- 未定義
#### DO CI/CD
- 未定義
#### DO CrossPlatform
- WebアプリをAndoroidアプリに変換する
- mobile/androidフォルダ配下に生成する
#### VERSIONING
- メジャーバージョン
    - 機能の追加や廃止、モードの追加や廃止の場合、それをメジャーバージョンとする
    - バージョニング
        - x.y の xの部分をインクリメントする
    - タギング
        - タグも同様に付与
- マイナーバージョン
    - 表示文言、UIスタイル、文言修正、バグの修正の場合、それをマイナーバージョンとする
    - バージョニング
        - x.y の yの部分をインクリメントする
    - タグ付け
        - タグも同様に付与