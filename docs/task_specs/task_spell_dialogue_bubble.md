# Task Spec: 対戦モードのスペル台詞吹き出し

- **Summary**: When a spell triggers in versus mode, show the caster's battle line in a speech bubble next to their portrait so players can read the incantation.
- **Context**: /tasklist `対戦モードで、スペル発動時の台詞は各キャラクターが唱えたスペルは、キャラクター画像の右側に吹き出しで表示する`
- **Acceptance Criteria**:
  - Casting hero spell displays a speech bubble to the right of the hero avatar with the hero's incantation line.
  - Enemy spell casting displays an analogous bubble next to the enemy avatar, using spell-specific lines.
  - Bubbles animate in promptly on cast, stay visible roughly 3–4 seconds, and disappear automatically or when another spell line replaces them.
  - Layout adapts for narrow screens so bubbles remain readable without covering the boards.
- **Notes**:
  - Use existing spell metadata (spell id/name) to select lines; add a new mapping if needed.
  - Bubble styling should match the game's fantasy tone and respect current palette.
