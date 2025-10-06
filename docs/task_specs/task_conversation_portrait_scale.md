# Task Spec: Conversation Portrait 1.5x Scaling

- **Summary**: Increase hero and enemy portraits shown during conversation scenes to 150% of their previous size while keeping the layout responsive.
- **Context**: /tasklist `会話モードのキャラクターの表示サイズを、縦横1.5倍にする`
- **Acceptance Criteria**:
  - Default desktop view renders both portraits at ~570px × 731px (1.5x the former 380px × 487px) without overlapping the dialog window.
  - On narrower screens the portraits gracefully shrink, preserving aspect ratio and avoiding horizontal scroll.
  - Visual spec updates documented in `GAMEDESIGN.md` under 会話モード.
- **Notes**:
  - Maintain existing opacity/animation cues for active speaker highlighting.
  - Ensure accessibility text alternatives still reflect speaker names.
