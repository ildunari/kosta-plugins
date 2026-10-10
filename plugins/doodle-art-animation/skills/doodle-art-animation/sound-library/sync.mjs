// sync.mjs: copy sfxlib.js into every style's toolkit (styles/<id>/toolkit/sfxlib.js), because a film folder is a
// copy of its style's toolkit and build.py inlines the copy it finds there. Run it after any change to sfxlib.js;
// sfxlib_test.mjs fails while a copy differs. Usage: node sync.mjs [--check]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url)), styles = resolve(here, '../styles');
const lib = readFileSync(resolve(here, 'sfxlib.js'), 'utf8'), check = process.argv.includes('--check');
let stale = 0;
for (const id of readdirSync(styles, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort()) {
  const tk = resolve(styles, id, 'toolkit'); if (!existsSync(tk)) continue;
  const f = resolve(tk, 'sfxlib.js'), same = existsSync(f) && readFileSync(f, 'utf8') === lib;
  if (same) { console.log(`${id}: up to date`); continue; }
  if (check) { console.error(`${id}: toolkit/sfxlib.js differs from sound-library/sfxlib.js (run node sync.mjs)`); stale++; }
  else { writeFileSync(f, lib); console.log(`${id}: copied`); }
}
process.exit(stale ? 1 : 0);
