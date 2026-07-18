import celesteUrl from "./chars/celeste.png";
import celestialUrl from "./chars/celestial.png";
import lilithUrl from "./chars/lilith.png";
import liliyaUrl from "./chars/liliya.png";

/** @type {Record<string, string>} */
export const CHAR_SPRITE_URLS = {
  celeste: celesteUrl,
  celestial: celestialUrl,
  lilith: lilithUrl,
  liliya: liliyaUrl,
};

/** @type {Record<string, HTMLImageElement>} */
const images = {};
let loadPromise = null;

export function preloadCharSprites() {
  if (loadPromise) return loadPromise;
  const entries = Object.entries(CHAR_SPRITE_URLS);
  loadPromise = Promise.all(
    entries.map(
      ([id, url]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images[id] = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
  return loadPromise;
}

export function getCharSprite(id) {
  return images[id] || null;
}
