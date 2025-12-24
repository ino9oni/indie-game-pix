import { assetPath, normalizeAssetUrl } from "./assetPath.js";

const assetModules = import.meta.glob(
  "../../public/assets/**/*.{png,jpg,jpeg,webp,gif,wav,mp3,ogg}",
  { eager: true, as: "url" },
);

const extraAssetUrls = [
  assetPath("assets/bgm/indie-game-fanfare.wav"),
  assetPath("assets/se/collection_unlock.wav"),
];

const DEFAULT_CACHE_NAME = "elfpix-assets-v1";
const DEFAULT_CONCURRENCY = 4;

const buildPreloadList = () => {
  const urls = [
    ...Object.values(assetModules).map(normalizeAssetUrl),
    ...extraAssetUrls.map(normalizeAssetUrl),
  ].filter(Boolean);
  return Array.from(new Set(urls)).filter(
    (url) => !/^(?:data:|blob:)/.test(url),
  );
};

const runQueue = async (items, workerCount, worker) => {
  const queue = items.slice();
  const count = Math.min(workerCount, queue.length);
  await Promise.all(
    Array.from({ length: count }, () =>
      worker(queue),
    ),
  );
};

export async function preloadAssets({
  cacheName = DEFAULT_CACHE_NAME,
  concurrency = DEFAULT_CONCURRENCY,
} = {}) {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const urls = buildPreloadList();
  if (!urls.length) return;
  const cache = await caches.open(cacheName);
  await runQueue(urls, concurrency, async (queue) => {
    while (queue.length) {
      const url = queue.pop();
      if (!url) continue;
      try {
        const cached = await cache.match(url);
        if (cached) continue;
        const response = await fetch(url);
        if (!response.ok) continue;
        await cache.put(url, response);
      } catch {
        // Skip asset failures to avoid blocking other downloads.
      }
    }
  });
}
