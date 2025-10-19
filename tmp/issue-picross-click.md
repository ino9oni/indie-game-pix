## Summary
- Replace the current Picross cell fill/mark SFX with a soft glass/water-like click stored at `assets/se/picross_click_soft.wav`.
- Add a magical particle burst effect when a cell is filled or marked, matching the task description.

## Background
- Improvement item: 「ピクロスモードのクリック時の効果音の変更」 specifies gentler sound and magical excavating effect.
- GAMEDESIGN-new.md updated to use the new SFX and call out the particle effect.

## Acceptance Criteria
- Filling or marking a cell plays the new `picross_click_soft.wav` sound via AudioManager.
- A particle effect appears at the cell position when toggled; disappears quickly.
- The stone/chisel sound is no longer used for cell actions.
- Existing gameplay (scoring, inputs) remains unchanged.
