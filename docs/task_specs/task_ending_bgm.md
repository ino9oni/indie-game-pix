# Issue: Fix Ending Mode BGM

- **Summary**: Set a dedicated BGM track for the ending mode, ensure it always plays (looped) when entering the ending screen, regardless of previous mode.
- **Context**: /tasklist `エンディングモードへのBGMを変更・固定化する`
- **Acceptance Criteria**:
  - Ending screen always plays `assets/bgm/indie-game-pix-ending.wav` (loop) when the mode becomes `ending`.
  - Audio transitions stop/crossfade out prior tracks so ending theme starts cleanly and restarts on re-entry.
  - Conversation/route/picross behaviors remain unaffected.
- **Owner**: Codex automation
- **Status**: Implemented
