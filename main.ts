// Leonida Legend — a GTA VI trophy guide and tracker, built for make.fun
// bounty gta6-trophy-guide-01 (round 2 rebuild).
//
// What lives in this folder:
//   app/         The guide itself: static files, no build step. Open
//                app/index.html in a browser (or `node serve.ts` and visit
//                http://localhost:8080) and it runs fully offline — the only
//                fetch is the local app/data/trophies.json, and nothing in
//                app/ points at the network.
//   screenshots/ 3 or 4 JPEG captures of the running guide. The first file
//                by name is the cover the judge sees first.
//   vendor/      The make.fun dossier library. Do not touch it: the scorer
//                requires dossier.json to be byte for byte what its own
//                copy of that library writes, so this file never edits the
//                dossier after the library produces it.
//
// What this program does when you run it (`node main.ts`, or with
// MAKEFUN_OUTPUT_DIR set to some other folder):
//   1. Copies app/ and screenshots/ into the output folder.
//   2. Asks the vendored library to write output/dossier.json — the
//      summary the judge reads (the screenshots, the first load's files
//      and bytes, and the guide's source), under the scorer's own caps:
//      at most 4 screenshots of 256 KiB each, at most 993 app files and
//      48 MiB of app files, and a text budget of 160 KiB.
//   3. Reads dossier.json back and prints a short summary to stdout, so a
//      human can see at a glance that the handover is complete. That read
//      is verification only: it changes no byte of the output.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const dossierPath = join(destDir, 'dossier.json');

mkdirSync(destDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(destDir, 'app'), { recursive: true });
mkdirSync(join(destDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(destDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  dossierPath,
  buildDossier(destDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// Verification only: read the dossier the library just wrote and summarise
// it, without touching a single output byte.
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
const dossierTextBytes = Buffer.byteLength(dossier.text ?? '', 'utf8');
const shotList = Array.isArray(dossier.images) ? dossier.images : [];
console.log('dossier written: %s', dossierPath);
console.log('  schema: %s', dossier.schema);
console.log('  cover index: %s', dossier.cover);
console.log('  images: %s', shotList.length);
console.log('  text bytes: %s', dossierTextBytes);
