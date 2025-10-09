## Summary
- Remove the Stage Clear overlay dialog from the Picross clear flow so play returns directly to the route/ending after the score animation.
- Eliminate the dedicated Stage Clear fanfare; only the existing score counting sound may play while the total increments.

## Background
- Improvement task "ピクロスモードの変更" requires removing the Stage Clear dialog and the Stage Clear SE.
- Current implementation still shows the Stage Clear card and triggers `audio.playClearFanfare()` when a puzzle is cleared.

## Acceptance Criteria
- Clearing a Picross board no longer shows the "Stage Clear!" overlay or any modal dialog; gameplay transitions automatically once scoring finishes.
- No dedicated Stage Clear fanfare plays during or after the score animation.
- After the score animation (or immediately if no score is earned), the game proceeds to the route map or ending as appropriate without additional user input.
- TASKLIST.md marks the improvement item as `[done]` once shipped.
