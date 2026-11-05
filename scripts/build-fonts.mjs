// Converts the Kalam WOFF files to TrueType for the server-side renderer:
// resvg reads TrueType and OpenType, not WOFF.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = join(root, "node_modules", "@fontsource", "kalam", "files");
const target = join(root, "build", "fonts");
const FILES = ["latin-400", "latin-700", "latin-ext-400", "latin-ext-700"];

/** WOFF 1.0 is the TrueType tables, each zlib-compressed; this unpacks them. */
function woffToSfnt(woff) {
  const flavor = woff.readUInt32BE(4);
  const count = woff.readUInt16BE(12);
  const tables = Array.from({ length: count }, (_, i) => {
    const at = 44 + i * 20;
    return {
      tag: woff.readUInt32BE(at),
      offset: woff.readUInt32BE(at + 4),
      compressed: woff.readUInt32BE(at + 8),
      length: woff.readUInt32BE(at + 12),
      checksum: woff.readUInt32BE(at + 16),
    };
  });
  let selector = 0;
  while (1 << (selector + 1) <= count) selector++;
  const range = (1 << selector) * 16;
  const header = Buffer.alloc(12 + 16 * count);
  header.writeUInt32BE(flavor, 0);
  header.writeUInt16BE(count, 4);
  header.writeUInt16BE(range, 6);
  header.writeUInt16BE(selector, 8);
  header.writeUInt16BE(count * 16 - range, 10);
  let offset = header.length;
  const bodies = tables.map((t, i) => {
    const raw = woff.subarray(t.offset, t.offset + t.compressed);
    const data = t.compressed < t.length ? inflateSync(raw) : raw;
    const entry = 12 + i * 16;
    header.writeUInt32BE(t.tag, entry);
    header.writeUInt32BE(t.checksum, entry + 4);
    header.writeUInt32BE(offset, entry + 8);
    header.writeUInt32BE(t.length, entry + 12);
    const padded = Buffer.alloc((data.length + 3) & ~3);
    data.copy(padded);
    offset += padded.length;
    return padded;
  });
  return Buffer.concat([header, ...bodies]);
}

mkdirSync(target, { recursive: true });
for (const name of FILES) {
  const woff = readFileSync(join(source, `kalam-${name}-normal.woff`));
  writeFileSync(join(target, `kalam-${name}.ttf`), woffToSfnt(woff));
}
console.log(`fonts: ${FILES.length} TrueType files in build/fonts`);
