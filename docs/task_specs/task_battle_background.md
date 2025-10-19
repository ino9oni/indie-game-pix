# Task Spec: バトルモード背景を敵画像へ差し替え

- **Summary**: In versus (picross battle) mode, swap the backdrop to the current opponent's full-body illustration to reinforce the confrontation.
- **Context**: /tasklist `バトルモードの背景画像をENEMYの画像に差し替える`
- **Acceptance Criteria**:
  - While the screen is `picross`, the background displays the `CHARACTERS[battleNode].images.fullbody` image.
  - If a full-body image is unavailable, fall back to the opponent's normal portrait, then to the random background as a last resort.
  - Background transitions stay smooth across puzzle rounds and revert to existing logic when leaving battle mode.
- **Notes**:
  - Keep existing overrides for other screens (opening, ending, route, name entry) intact.
  - Ensure responsive behaviour remains consistent with `.bg-image` styling.
