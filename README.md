# Picross Neo

Stylish, colorful Picross (nonogram) game built with React + Vite.

Current release: 0.3.1

## Quickstart

- Install deps: `make install`
- Dev server: `make dev` then open http://localhost:15173
- Build: `make build` and `make preview`

## Game Flow & Rules

- Opening: Shows the game title image and a Start button.
  - Place your generated title image at `public/title.png` (e.g., from Sora). The app will load it automatically on the Opening screen.
  - Toggle “Sound: On” in the header to enable BGM/SFX (Web Audio API).

- Choose a level: `easy` (5x5), `middle` (10x10), `high` (15x15).
- Each level has 5 puzzles. Pick one to start.
- You have 20 minutes. Submit anytime to check your answer.
- If your grid matches the solution at end/submit: Clear. Otherwise: Game Over.
- Clear all 5 in a level to see a level clear screen. For `easy` and `middle`, you’ll be guided to the next level.
 - On failure, you can return to puzzle select or end the game. Ending the game shows a Game Over screen with closing music and a button back to Title.

## Repo Structure

- Code: `src/` (components, game logic)
- Public: `public/` (index.html)
  - Add `public/title.png` for the Opening screen hero image.
  - Optional background images: place files under `assets/img/` (png/jpg/webp/gif). One will be shown behind the UI at random, and it changes each time you start a puzzle play. If none exist, the gradient background is used.
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
