// Collect all BGM assets from assets/bgm and also any audio placed in assets/img
// (wav/mp3/ogg) so Vite bundles them. Returns URLs suitable for HTMLAudioElement.src
const modules = {
  ...import.meta.glob('../../assets/bgm/*.{wav,mp3,ogg}', { eager: true, as: 'url' }),
  ...import.meta.glob('../../assets/img/*.{wav,mp3,ogg}', { eager: true, as: 'url' }),
}

export function listBgmUrls() {
  return Object.values(modules)
}
