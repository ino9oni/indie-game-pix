# Task Spec: Conversation Background Enemy Portrait

- **Summary**: During conversation mode, replace the generic background with the current enemy's full-body artwork to emphasize the opponent encounter.
- **Context**: /tasklist `会話モードの時の背景画像をENEMYの画像に差し替える`
- **Acceptance Criteria**:
  - When conversation mode opens for a pending enemy node, the backdrop shows that enemy's full-body artwork (`CHARACTERS[node].images.fullbody`).
  - Conversation backgrounds swap instantly when the enemy changes and revert to default behaviour for other screens.
  - If the enemy lacks a full-body image, fall back to the existing random/background rotation without errors.
- **Notes**:
  - Keep existing hero/name/gamestart background overrides unchanged.
  - Ensure responsive scaling still relies on the existing `.bg-image` styling.
