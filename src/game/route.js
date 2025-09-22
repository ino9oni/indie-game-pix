// Define route graph and character meta

export const ROUTE = {
  nodes: {
    start: { x: 100, y: 300, type: "start", label: "Start" },
    "elf-practice": { x: 240, y: 250, type: "elf", label: "Practice" },
    "elf-easy": { x: 400, y: 190, type: "elf", label: "Easy" },
    "elf-middle": { x: 560, y: 120, type: "elf", label: "Middle" },
    "elf-hard": { x: 560, y: 260, type: "elf", label: "Hard" },
    "elf-ending": { x: 720, y: 190, type: "elf", label: "Ending" },
  },
  edges: [
    { from: "start", to: "elf-practice" },
    { from: "elf-practice", to: "elf-easy" },
    { from: "elf-easy", to: "elf-middle" },
    { from: "elf-middle", to: "elf-ending" },
    { from: "elf-easy", to: "elf-hard" },
    { from: "elf-hard", to: "elf-ending" },
  ],
};

export const CHARACTERS = {
  "elf-practice": { name: "リーネ", size: 5 },
  "elf-easy": { name: "エフィナ", size: 10 },
  "elf-middle": { name: "セリス", size: 15 },
  "elf-hard": { name: "フローリア", size: 20 },
  "elf-ending": { name: "アルティナ", size: 25 },
};
