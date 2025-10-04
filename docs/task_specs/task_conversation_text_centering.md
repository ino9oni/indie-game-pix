# Issue: Center Conversation Window Text Vertically

- **Summary**: Keep conversation text vertically centered within the dialogue window while leaving speaker name and dialogue copy left-aligned for readability.
- **Context**: /tasklist `会話モードの会話表示時のウィンドウ内のテキストの位置を中心に表示する`
- **Acceptance Criteria**:
  - Conversation dialogue window centers the text area vertically while speaker name・本文は左寄せで表示される。
  - Left-aligned text adapts gracefully to varying string lengths and preserves the bottom-aligned button row.
  - Prologue/other modes unaffected.
- **Owner**: Codex automation
- **Status**: Implemented (see commit `5e3f7f9` and follow-up changes)
