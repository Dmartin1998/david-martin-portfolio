const { chromium } = require('C:/Users/David/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../qa/v3');
fs.mkdirSync(out, { recursive: true });
const report = { url: 'http://127.0.0.1:4317', checks: [], errors: [], screenshots: [] };
function check(name, pass, data) { report.checks.push({ name, pass: !!pass, data }); }
async function shot(page, name, selector) {
  const file = path.join(out, name + '.png');
  if (selector) {
    const target = page.locator(selector);
    await target.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1050);
    await target.screenshot({ path: file });
  } else await page.screenshot({ path: file });
  report.screenshots.push(file);
}
async function overflow(page) {
  return page.evaluate(() => ({ viewport: innerWidth, doc: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width && s.visibility !== 'hidden' && !e.closest('dialog:not([open])') && !e.matches('.skip-link,.sr-only,.process-wires,.skill-panel:before') && (r.left < -1 || r.right > innerWidth + 1);
  }).slice(0, 18).map(e => ({ tag: e.tagName, class: e.className, text: e.textContent.trim().slice(0, 60), left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })) }));
}
async function load(browser, width, reducedMotion = 'no-preference') {
  const page = await browser.newPage({ viewport: { width, height: width > 600 ? 1000 : 844 }, reducedMotion });
  page.on('pageerror', error => report.errors.push({ width, message: error.message }));
  page.on('console', message => { if (message.type() === 'error') report.errors.push({ width, message: message.text() }); });
  const response = await page.goto(report.url, { waitUntil: 'networkidle' });
  check(`${width} ${reducedMotion}: load`, response.status() === 200);
  await page.waitForTimeout(1200);
  return page;
}
async function skills(page, mode) {
  await page.locator('#habilidades').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1100);
  const state = await page.locator('.skill-tab').evaluateAll(tabs => tabs.map(t => ({ text: t.innerText, visible: !!t.getClientRects().length, titleSize: getComputedStyle(t.querySelector('strong')).fontSize, descriptionSize: getComputedStyle(t.querySelector('small')).fontSize, width: t.getBoundingClientRect().width, height: t.getBoundingClientRect().height })));
  check(`${mode}: four explained skills visible without selection`, state.length === 4 && state.every(t => t.visible && t.text.length > 70 && t.height > 44), state);
  const titles = [];
  for (const id of ['systems', 'automation', 'web', 'teaching']) {
    await page.locator(`[data-skill=${id}]`).click();
    const selected = await page.locator('#skill-panel').evaluate(e => ({ label: e.getAttribute('aria-labelledby'), title: e.querySelector('h3').textContent, stages: e.querySelectorAll('.skill-journey article').length }));
    titles.push(selected.title);
    check(`${mode}: skill ${id} opens`, selected.label === `skill-tab-${id}` && selected.stages === 3, selected);
  }
  check(`${mode}: four distinct skill examples`, new Set(titles).size === 4);
  await page.locator('[data-skill=systems]').focus();
  for (const [key, expected] of [['Home', 'systems'], ['ArrowDown', 'automation'], ['End', 'teaching'], ['ArrowDown', 'systems'], ['ArrowUp', 'teaching'], ['Home', 'systems']]) {
    await page.keyboard.press(key);
    const result = await page.evaluate(() => ({ focused: document.activeElement.dataset.skill, selected: document.querySelector('[data-skill][aria-selected=true]').dataset.skill }));
    check(`${mode}: keyboard ${key} to ${expected}`, result.focused === expected && result.selected === expected, result);
  }
  await page.keyboard.press('Tab');
  check(`${mode}: Tab reaches skill panel`, await page.locator('#skill-panel').evaluate(e => e === document.activeElement));
  await page.keyboard.press('Tab');
  check(`${mode}: Tab reaches skill example`, await page.locator('#skill-example').evaluate(e => e === document.activeElement));
}
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/David/AppData/Local/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe' });
  try {
    const desktop = await load(browser, 1440);
    const phaseBefore = await desktop.locator('#process-step').textContent();
    await desktop.waitForTimeout(8000);
    const phaseAfter = await desktop.locator('#process-step').textContent();
    check('desktop: process visibly progresses in eight seconds', phaseBefore !== phaseAfter, { phaseBefore, phaseAfter });
    await shot(desktop, 'desktop-hero');
    await desktop.locator('#motion-toggle').click();
    const pausedBefore = await desktop.locator('#process-step').textContent();
    await desktop.waitForTimeout(4100);
    const pausedAfter = await desktop.locator('#process-step').textContent();
    const activeAnimations = await desktop.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    check('desktop: pause freezes process and animations', pausedBefore === pausedAfter && activeAnimations === 0, { pausedBefore, pausedAfter, activeAnimations });
    await skills(desktop, 'desktop');
    await shot(desktop, 'desktop-skills', '#habilidades');
    await shot(desktop, 'desktop-projects', '#proyectos');
    const visibleBefore = await desktop.locator('[data-case]:visible').count();
    await desktop.locator('#more-projects > summary').click();
    const visibleAfter = await desktop.locator('[data-case]:visible').count();
    check('desktop: cases expand from three to six', visibleBefore === 3 && visibleAfter === 6, { visibleBefore, visibleAfter });
    for (const id of ['crm', 'campaigns', 'analytics', 'whatsapp', 'payments', 'projections']) {
      await desktop.locator(`[data-case=${id}]`).click();
      check(`case ${id}: opens and gives clear intervention`, await desktop.locator('#case-dialog').evaluate(e => e.open) && await desktop.getByRole('heading', { name: 'Qué hice yo', exact: true }).isVisible());
      await desktop.keyboard.press('Escape');
      check(`case ${id}: Escape closes and restores focus`, await desktop.locator('#case-dialog').evaluate(e => !e.open) && await desktop.locator(`[data-case=${id}]`).evaluate(e => e === document.activeElement));
    }
    await desktop.locator('[data-image]').first().click();
    await desktop.locator('#expanded-image').evaluate(i => i.decode());
    check('image enlargement loads', await desktop.locator('#image-dialog').evaluate(e => e.open) && await desktop.locator('#expanded-image').evaluate(i => i.naturalWidth > 0));
    await desktop.locator('#image-dialog .dialog-close').click();
    check('image enlargement closes', await desktop.locator('#image-dialog').evaluate(e => !e.open));
    check('all requested web projects retained', await desktop.locator('.pax-project').count() === 11);
    check('all image evidence retained', await desktop.locator('[data-image]').count() === 11);
    check('desktop stable overflow', (await overflow(desktop)).doc <= 1440, await overflow(desktop));

    const mobile = await load(browser, 390);
    await shot(mobile, 'mobile-hero');
    await shot(mobile, 'mobile-hero-complete', '#inicio');
    await skills(mobile, 'mobile');
    await shot(mobile, 'mobile-skills', '#habilidades');
    await shot(mobile, 'mobile-projects', '#proyectos');
    check('390 stable overflow', (await overflow(mobile)).doc <= 390, await overflow(mobile));
    await mobile.locator('.menu-toggle').click();
    check('mobile navigation opens', await mobile.locator('#navigation').evaluate(e => e.classList.contains('open')));
    await mobile.locator('#navigation a[href="#habilidades"]').click();
    check('mobile navigation closes after selection', await mobile.locator('#navigation').evaluate(e => !e.classList.contains('open')));

    const narrow = await load(browser, 320, 'reduce');
    const before = await narrow.locator('#process-step').textContent();
    await narrow.waitForTimeout(7100);
    const after = await narrow.locator('#process-step').textContent();
    const reducedAnimations = await narrow.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    check('reduced motion on load: no process or animations', before === after && reducedAnimations === 0, { before, after, reducedAnimations });
    await shot(narrow, 'narrow-hero');
    await skills(narrow, '320 reduced');
    check('320 stable overflow', (await overflow(narrow)).doc <= 320, await overflow(narrow));
    await shot(narrow, 'narrow-skills', '#habilidades');
    check('no console or page errors', report.errors.length === 0, report.errors);
  } finally {
    await browser.close();
    report.summary = { total: report.checks.length, passed: report.checks.filter(c => c.pass).length, failed: report.checks.filter(c => !c.pass) };
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ summary: report.summary, errors: report.errors, screenshots: report.screenshots }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
