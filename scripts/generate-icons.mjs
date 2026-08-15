/**
 * Generates every launcher/splash raster in `assets/images/` from the ExpenseTracker
 * brand mark, so the icon set is reproducible instead of hand-exported.
 *
 * The mark (see `logo/README.md`) is two opposing quarter-discs around a centre dot:
 * money in, money out, and the balance between them. Because that geometry is purely
 * analytic, it is rasterised here directly — supersampled for anti-aliasing and encoded
 * as PNG with node's built-in zlib — rather than pulling in an SVG rasteriser.
 *
 * Source of truth: logo/icon-master.svg, logo/icon-maskable.svg, logo/glyph-*.svg.
 * Run with `npm run icons`.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'assets/images');

// ── Brand constants (logo/README.md §Colours) ────────────────────────────────
const LIME = [0xd8, 0xff, 0x3e];
const WHITE = [0xff, 0xff, 0xff];
const FIELD_TL = [0x20, 0x24, 0x0a]; // gradient, top-left
const FIELD_BR = [0x0a, 0x0b, 0x03]; // gradient, bottom-right
const FIELD_FLAT = [0x15, 0x18, 0x06]; // flat equivalent

// The SVG sources are authored in a 512-unit box: mark circle r=160 centred at
// (256,256) — 62.5% of the tile — with a 34-unit centre dot.
const VIEW = 512;
const CX = 256;
const CY = 256;
const R = 160;
const DOT_R = 34;
const SECOND_QUADRANT_OPACITY = 0.6;

// Anti-aliasing quality: SS×SS samples per pixel.
const SS = 4;

// ── Geometry ────────────────────────────────────────────────────────────────
/**
 * Coverage of the three mark shapes at one sample point, in 512-unit space.
 * Returns alpha after source-over compositing in SVG paint order:
 * top-right quadrant (solid) → bottom-left quadrant (60%) → centre dot (solid).
 */
function markAlphaAt(x, y) {
  const dx = x - CX;
  const dy = y - CY;
  const d2 = dx * dx + dy * dy;

  let a = 0;
  if (d2 <= R * R) {
    // `M256 96 A160 160 0 0 1 416 256 H256 Z` — the top-right quarter disc.
    if (dx >= 0 && dy <= 0) a = 1;
    // `M256 416 A160 160 0 0 1 96 256 H256 Z` — bottom-left, drawn at 60%.
    else if (dx <= 0 && dy >= 0) a = SECOND_QUADRANT_OPACITY + a * (1 - SECOND_QUADRANT_OPACITY);
  }
  // The centre dot lands last and is opaque, so it overrides both quadrants.
  if (d2 <= DOT_R * DOT_R) a = 1;
  return a;
}

/** Linear two-stop field gradient: top-left → bottom-right, `x1 0 y1 0 → x2 .6 y2 1`. */
function fieldColorAt(u, v) {
  const t = Math.min(1, Math.max(0, (0.6 * u + v) / (0.6 * 0.6 + 1)));
  return [
    Math.round(FIELD_TL[0] + (FIELD_BR[0] - FIELD_TL[0]) * t),
    Math.round(FIELD_TL[1] + (FIELD_BR[1] - FIELD_TL[1]) * t),
    Math.round(FIELD_TL[2] + (FIELD_BR[2] - FIELD_TL[2]) * t),
  ];
}

/**
 * Renders one square RGBA buffer.
 *
 * @param size      output edge length in px
 * @param opts.mark mark colour, or null to draw the field alone
 * @param opts.scale mark scale about the tile centre (1 = the 62.5% master)
 * @param opts.field 'gradient' | 'flat' | null (null = transparent, glyph only)
 */
function render(size, { mark = LIME, scale = 1, field = null } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const unitsPerPx = VIEW / size;
  const samples = SS * SS;

  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let cover = 0;
      if (mark) {
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const ux = (pxi + (sx + 0.5) / SS) * unitsPerPx;
            const uy = (py + (sy + 0.5) / SS) * unitsPerPx;
            // Undo the group transform so the sample lands in master space.
            cover += markAlphaAt(CX + (ux - CX) / scale, CY + (uy - CY) / scale);
          }
        }
        cover /= samples;
      }

      const i = (py * size + pxi) * 4;
      if (field) {
        const base =
          field === 'flat' ? FIELD_FLAT : fieldColorAt((pxi + 0.5) / size, (py + 0.5) / size);
        // Mark over an opaque field: the tile stays fully opaque.
        px[i] = Math.round(base[0] + (mark ? (mark[0] - base[0]) * cover : 0));
        px[i + 1] = Math.round(base[1] + (mark ? (mark[1] - base[1]) * cover : 0));
        px[i + 2] = Math.round(base[2] + (mark ? (mark[2] - base[2]) * cover : 0));
        px[i + 3] = 255;
      } else {
        // Glyph on transparent: constant colour, coverage carried in alpha.
        px[i] = mark[0];
        px[i + 1] = mark[1];
        px[i + 2] = mark[2];
        px[i + 3] = Math.round(cover * 255);
      }
    }
  }
  return px;
}

// ── Minimal PNG encoder (RGBA8, filter 0) ───────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  // 10–12: deflate / adaptive filtering / no interlace, all zero.

  // Prefix every scanline with filter type 0 (None).
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    px.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Outputs ─────────────────────────────────────────────────────────────────
// Android adaptive icons crop the foreground to the centre 66.7%, so the mark uses
// the maskable scale (0.62) — which lands it at ~58% of the *visible* tile, matching
// how the master reads. The standalone glyphs use the 1.06 of glyph-lime.svg.
const MASKABLE_SCALE = 0.62;
const GLYPH_SCALE = 1.06;

const TARGETS = [
  // iOS / store / Expo Go: full-bleed master, no transparency.
  ['icon.png', 1024, { mark: LIME, scale: 1, field: 'gradient' }],
  ['android-icon-background.png', 1024, { mark: null, field: 'gradient' }],
  ['android-icon-foreground.png', 1024, { mark: LIME, scale: MASKABLE_SCALE, field: null }],
  ['android-icon-monochrome.png', 1024, { mark: WHITE, scale: MASKABLE_SCALE, field: null }],
  // Splash: the lime glyph alone, tinted onto the dark splash background.
  ['splash-icon.png', 1024, { mark: LIME, scale: GLYPH_SCALE, field: null }],
  // Favicon: flat field, since tiny gradients muddy at 96px.
  ['favicon.png', 96, { mark: LIME, scale: 1, field: 'flat' }],
];

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, size, opts] of TARGETS) {
  const png = encodePng(render(size, opts), size);
  writeFileSync(resolve(OUT_DIR, name), png);
  console.log(`${name.padEnd(32)} ${String(size).padStart(4)}px  ${(png.length / 1024).toFixed(1)} KB`);
}
