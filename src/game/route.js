// Define route graph and character meta

export const ROUTE = {
  nodes: {
    start: { x: 100, y: 300, type: "start", label: "Start" },
    "elf-practice": { x: 240, y: 250, type: "elf", label: "Practice" },
    "elf-easy": { x: 400, y: 190, type: "elf", label: "Easy" },
    "elf-middle": { x: 560, y: 120, type: "elf", label: "Middle" },
    "elf-bad-ending": { x: 720, y: 120, type: "end", label: "Bad Ending" },
    "elf-hard": { x: 560, y: 260, type: "elf", label: "Hard" },
    "elf-ultra": { x: 720, y: 260, type: "elf", label: "Ultra" },
    "elf-true-ending": { x: 880, y: 260, type: "end", label: "True Ending" },
  },
  edges: [
    { from: "start", to: "elf-practice" },
    { from: "elf-practice", to: "elf-easy" },
    { from: "elf-easy", to: "elf-middle" },
    { from: "elf-middle", to: "elf-bad-ending" },
    { from: "elf-easy", to: "elf-hard" },
    { from: "elf-hard", to: "elf-ultra" },
    { from: "elf-ultra", to: "elf-true-ending" },
  ],
};

export const CHARACTERS = {
  "elf-practice": { name: "リーネ", size: 5 },
  "elf-easy": { name: "エフィナ", size: 10 },
  "elf-middle": { name: "セリス", size: 15 },
  "elf-hard": { name: "フローリア", size: 20 },
  "elf-ultra": { name: "アルティナ", size: 25 },
};
