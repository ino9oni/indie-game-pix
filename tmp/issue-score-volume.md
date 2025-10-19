## Summary
- Reduce the playback volume of the score counting sound effect during the score tally animation so it sits more comfortably in the mix.

## Background
- Improvement item 「コイン計上時のSEのボリュームを下げる」 requests the score-count (coin accrual) SFX to be quieter while points are tallied.
- Current implementation starts the looping score SFX with a gain of 0.75 inside `AudioManager.startScoreCount()`.

## Acceptance Criteria
- During score tally, the looping score/coin SFX plays at a noticeably lower volume than before (targeting a softer, background treatment).
- Other audio (BGM, fill/click SFX, celebration sounds) are unaffected.
- Spec (`GAMEDESIGN.md`) documents the adjusted volume expectation.
- TASKLIST marks the item as `[done]`.
