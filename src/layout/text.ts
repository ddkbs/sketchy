/**
 * Text metrics for the handwriting font, without a DOM.
 *
 * Widths are per-character estimates in em for Kalam, rounded up slightly so
 * boxes err on the roomy side; the viewer shrinks text that still overflows.
 */

const NARROW = new Set([..."il.,:;'|!`()[]{}/\\ "]);
const WIDE = new Set([..."mwMW@%&"]);

export function charWidthEm(ch: string): number {
  if (NARROW.has(ch)) return 0.3;
  if (WIDE.has(ch)) return 0.82;
  if (/[A-Z]/.test(ch)) return 0.62;
  if (/[0-9]/.test(ch)) return 0.55;
  if (ch === "-" || ch === "_") return 0.45;
  return 0.52;
}

export function textWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) em += charWidthEm(ch);
  return em * fontSize;
}

/** Greedy word wrap; words longer than the limit are broken by character. */
export function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, fontSize) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = "";
      let rest = word;
      while (textWidth(rest, fontSize) > maxWidth) {
        let cut = 1;
        while (cut < rest.length && textWidth(rest.slice(0, cut + 1), fontSize) <= maxWidth) {
          cut++;
        }
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

export function lineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.3);
}

export type MeasuredText = { lines: string[]; width: number; height: number };

export function measureText(text: string, fontSize: number, maxWidth: number): MeasuredText {
  const lines = wrapText(text, fontSize, maxWidth);
  const width = Math.max(0, ...lines.map((l) => textWidth(l, fontSize)));
  return { lines, width: Math.ceil(width), height: lines.length * lineHeight(fontSize) };
}
