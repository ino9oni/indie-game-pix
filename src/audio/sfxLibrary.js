// Eagerly import SFX files so Vite bundles them and we get URLs at runtime
const SFX_FILES = [
  "chisel_tap.wav",
  "coin_rush.wav",
  "fanfare_melodic.wav",
  "foot_wood.wav",
  "indie-game-pix-enemy-encount.wav",
  "indie-game-pix-stage-clear.wav",
  "picross_click_soft.wav",
  "score_chiptune.wav",
  "ui_cancel.wav",
  "ui_confirm.wav",
];

const sfxMap = Object.fromEntries(
  SFX_FILES.map((name) => [name, `/assets/se/${name}`]),
);

export function findSfxUrl(pattern) {
  const regex =
    pattern instanceof RegExp ? pattern : new RegExp(String(pattern), "i");
  for (const [name, url] of Object.entries(sfxMap)) {
    if (regex.test(name)) return url;
  }
  return null;
}

export function listSfx() {
  return Object.values(sfxMap);
}
