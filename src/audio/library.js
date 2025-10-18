// Collect all BGM assets from assets/bgm and also any audio placed in assets/img
// (wav/mp3/ogg) so Vite bundles them. Returns URLs suitable for HTMLAudioElement.src
const BGM_FILES = [
  "20230108_StepUp.wav",
  "20230505_AzureSea.wav",
  "FlyHighly.wav",
  "indie-game-pix-battle-bak.wav",
  "indie-game-pix-battle.wav",
  "indie-game-pix-ending.wav",
  "indie-game-pix-gamestart-bak.wav",
  "indie-game-pix-gamestart.wav",
  "indie-game-pix-opening.wav",
  "indie-game-pix-prologue.wav",
  "lastbattle.wav",
  "opening.wav",
  "practice.wav",
];

const EXTRA_AUDIO_FILES = [];

const bgmMap = Object.fromEntries(
  [...BGM_FILES, ...EXTRA_AUDIO_FILES].map((name) => [name, `/assets/bgm/${name}`]),
);

export function listBgmUrls() {
  return Object.values(bgmMap);
}
