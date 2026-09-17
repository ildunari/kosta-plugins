// probe.mjs — load a built doodle film and evaluate one JS function body in the page, print its JSON result.
// usage: node probe.mjs film.html '<async function body using window>'
// Playwright is looked up from NODE_PATH-style DOODLE_NODE_MODULES, then the global npm root.
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path'; import { execFileSync } from 'child_process';
const require = createRequire(import.meta.url);
let chromium;
const roots = [process.env.DOODLE_NODE_MODULES, execFileSync('npm', ['root', '-g']).toString().trim()].filter(Boolean);
for (const r of roots) { try { ({ chromium } = require(path.join(r, 'playwright'))); break; } catch {} }
if (!chromium) { console.error('probe: playwright not found (set DOODLE_NODE_MODULES)'); process.exit(2); }
const [file, body] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(pathToFileURL(path.resolve(file)).href + '?render=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000, polling: 250 });
let result = null;
try { result = await page.evaluate(`(async () => { ${body} })()`); }
catch (e) { errors.push(String(e.message || e)); }
console.log(JSON.stringify({ result, errors }));
await browser.close();
