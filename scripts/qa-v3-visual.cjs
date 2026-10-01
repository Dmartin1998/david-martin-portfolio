const { chromium } = require('C:/Users/David/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../qa/v3');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/David/AppData/Local/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe' });
  const details = [];
  try {
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1040 }, reducedMotion: 'reduce' });
      await page.goto('http://127.0.0.1:4317', { waitUntil: 'networkidle' });
      for (const [id, selector] of [['hero', '#inicio'], ['skills', '#habilidades'], ['skill-example', '#skill-panel'], ['projects', '#proyectos'], ['related', '.related-projects']]) {
        await page.locator(selector).evaluate(e => { document.activeElement.blur(); e.scrollIntoView({ block: 'start', behavior: 'instant' }); });
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(out, `${width}-${id}-viewport.png`) });
        details.push(await page.evaluate(() => {
          const e = document.querySelector('.skip-link'), r = e.getBoundingClientRect();
          return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, active: document.activeElement.tagName, focus: e.matches(':focus'), top: r.top, bottom: r.bottom, descriptions: [...document.querySelectorAll('.skill-tab small')].map(e => getComputedStyle(e).fontSize), teaching: document.querySelector('[data-skill=teaching] strong').textContent, related: document.querySelector('.related-projects h3').innerText };
        }));
      }
      await page.locator('[data-skill=teaching]').click();
      details.push({ width, teachingPanel: await page.locator('#skill-panel-tag').textContent() });
      await page.close();
    }
    fs.writeFileSync(path.join(out, 'visual-final.json'), JSON.stringify(details, null, 2));
    console.log(JSON.stringify(details, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
