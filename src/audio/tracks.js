// Import WAV assets so Vite bundles them for production
// If you add more files, import and map them here.
import OPENING_THEME from "../../assets/bgm/indie-game-pix-opening.wav";
import ROUTE_THEME from "../../assets/bgm/20230505_AzureSea.wav";
import BATTLE_THEME from "../../assets/bgm/indie-game-pix-battle.wav";
import ENDING_THEME from "../../assets/bgm/indie-game-pix-ending.wav";

export const TRACKS = {
  prologue: OPENING_THEME,
  opening: OPENING_THEME,
  route: ROUTE_THEME,
  conversation: ROUTE_THEME,
  picross: BATTLE_THEME,
  ending: ENDING_THEME,
};
