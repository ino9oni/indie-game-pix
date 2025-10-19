## Summary
- Animate the hero marker along the map edge when moving between nodes and show an “Enemy Encount!” prompt before entering conversation mode.

## Background
- Improvement task 「マップモードの変更」 specifies a 2-second movement animation along the edge path, a post-arrival encounter bubble, and automatic transition to conversation mode.

## Acceptance Criteria
- Clicking a reachable node locks further input while the hero marker travels horizontally then vertically to the destination within ~2 seconds.
- The footstep SFX plays at the start of the movement; arrival triggers a short-lived “Enemy Encount！” bubble (≈0.8 s) above the node.
- After the bubble, the flow proceeds automatically to conversation mode (or ending for the final node).
- Behavior respects debug mode (no restrictions) and persists across screen redraws.
