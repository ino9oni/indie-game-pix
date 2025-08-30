export function computeClues(solution) {
  const n = solution.length
  const rows = solution.map(lineToClues)
  const cols = Array.from({ length: n }, (_, c) => lineToClues(Array.from({ length: n }, (_, r) => solution[r][c])))
  return { rows, cols }
}

function lineToClues(arr) {
  const res = []
  let run = 0
  for (const v of arr) {
    if (v) run++
    else if (run) {
      res.push(run)
      run = 0
    }
  }
  if (run) res.push(run)
  return res.length ? res : [0]
}

// Grid cell: 0 empty, 1 filled, -1 cross
export function emptyGrid(n) {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => 0))
}

export function toggleCell(grid, r, c, mode = 'fill') {
  const next = grid.map((row) => row.slice())
  if (mode === 'fill') {
    next[r][c] = next[r][c] === 1 ? 0 : 1
  } else if (mode === 'cross') {
    next[r][c] = next[r][c] === -1 ? 0 : -1
  } else if (mode === 'maybe') {
    // 2 represents a tentative/"maybe" mark that does not affect solution check
    next[r][c] = next[r][c] === 2 ? 0 : 2
  }
  return next
}

export function equalsSolution(grid, solution) {
  const n = solution.length
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const shouldFill = solution[r][c]
      const isFilled = grid[r][c] === 1
      if (shouldFill !== isFilled) return false
    }
  }
  return true
}
