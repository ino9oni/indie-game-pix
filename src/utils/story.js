// Load the story section from GAMEDESIGN.md at build time.
// Vite's ?raw import gives us the file contents as a string.
import raw from '../../GAMEDESIGN.md?raw'

export function extractStoryLines() {
  try {
    const lines = raw.split('\n')
    // Find the line number for a heading starting with `### Story`
    const startIdx = lines.findIndex((l) => /^###\s*Story\s*$/.test(l.trim()))
    if (startIdx === -1) return []
    const out = []
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (/^###\s/.test(line)) break // next section reached
      const m = /^-\s*(.+)$/.exec(line.trim())
      if (m) out.push(m[1])
    }
    return out
  } catch {
    return []
  }
}

