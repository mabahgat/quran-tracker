// Generates all app icon PNG variants from a single SVG glyph definition.
// Run with: npm run icons
// Requires `sharp` (a devDependency).
//
// The mark: an open mushaf (Quran) with a gold crescent, on the app's green
// gradient — simple, standard, and readable down to favicon size.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = (p) => resolve(root, p);

const GREEN_LIGHT = '#2A8C5F';
const GREEN_DARK = '#0E4A30';
const PAGE_LIGHT = '#FBF7EC';
const PAGE_DARK = '#E8DCC2';
const LINE = '#5BA985';
const GOLD = '#E8C06A';

// The glyph (crescent + open book) drawn in a 1024×1024 space, centered.
// `mono` renders everything in a single flat color (for the monochrome icon).
function glyph(mono) {
  const page = mono ? 'currentColor' : 'url(#page)';
  const pageEdge = mono ? 'currentColor' : PAGE_DARK;
  const line = mono ? 'none' : LINE;
  const gold = mono ? 'currentColor' : GOLD;
  const spine = mono ? 'currentColor' : '#C9B488';

  return `
  <!-- crescent -->
  <g ${mono ? '' : ''}>
    <circle cx="512" cy="300" r="118" fill="${gold}" mask="url(#cres)"/>
  </g>

  <!-- open book -->
  <g stroke="${pageEdge}" stroke-width="${mono ? 0 : 6}" stroke-linejoin="round">
    <path d="M512 588 C430 552 326 548 232 576 L196 690 C318 660 430 664 512 702 Z" fill="${page}"/>
    <path d="M512 588 C594 552 698 548 792 576 L828 690 C706 660 594 664 512 702 Z" fill="${page}"/>
  </g>

  <!-- spine -->
  <path d="M512 588 L512 702" stroke="${spine}" stroke-width="10" stroke-linecap="round" fill="none"/>

  <!-- verse lines -->
  <g stroke="${line}" stroke-width="11" stroke-linecap="round" fill="none" opacity="${mono ? 0 : 1}">
    <path d="M300 590 C360 582 430 584 478 598"/>
    <path d="M286 620 C352 612 430 614 478 628"/>
    <path d="M280 650 C350 644 432 646 478 660"/>
    <path d="M546 598 C594 584 664 582 724 590"/>
    <path d="M546 628 C594 614 672 612 738 620"/>
    <path d="M546 660 C592 646 674 644 744 650"/>
  </g>

  <!-- cadence dots: progress beneath the book -->
  <g>
    <circle cx="432" cy="772" r="15" fill="${gold}"/>
    <circle cx="472" cy="772" r="15" fill="${gold}"/>
    <circle cx="512" cy="772" r="15" fill="${mono ? 'currentColor' : '#9FD3B8'}" opacity="${mono ? 0.5 : 1}"/>
    <circle cx="552" cy="772" r="15" fill="${mono ? 'currentColor' : '#9FD3B8'}" opacity="${mono ? 0.5 : 1}"/>
    <circle cx="592" cy="772" r="15" fill="${mono ? 'currentColor' : '#9FD3B8'}" opacity="${mono ? 0.5 : 1}"/>
  </g>`;
}

const defs = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${GREEN_LIGHT}"/>
      <stop offset="1" stop-color="${GREEN_DARK}"/>
    </linearGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${PAGE_LIGHT}"/>
      <stop offset="1" stop-color="${PAGE_DARK}"/>
    </linearGradient>
    <mask id="cres">
      <circle cx="512" cy="300" r="118" fill="white"/>
      <circle cx="556" cy="284" r="104" fill="black"/>
    </mask>
  </defs>`;

// The mark's content bounding box is centered horizontally at x=512 but its
// vertical center sits at ~484 (crescent top to dots bottom). This helper scales
// the mark about its true content center and places it at the canvas center.
const CONTENT_CY = 484.5;
const place = (s) => `translate(512 512) scale(${s}) translate(-512 ${-CONTENT_CY})`;

// Full square icon (background + glyph), mark sized to leave a small margin.
function fullSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <g transform="${place(1.1)}">
    ${glyph(false)}
  </g>
</svg>`;
}

// Glyph only, scaled & centered (for Android adaptive foreground and the
// splash). `color` sets `currentColor` for the mono case. Default scale leaves
// margin so the mark stays inside the launcher's safe zone.
function glyphSvg({ mono = false, scale = 0.92, color }) {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"${color ? ` color="${color}"` : ''}>
  ${defs}
  <g transform="${place(scale)}">
    ${glyph(mono)}
  </g>
</svg>`;
}

// Solid gradient background (Android adaptive background layer).
function bgSvg() {
  return `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="1024" height="1024" fill="url(#bg)"/>
</svg>`;
}

async function png(svg, file, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out(file));
  console.log(`  ${file} (${size}×${size})`);
}

// watchOS app icons must be fully opaque (no alpha channel). Flatten onto the
// brand green and strip alpha so the watch target installs and renders correctly.
async function opaquePng(svg, file, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .flatten({ background: '#1F7A53' })
    .removeAlpha()
    .png()
    .toFile(out(file));
  console.log(`  ${file} (${size}×${size}, opaque)`);
}

async function main() {
  await mkdir(out('assets/icon-source'), { recursive: true });
  // Persist the SVG sources of truth.
  await writeFile(out('assets/icon-source/icon.svg'), fullSvg());
  await writeFile(out('assets/icon-source/glyph.svg'), glyphSvg({ scale: 0.92 }));

  console.log('Generating icons…');
  const full = fullSvg();
  await png(full, 'assets/images/icon.png', 1024);
  await png(full, 'assets/images/favicon.png', 48);

  // Android adaptive layers. The foreground is kept within the central safe
  // zone (the launcher mask can crop the outer ~1/3).
  await png(bgSvg(), 'assets/images/android-icon-background.png', 512);
  await png(glyphSvg({ scale: 0.92 }), 'assets/images/android-icon-foreground.png', 512);
  await png(glyphSvg({ mono: true, scale: 0.92, color: '#ffffff' }), 'assets/images/android-icon-monochrome.png', 512);

  // Splash mark (white glyph on transparent; splash bg color set in app.json).
  await png(glyphSvg({ mono: true, scale: 1.0, color: '#ffffff' }), 'assets/images/splash-icon.png', 512);

  // Apple Watch app icon — opaque (watchOS forbids alpha), lives in the target.
  await opaquePng(full, 'targets/watch/icon.png', 1024);

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
