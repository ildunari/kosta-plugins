// Shared by render.mjs, smoke_test.mjs and sound/*.mjs: find Playwright, launch Chromium, open a film.
//   const browser = await launch();
//   const film = await openFilm(browser, 'film.html');   // or a story.js (sound only: no embedded fonts)
//   film.page, film.info (FILM_INFO), film.fonts (filmReady() report), film.errors (page errors so far, live)
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function playwright() {   // $PLAYWRIGHT_MODULE (a path to playwright/index.mjs) first, as CI sets it
  if (process.env.PLAYWRIGHT_MODULE) return import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href);
  try { return require('playwright'); } catch {}
  try { return require(resolve(execFileSync('npm', ['root', '-g']).toString().trim(), 'playwright')); } catch {}
  for (const p of ['/opt/node22/lib/node_modules/playwright/index.mjs']) if (existsSync(p)) return import(p);
  throw new Error('Playwright not found: npm i -g playwright && npx playwright install chromium');
}

// Chromium: $PW_CHROMIUM, else the full Chrome build Playwright installed (the booth loops were rendered with it),
// else Playwright's default. All frames of one film should come from the same binary.
export async function launch() {
  const { chromium } = await playwright();
  const args = ['--disable-gpu-vsync'];
  const known = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'];
  const exe = process.env.PW_CHROMIUM || known.find(p => existsSync(p));
  if (exe) { try { return await chromium.launch({ executablePath: exe, args }); } catch (e) { if (process.env.PW_CHROMIUM) throw e; } }
  return chromium.launch({ args });
}

const TOOLKIT = ['core.js', 'l3d.js', 'beats.js', 'sfxlib.js', 'sound/engine.js', 'sound/score.js']; // sfxlib.js only when present

export async function openFilm(browser, file, o = {}) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const abs = resolve(file);
  if (/\.html?$/i.test(abs)) await page.goto(pathToFileURL(abs).href);
  else { // a story.js: the toolkit files, then the story, on a bare page
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000"><canvas id="c" width="1920" height="1080" style="display:block"></canvas></body></html>');
    for (const f of TOOLKIT) if (existsSync(resolve(here, f))) await page.addScriptTag({ content: readFileSync(resolve(here, f), 'utf8') });
    await page.addScriptTag({ content: readFileSync(abs, 'utf8') });
  }
  const ok = await page.evaluate(() => !!window.FILM_INFO).catch(() => false);
  if (!ok) throw new Error(`${file}: no film (defineFilm was not called)` + (errors.length ? '\n' + errors.join('\n') : ''));
  const fonts = o.fonts === false ? null : await page.evaluate(() => window.filmReady());
  const info = await page.evaluate(() => window.FILM_INFO);
  return { page, info, fonts, errors };
}

// one frame as a data URL (jpeg for video, png for stills)
export const grab = (page, T, type = 'image/jpeg', q = 0.95) => page.evaluate(([T, type, q]) => { window.drawFrame(T); return C.toDataURL(type, q); }, [T, type, q]);
export const dataBuf = d => Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
