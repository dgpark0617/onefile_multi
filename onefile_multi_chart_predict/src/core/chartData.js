import btcBundled from "../../data/btc_krw_1h.json";
import { RULES } from "./constants.js";
import { randIntFrom } from "./rng.js";

let dataset = btcBundled;

export async function initDataset() {
  if (dataset?.candles?.length) return dataset;
  try {
    const res = await fetch("/data/btc_krw_1h.json");
    if (res.ok) dataset = await res.json();
  } catch {
    /* bundled fallback */
  }
  return dataset;
}

export function loadDatasetSync() {
  return dataset;
}

export function getDataset() {
  return dataset;
}

export function pickRandomRound(candles, rng) {
  const minPivot = RULES.promptBars;
  const maxPivot = candles.length - RULES.revealBars - 1;
  for (let attempt = 0; attempt < 80; attempt++) {
    const pivot = randIntFrom(rng, minPivot, maxPivot);
    const prompt = candles.slice(pivot - RULES.promptBars, pivot);
    const reveal = candles.slice(pivot, pivot + RULES.revealBars);
    const baseClose = prompt[prompt.length - 1].c;
    const finalClose = reveal[reveal.length - 1].c;
    if (finalClose === baseClose) continue;
    return {
      prompt,
      reveal,
      baseClose,
      finalClose,
      actual: finalClose > baseClose ? "long" : "short",
      pivot,
    };
  }
  const pivot = minPivot + 120;
  const prompt = candles.slice(pivot - RULES.promptBars, pivot);
  const reveal = candles.slice(pivot, pivot + RULES.revealBars);
  const baseClose = prompt[prompt.length - 1].c;
  const finalClose = reveal[reveal.length - 1].c;
  return {
    prompt,
    reveal,
    baseClose,
    finalClose,
    actual: finalClose > baseClose ? "long" : "short",
    pivot,
  };
}
