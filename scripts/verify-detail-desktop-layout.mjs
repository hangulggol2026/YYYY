/**
 * Playwright — desktop detail left column spacing (16 fonts, canvas px).
 */
import { chromium } from 'playwright';
import fonts from '../data/fonts.json' with { type: 'json' };

const BASE = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4322/YYYY';
const TOL = 2;

const ids = fonts.fonts.map((f) => f.id);

async function measure(page) {
  return page.evaluate((tol) => {
    const panel = document.querySelector('.detail-desktop__left');
    const canvas = document.querySelector('.detail-desktop__canvas');
    const headerRule = document.querySelector('.detail-desktop__rule--header');
    const meta = document.querySelector('.detail-desktop__meta');
    const headline = document.querySelector('.detail-desktop__headline');
    const caption = document.querySelector('.detail-desktop__caption');
    const controlsRule = document.querySelector('.detail-desktop__rule--controls');
    const firstSlider = document.querySelector('.detail-typo-controls .typo-slider-row');
    if (
      !panel ||
      !canvas ||
      !headerRule ||
      !meta ||
      !headline ||
      !caption ||
      !controlsRule ||
      !firstSlider
    ) {
      return { ok: false, reason: 'missing-nodes', viewport: document.documentElement.dataset.viewport };
    }

    const ruleBottom = headerRule.offsetTop + 2;
    const gapHeadline = meta.offsetTop - ruleBottom;
    const gapTarget = gapHeadline;

    const captionBottom = meta.offsetTop + caption.offsetTop + caption.offsetHeight;
    const gapCaptionRule = controlsRule.offsetTop - captionBottom;

    const controlsTop = Number.parseFloat(getComputedStyle(canvas).getPropertyValue('--dd-controls-top'));
    const sliderTop = controlsTop + firstSlider.offsetTop;
    const gapRuleSlider = sliderTop - (controlsRule.offsetTop + 2);

    const gapsEqual =
      Math.abs(gapHeadline - gapTarget) <= tol &&
      Math.abs(gapCaptionRule - gapTarget) <= tol &&
      Math.abs(gapRuleSlider - gapTarget) <= tol;

    return {
      ok: gapsEqual,
      viewport: document.documentElement.dataset.viewport,
      gapTarget,
      gapHeadline,
      gapCaptionRule,
      gapRuleSlider,
    };
  }, TOL);
}

const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  hasTouch: false,
  isMobile: false,
});
const page = await context.newPage();

const results = [];
for (const id of ids) {
  const url = `${BASE}/fonts/${id}/`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector('.detail-desktop__headline', { timeout: 15_000 }).catch(() => null);
  await page.waitForFunction(() => document.documentElement.dataset.viewport === 'web', {
    timeout: 5000,
  }).catch(() => null);
  await page.waitForFunction(() => document.fonts?.status === 'loaded', { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(300);
  const m = await measure(page);
  results.push({ id, ...m });
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ passed: results.length - failed.length, total: results.length, failed, all: results }, null, 2));
process.exit(failed.length ? 1 : 0);
