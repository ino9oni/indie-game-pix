// Define route graph and character meta
import { assetPath } from "../utils/assetPath.js";

export const ROUTE = {
  layout: "fixed",
  bounds: {
    minX: 0,
    maxX: 1536,
    minY: 0,
    maxY: 1024,
  },
  nodes: {
    start: { x: 150, y: 940, type: "start", label: "Start" },
    "elf-practice": { x: 400, y: 850, type: "elf", label: "翠緑の門" },
    "elf-easy": { x: 1050, y: 760, type: "elf", label: "木漏れ日の小径" },
    "elf-middle": { x: 320, y: 320, type: "elf", label: "刻印の広間" },
    "elf-hard": { x: 760, y: 360, type: "elf", label: "精霊の花園" },
    "elf-ultra": { x: 1160, y: 300, type: "elf", label: "森羅の社" },
    "elf-true-ending": { x: 1110, y: 60, type: "end", label: "黎明の庭" },
  },
  edges: [
    { from: "start", to: "elf-practice" },
    { from: "elf-practice", to: "elf-easy" },
    { from: "elf-easy", to: "elf-middle" },
    { from: "elf-middle", to: "elf-hard" },
    { from: "elf-hard", to: "elf-ultra" },
    { from: "elf-ultra", to: "elf-true-ending" },
  ],
  parents: {
    "elf-practice": "start",
    "elf-easy": "elf-practice",
    "elf-middle": "elf-easy",
    "elf-hard": "elf-middle",
    "elf-ultra": "elf-hard",
    "elf-true-ending": "elf-ultra",
  },
};

export const CHARACTERS = {
  "elf-practice": {
    name: "リーネ",
    size: 5,
    difficulty: "practice",
    images: {
      normal: assetPath("assets/img/character/enemies/practice/riene_normal.png"),
      angry: assetPath("assets/img/character/enemies/practice/riene_angry.png"),
      fullbody: assetPath("assets/img/character/enemies/practice/riene_fullbody.png"),
    },
  },
  "elf-easy": {
    name: "エフィナ",
    size: 5,
    difficulty: "easy",
    images: {
      normal: assetPath("assets/img/character/enemies/easy/efina_normal.png"),
      angry: assetPath("assets/img/character/enemies/easy/efina_angry.png"),
      fullbody: assetPath("assets/img/character/enemies/easy/efina_fullbody.png"),
    },
  },
  "elf-middle": {
    name: "セリス",
    size: 5,
    difficulty: "middle",
    images: {
      normal: assetPath("assets/img/character/enemies/normal/cerys_normal.png"),
      angry: assetPath("assets/img/character/enemies/normal/cerys_angry.png"),
      fullbody: assetPath("assets/img/character/enemies/normal/cerys_fullbody.png"),
    },
  },
  "elf-hard": {
    name: "フローリア",
    size: 10,
    difficulty: "hard",
    images: {
      normal: assetPath("assets/img/character/enemies/hard/floria_normal.png"),
      angry: assetPath("assets/img/character/enemies/hard/floria_angry.png"),
      fullbody: assetPath("assets/img/character/enemies/hard/floria_fullbody.png"),
    },
  },
  "elf-ultra": {
    name: "アルティナ",
    size: 10,
    difficulty: "ultra",
    images: {
      normal: assetPath("assets/img/character/enemies/ultra/altina_normal.png"),
      angry: assetPath("assets/img/character/enemies/ultra/altina_angry.png"),
      fullbody: assetPath("assets/img/character/enemies/ultra/altina_fullbody.png"),
    },
  },
};
