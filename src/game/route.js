// Define route graph and character meta

export const ROUTE = {
  nodes: {
    start: { x: 80, y: 200, type: 'start', label: 'Start' },
    'elf-practice': { x: 200, y: 180, type: 'elf', label: 'Practice' },
    'elf-easy': { x: 340, y: 140, type: 'elf', label: 'Easy' },
    'elf-middle': { x: 480, y: 180, type: 'elf', label: 'Middle' },
    'elf-hard': { x: 620, y: 220, type: 'elf', label: 'Hard' },
    'elf-ultra': { x: 700, y: 260, type: 'elf', label: 'Ultra' },
    'ending-middle': { x: 620, y: 120, type: 'end', label: 'Ending(M)' },
    'ending-hard': { x: 740, y: 200, type: 'end', label: 'Ending(H)' },
  },
  edges: [
    { from: 'start', to: 'elf-practice' },
    { from: 'elf-practice', to: 'elf-easy' },
    { from: 'elf-easy', to: 'elf-middle' },
    { from: 'elf-middle', to: 'ending-middle' },
    { from: 'elf-middle', to: 'elf-hard' },
    { from: 'elf-hard', to: 'elf-ultra' },
    { from: 'elf-ultra', to: 'ending-hard' },
  ],
}

export const CHARACTERS = {
  'elf-practice': { name: 'リーネ', size: 5 },
  'elf-easy': { name: 'エフィナ', size: 10 },
  'elf-middle': { name: 'セリス', size: 15 },
  'elf-hard': { name: 'フローリア', size: 20 },
  'elf-ultra': { name: 'アルティナ', size: 25 },
}

