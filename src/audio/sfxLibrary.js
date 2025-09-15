// Eagerly import SFX files so Vite bundles them and we get URLs at runtime
const sfxModules = import.meta.glob('../../assets/se/*.{wav,mp3,ogg}', { eager: true, as: 'url' })

export function findSfxUrl(pattern) {
  const regex = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), 'i')
  for (const [path, url] of Object.entries(sfxModules)) {
    if (regex.test(path)) return url
  }
  return null
}

export function listSfx() {
  return Object.values(sfxModules)
}

