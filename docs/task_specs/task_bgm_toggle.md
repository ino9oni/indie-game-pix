# Issue: Restore BGM Toggle Control

- **Summary**: Ensure the BGM toggle works across all gameplay screens while keeping the prologue intro music enabled by default.
- **Context**: /tasklist `BGMのオンオフができなくなっているので修正`
- **Acceptance Criteria**:
  - When the application first shows the prologue screen, background music automatically turns on and the header toggle reflects `On`.
  - After the prologue, the player can switch BGM on/off at any time; screen transitions no longer force the toggle back to `On`.
  - When BGM is toggled off the music stops and stays muted until the player turns it back on (state persisted in localStorage).
  - Starting a new game still sets BGM to `On` in alignment with the existing opening screen specification.
- **Owner**: Codex automation
- **Status**: Draft
