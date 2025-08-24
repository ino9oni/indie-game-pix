# Picross Neo

Stylish, colorful Picross (nonogram) game built with React + Vite.

Current release: 0.01

## Quickstart

- Install deps: `make install`
- Dev server: `make dev` then open http://localhost:15173
- Build: `make build` and `make preview`

## Game Rules

- Choose a level: `easy` (5x5), `middle` (10x10), `high` (15x15).
- Each level has 5 puzzles. Pick one to start.
- You have 20 minutes. Submit anytime to check your answer.
- If your grid matches the solution at end/submit: Clear. Otherwise: Game Over.
- Clear all 5 in a level to see a level clear screen. For `easy` and `middle`, you’ll be guided to the next level.

## Repo Structure

- Code: `src/` (components, game logic)
- Public: `public/` (index.html)
- Config: `.env.example`, `vite.config.js`
- Scripts: `Makefile`
- Tests: `tests/` (none yet)

## Development

- Lint: `make lint`
- Format: `make fmt`
- Tests: `make test`

## Notes

- Progress is kept in `localStorage` per browser.
- Right-click a cell to place a cross (or toggle the Cross tool).
- UI aims for a colorful, sleek look with subtle glows.
