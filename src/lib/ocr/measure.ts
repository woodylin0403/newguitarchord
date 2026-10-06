/**
 * Browser-only glue: draw the chart image onto a canvas and run the pixel
 * measurement from `align.ts` on it.
 */

import {
  alignChart,
  bitmapFromRgba,
  fallbackChart,
  type AlignResult,
  type OcrChart,
} from "@/lib/ocr/align";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image decode failed"));
    img.src = src;
  });
}

/** ChordPro for `chart`, with chord positions measured on `imageSrc`. */
export async function alignOnImage(
  imageSrc: string,
  chart: OcrChart,
): Promise<AlignResult> {
  const needed = chart.lines.filter(
    (l) => l.chords.length && l.lyrics.trim(),
  ).length;
  try {
    const img = await loadImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("no 2d context");
    ctx.fillStyle = "#fff"; // transparent PNGs → white paper
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return alignChart(bitmapFromRgba(data, canvas.width, canvas.height), chart);
  } catch {
    return { chordpro: fallbackChart(chart), measured: 0, needed };
  }
}
