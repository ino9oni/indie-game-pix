// Define route graph and character meta

export const ROUTE = {
  nodes: {
    start: { x: 120, y: 320, type: "start", label: "Start" },
    "elf-practice": { x: 240, y: 260, type: "elf", label: "Practice" },
    "elf-easy": { x: 360, y: 210, type: "elf", label: "Easy" },
    "elf-middle": { x: 500, y: 160, type: "elf", label: "Middle" },
    "elf-hard": { x: 640, y: 120, type: "elf", label: "Hard" },
    "elf-ultra": { x: 760, y: 80, type: "elf", label: "Ultra" },
  },
  edges: [
    { from: "start", to: "elf-practice" },
    { from: "elf-practice", to: "elf-easy" },
    { from: "elf-easy", to: "elf-middle" },
    { from: "elf-middle", to: "elf-hard" },
    { from: "elf-hard", to: "elf-ultra" },
  ],
};

export const CHARACTERS = {
  "elf-practice": { name: "リーネ", size: 5 },
  "elf-easy": { name: "エフィナ", size: 10 },
  "elf-middle": { name: "セリス", size: 15 },
  "elf-hard": { name: "フローリア", size: 20 },
  "elf-ultra": { name: "アルティナ", size: 25 },
};
