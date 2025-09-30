// Define route graph and character meta

export const ROUTE = {
  nodes: {
    start: { x: 100, y: 300, type: "start", label: "Start" },
    "elf-practice": { x: 240, y: 250, type: "elf", label: "翠緑の門" },
    "elf-easy": { x: 400, y: 190, type: "elf", label: "木漏れ日の小径" },
    "elf-middle": { x: 560, y: 120, type: "elf", label: "刻印の広間" },
    "elf-bad-ending": { x: 720, y: 120, type: "end", label: "儚き灯火" },
    "elf-hard": { x: 560, y: 260, type: "elf", label: "精霊の花園" },
    "elf-ultra": { x: 720, y: 260, type: "elf", label: "森羅の社" },
    "elf-true-ending": { x: 880, y: 260, type: "end", label: "黎明の庭" },
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
  parents: {
    "elf-practice": "start",
    "elf-easy": "elf-practice",
    "elf-middle": "elf-easy",
    "elf-bad-ending": "elf-middle",
    "elf-hard": "elf-easy",
    "elf-ultra": "elf-hard",
    "elf-true-ending": "elf-ultra",
  },
};

export const CHARACTERS = {
  "elf-practice": {
    name: "リーネ",
    size: 5,
    images: {
      normal: "/assets/img/character/enemies/practice/riene_normal.png",
      angry: "/assets/img/character/enemies/practice/riene_angry.png",
    },
  },
  "elf-easy": {
    name: "エフィナ",
    size: 10,
    images: {
      normal: "/assets/img/character/enemies/easy/efina_normal.png",
      angry: "/assets/img/character/enemies/easy/efina_angry.png",
    },
  },
  "elf-middle": {
    name: "セリス",
    size: 15,
    images: {
      normal: "/assets/img/character/enemies/normal/cerys_normal.png",
      angry: "/assets/img/character/enemies/normal/cerys_angry.png",
    },
  },
  "elf-hard": {
    name: "フローリア",
    size: 20,
    images: {
      normal: "/assets/img/character/enemies/hard/floria_normal.png",
      angry: "/assets/img/character/enemies/hard/floria_angry.png",
    },
  },
  "elf-ultra": {
    name: "アルティナ",
    size: 25,
    images: {
      normal: "/assets/img/character/enemies/ultra/altina_normal.png",
      angry: "/assets/img/character/enemies/ultra/altina_angry.png",
    },
  },
};
