# Task Spec: ピクロスお題クリア時の非同期遷移

- **Summary**: When either side completes a puzzle in battle mode, only that side should advance to the next puzzle while the opponent continues their current one until they also finish.
- **Context**: /tasklist `ピクロスモードのお題クリア時の挙動を変更する`
- **Acceptance Criteria**:
  - Hero auto-advances to the next puzzle when their grid matches the solution (either via Submit or auto-complete) without resetting the enemy’s progress.
  - Enemy auto-advances independently under the same rule, leaving the hero’s board untouched.
  - Win counters update only for the side that cleared the puzzle; victory triggers as soon as one side reaches the required number of clears.
- **Notes**:
  - Timer, spells, and scoring flows remain consistent with manual submit behaviour.
  - Enemy AI must continue solving in-place even if the hero has moved on to later puzzles.
