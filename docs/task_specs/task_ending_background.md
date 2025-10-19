# Issue: Fix Ending Mode Background

- **Summary**: Ensure the ending screen always displays the dedicated backdrop `assets/img/background/ending.png` so the experience matches the game design.
- **Context**: /tasklist `エンディングモードの背景画像を固定化する`
- **Acceptance Criteria**:
  - Ending mode (`screen === "ending"`) uses `ending.png` as its background, scaling to cover the viewport.
  - Apply an overlay/gradient as needed to keep text readable.
  - Other screens remain unaffected.
- **Owner**: Codex automation
- **Status**: Implemented
