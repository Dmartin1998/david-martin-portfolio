const { chromium } = require('C:/Users/David/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'qa', process.env.QA_OUTPUT || 'final');
fs.mkdirSync(out, { recursive: true });
const result = { url: process.env.QA_URL || 'http://127.0.0.1:4317', checks: [], consoleErrors: [], networkErrors: [], accessibility: {}, screenshots: [] };
function check(name, pass, data) { result.checks.push({ name, pass: !!pass, data }); }
async function shot(page, name, fullPage = false) {
  const target = path.join(out, `${name}.png`);
  await page.screenshot({ path: target, fullPage, animations: 'disabled' });
  result.screenshots.push(target);
}
async function overflow(page) {
  return page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll('body *')].filter(e => {
    const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
    return r.width && s.visibility !== 'hidden' && (r.right > innerWidth + 1 || r.left < -1) && !e.matches('.skip-link, .sr-only');
  }).map(e => ({ tag: e.tagName, class: e.className, text: e.textContent.trim().slice(0, 60), left: e.getBoundingClientRect().left, right: e.getBoundingClientRect().right })).slice(0, 30) }));
}
async function loaded(page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(result.url, { waitUntil: 'networkidle' });
  await page.locator('body').evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => img.loading = 'eager');
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  });
}
async function systemExplorer(page, mode) {
  const areas={marketing:'#caso-campaigns',crm:'#caso-crm',operation:'#caso-payments',data:'#caso-analytics',education:'#docencia'};
  const descriptions=[];
  for(const [area,target] of Object.entries(areas)) {
    const tab=page.locator(`[data-system="${area}"]`); await tab.click();
    const state=await page.evaluate(()=>({selected:[...document.querySelectorAll('[data-system][aria-selected="true"]')].map(t=>t.dataset.system), tabbable:[...document.querySelectorAll('[data-system][tabindex="0"]')].map(t=>t.dataset.system), label:document.querySelector('#system-panel').getAttribute('aria-labelledby'), description:document.querySelector('#system-description').textContent, destination:document.querySelector('#system-destination').getAttribute('href')}));
    descriptions.push(state.description);
    check(`${mode}: explorer ${area}`,state.selected.join()===area && state.tabbable.join()===area && state.label===`system-tab-${area}` && state.destination===target && state.description.length>30,state);
  }
  check(`${mode}: five distinct explorer descriptions`,new Set(descriptions).size===5);
  await page.locator('[data-system="marketing"]').focus();
  for(const [key,expected] of [['ArrowRight','crm'],['End','education'],['ArrowRight','marketing'],['ArrowLeft','education'],['Home','marketing']]) {
    await page.keyboard.press(key);
    const state=await page.evaluate(()=>({focused:document.activeElement.dataset.system,selected:document.querySelector('[data-system][aria-selected="true"]').dataset.system}));
    check(`${mode}: explorer key ${key} to ${expected}`,state.focused===expected&&state.selected===expected,state);
  }
  await page.keyboard.press('Tab');
  check(`${mode}: Tab reaches explorer panel`,await page.locator('#system-panel').evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Tab');
  check(`${mode}: Tab reaches explorer link`,await page.locator('#system-destination').evaluate(e=>e===document.activeElement));
  const reduced=await page.evaluate(()=>({requested:matchMedia('(prefers-reduced-motion: reduce)').matches, animated:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).animationName!=='none').map(e=>e.className), transitions:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).transitionDuration.split(',').some(t=>parseFloat(t)>0)).map(e=>e.className),scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior}));
  check(`${mode}: reduced motion`,reduced.requested&&!reduced.animated.length&&!reduced.transitions.length&&reduced.scrollBehavior==='auto',reduced);
  if(mode==='mobile') {
    const horizontal=await page.evaluate(async()=>{
      const nav=document.querySelector('.system-navigation');nav.scrollLeft=0;
      await new Promise(resolve=>requestAnimationFrame(resolve));
      document.querySelector('[data-system="education"]').click();
      const positions=[nav.scrollLeft];
      for(const delay of [20,80,300]) {await new Promise(resolve=>setTimeout(resolve,delay));positions.push(nav.scrollLeft);}
      return {positions,max:nav.scrollWidth-nav.clientWidth};
    });
    check('Reduced motion tab click scroll is immediate',horizontal.positions[0]===horizontal.positions.at(-1),horizontal);
    await page.locator('[data-system="marketing"]').focus(); await page.keyboard.press('Home');
  }
}
async function audit(page, name) {
  const data = await page.evaluate(() => {
    const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
    const color = v => (v.match(/[\d.]+/g) || []).map(Number);
    const lum = rgb => rgb.slice(0,3).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v+.055)/1.055)**2.4).reduce((s,v,i) => s + v*[.2126,.7152,.0722][i],0);
    const background = e => {
      let layers=[];
      while(e) { const c=color(getComputedStyle(e).backgroundColor); if(c.length>=3) layers.unshift(c); e=e.parentElement; }
      return layers.reduce((acc,c) => {const a=c[3] ?? 1; return c.slice(0,3).map((v,i) => v*a+acc[i]*(1-a));}, [255,255,255]);
    };
    const text = [...document.querySelectorAll('body *')].filter(e => visible(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('[aria-hidden="true"], [role="img"], .sr-only, .skip-link'));
    const rows = text.map(e => {
      const s=getComputedStyle(e), size=parseFloat(s.fontSize), bold=parseInt(s.fontWeight)>=700;
      const fg=lum(color(s.color)), bg=lum(background(e)), ratio=(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05), minimum=size>=24 || (size>=18.66 && bold) ? 3 : 4.5;
      return {tag:e.tagName,class:e.className,text:e.textContent.trim().slice(0,90),size,ratio:Math.round(ratio*100)/100,minimum};
    });
    return { lang:document.documentElement.lang, h1:document.querySelectorAll('h1').length, main:document.querySelectorAll('main').length,
      imagesMissingAlt:[...document.images].filter(i => !i.hasAttribute('alt')).map(i=>i.src), brokenImages:[...document.images].filter(i=>i.getAttribute('src') && (!i.complete || !i.naturalWidth)).map(i=>i.src),
      unnamedControls:[...document.querySelectorAll('button,a,input')].filter(visible).filter(e=>!(e.getAttribute('aria-label') || e.textContent.trim() || e.getAttribute('title'))).map(e=>e.outerHTML),
      contrastFailures: rows.filter(r=>r.ratio<r.minimum), textBelow14px:rows.filter(r=>r.size<14),
      targetsBelow24px:[...document.querySelectorAll('button,a,summary')].filter(visible).map(e=>({text:e.textContent.trim().slice(0,50),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})).filter(r=>r.width<24 || r.height<24),
      headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({level:e.tagName,text:e.textContent.trim()})) };
  });
  result.accessibility[name] = data;
  check(`${name}: landmarks, labels and loaded images`, data.lang.startsWith('es') && data.h1===1 && data.main===1 && !data.imagesMissingAlt.length && !data.brokenImages.length && !data.unnamedControls.length);
  check(`${name}: basic text contrast`, data.contrastFailures.length===0, data.contrastFailures);
}
async function productionSmoke(browser) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();result.mode='unauthenticated production smoke';result.resources=[];
  page.on('console',msg=>{if(msg.type()==='error')result.consoleErrors.push(msg.text());});
  page.on('pageerror',e=>result.consoleErrors.push(e.message));
  page.on('requestfailed',req=>result.networkErrors.push({url:req.url(),failure:req.failure()}));
  page.on('response',res=>{
    if(res.status()>=400)result.networkErrors.push({url:res.url(),status:res.status()});
    if(/\.(css|js|woff2?|ttf|otf|png|webp|svg)(\?|$)/.test(res.url()))result.resources.push({url:res.url(),status:res.status()});
  });
  const response=await page.goto(result.url,{waitUntil:'networkidle'});
  check('Public homepage HTTP 200 without auth',response.status()===200 && (await context.cookies()).length===0,{status:response.status(),url:page.url()});
  const csp=response.headers()['content-security-policy'];check('CSP delivered',!!csp&&csp.includes("script-src 'self'")&&csp.includes("font-src 'self'"),csp);
  await page.locator('body').evaluate(async()=>{
    document.querySelectorAll('img[loading="lazy"]').forEach(img=>img.loading='eager');
    await Promise.all([...document.images].filter(img=>img.getAttribute('src')).map(img=>img.decode()));await document.fonts.ready;
  });
  const fontStatus=await page.evaluate(()=>({loaded:document.fonts.check('16px "Space Grotesk"'),faces:[...document.fonts].map(f=>({family:f.family,status:f.status}))}));
  check('CSS JS fonts and images loaded', ['css','js'].every(ext=>result.resources.some(r=>new URL(r.url).pathname.endsWith('.'+ext)&&r.status===200)) && result.resources.some(r=>/\.(ttf|woff2?|otf)$/.test(new URL(r.url).pathname)&&r.status===200) && fontStatus.loaded && await page.locator('img[src]').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)),{assetCount:result.resources.length,fontStatus});
  const metadata=await page.evaluate(()=>({canonical:document.querySelector('link[rel="canonical"]')?.href,ogImage:document.querySelector('meta[property="og:image"]')?.content,title:document.title}));
  check('Canonical matches public root',metadata.canonical===new URL('/',result.url).href,metadata);
  check('Open Graph image absolute and reachable',/^https:\/\//.test(metadata.ogImage)&&(await context.request.get(metadata.ogImage)).status()===200);
  const privatePaths=['/SOURCES.md','/.vercel-auth/auth.json','/scripts/qa-browser.cjs'];
  result.privatePathStatuses=await Promise.all(privatePaths.map(async pathname=>({path:pathname,status:(await context.request.get(new URL(pathname,result.url).href)).status()})));
  check('Internal files are not exposed',result.privatePathStatuses.every(r=>r.status===404),result.privatePathStatuses);
  await shot(page,'desktop-viewport');await shot(page,'desktop-fullpage',true);
  await page.locator('[data-filter="datos"]').click();check('Project filter Datos',await page.locator('.project[data-category]:visible').count()===2);
  await page.locator('[data-system="crm"]').click();check('Explorer updates link and text',await page.locator('#system-destination').getAttribute('href')==='#caso-crm'&&await page.locator('#system-description').textContent()!=='' );
  await page.locator('#system-destination').click();check('Explorer reveals filtered case',await page.locator('#caso-crm').isVisible());
  const caseButton=page.locator('[data-case="analytics"]');await caseButton.click();
  check('Case dialog opens',await page.locator('#case-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');
  check('Case Escape restores focus',await caseButton.evaluate(e=>e===document.activeElement));
  await page.locator('[data-pax-filter="development"]').click();check('Pax development filter',await page.locator('.pax-project:visible').count()===2);
  await page.locator('[data-pax-filter="all"]').click();
  const details=page.locator('.capability-details');await details.locator('summary').focus();await page.keyboard.press('Enter');
  check('Payment and Product Lab details open from keyboard',await details.evaluate(e=>e.open)&&await details.getByRole('heading',{name:'Opciones de pago',exact:true}).isVisible()&&await details.getByRole('heading',{name:'Product Lab',exact:true}).isVisible());
  await details.screenshot({path:path.join(out,'payment-productlab.png')});result.screenshots.push(path.join(out,'payment-productlab.png'));
  await details.locator('summary').focus();await page.keyboard.press('Enter');check('Details close from keyboard',await details.evaluate(e=>!e.open));
  await page.locator('#webs').evaluate(e=>e.scrollIntoView({block:'start'}));await shot(page,'webs-viewport');
  const pax=page.locator('#web-what-to-do-argentina [data-image]');await pax.click();await page.locator('#expanded-image').evaluate(img=>img.decode());
  check('Pax image and caption open',await page.locator('#image-dialog').evaluate(e=>e.open)&&await page.locator('#image-title').textContent()==='What to Do Argentina'&&(await page.locator('#image-caption').textContent()).includes('implementación'));
  await shot(page,'pax-expanded');await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:844});await page.goto(result.url,{waitUntil:'networkidle'});
  await page.locator('body').evaluate(async()=>{document.querySelectorAll('img[loading="lazy"]').forEach(img=>img.loading='eager');await Promise.all([...document.images].filter(img=>img.getAttribute('src')).map(img=>img.decode()));});
  await shot(page,'mobile-viewport');await shot(page,'mobile-fullpage',true);
  const mobileOverflow=await overflow(page);check('Production mobile no page overflow',mobileOverflow.document===390,{document:mobileOverflow.document,width:mobileOverflow.width});
  await page.locator('.menu-toggle').click();check('Production mobile menu',await page.locator('.menu-toggle').getAttribute('aria-expanded')==='true');await page.keyboard.press('Escape');
  await page.locator('#webs').evaluate(e=>e.scrollIntoView({block:'start'}));await shot(page,'mobile-webs-viewport');
  check('No console or CSP failures',result.consoleErrors.length===0,result.consoleErrors);check('No failed page resources',result.networkErrors.length===0,result.networkErrors);
  result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({mode:result.mode,checks:result.checks.length,failed:result.checks.filter(c=>!c.pass),privatePathStatuses:result.privatePathStatuses,screenshots:result.screenshots},null,2));
  await context.close();
}
(async()=>{
  if(process.env.QA_FINAL_ASSETS==='1') {
    const previous=JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8'));
    const paths=['/','/assets/social-card.png','/assets/social-card.svg','/assets/fonts/SpaceGrotesk-Variable.woff2'];
    const responses=await Promise.all(paths.map(async p=>{const r=await fetch(new URL(p,result.url));return {path:p,status:r.status,html:p==='/'?await r.text():null};}));
    const homepage=responses[0];
    previous.previousRequirementChecks=previous.checks.filter(c=>c.name==='Open Graph image absolute and reachable');
    previous.checks=previous.checks.filter(c=>c.name!=='Open Graph image absolute and reachable');
    previous.requirementUpdate='Final deployment intentionally removes optional social image metadata/assets; absence replaces the earlier Open Graph image requirement.';
    previous.finalAssetStatuses=responses.map(({path,status})=>({path,status}));
    previous.checks.push({name:'Final homepage HTTP200 with no social image metadata',pass:homepage.status===200&&!/<meta[^>]+(?:og:image|twitter:image|twitter:card)/i.test(homepage.html)});
    previous.checks.push({name:'Removed social image assets return404',pass:responses[1].status===404&&responses[2].status===404});
    previous.checks.push({name:'Space Grotesk TTF remains HTTP200',pass:responses[3].status===200});
    previous.checks.push({name:'Final canonical retained',pass:homepage.html.includes('rel="canonical" href="'+new URL('/',result.url).href+'"')});
    previous.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(previous,null,2));
    console.log(JSON.stringify({checks:previous.checks.length,failed:previous.checks.filter(c=>!c.pass),finalAssetStatuses:previous.finalAssetStatuses,privatePathStatuses:previous.privatePathStatuses},null,2));return;
  }
  const browser=await chromium.launch({headless:true,executablePath:'C:/Users/David/AppData/Local/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe'});
  result.browser = await browser.version();
  if(process.env.QA_SMOKE==='1'){await productionSmoke(browser);await browser.close();return;}
  const context=await browser.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('console',msg=>{if(msg.type()==='error') result.consoleErrors.push(msg.text());});
  page.on('pageerror',error=>result.consoleErrors.push(error.message));
  page.on('requestfailed',request=>result.networkErrors.push({url:request.url(),failure:request.failure()}));
  page.on('response',response=>{if(response.status()>=400)result.networkErrors.push({url:response.url(),status:response.status()});});
  await loaded(page);
  await shot(page,'desktop-viewport'); await shot(page,'desktop-fullpage',true);
  const desktopOverflow=await overflow(page); check('Desktop 1440px no horizontal overflow',desktopOverflow.document<=1440,desktopOverflow);
  await audit(page,'desktop');
  await systemExplorer(page,'desktop');
  await page.locator('#docencia').screenshot({path:path.join(out,'docencia.png')}); result.screenshots.push(path.join(out,'docencia.png'));
  await page.locator('#webs .section-heading').scrollIntoViewIfNeeded();await shot(page,'webs-viewport');
  await page.locator('#pax-gallery').screenshot({path:path.join(out,'webs-gallery.png')});result.screenshots.push(path.join(out,'webs-gallery.png'));
  check('Pax has 8 current and 3 archived projects',await page.locator('.pax-card').count()===8 && await page.locator('.pax-historical').count()===3);
  for(const [filter,expected] of Object.entries({all:11,online:8,development:2,archive:3})) {
    await page.locator(`[data-pax-filter="${filter}"]`).click();
    const state={count:await page.locator('.pax-project:visible').count(), galleryVisible:await page.locator('#pax-gallery').isVisible(), historyVisible:await page.locator('.pax-history').isVisible(),pressed:await page.locator(`[data-pax-filter="${filter}"]`).getAttribute('aria-pressed')};
    check(`Pax filter ${filter}`,state.count===expected && state.pressed==='true' && state.galleryVisible===(filter!=='archive') && state.historyVisible===(filter==='all'||filter==='archive'),state);
  }
  await page.locator('[data-pax-filter="all"]').click();
  const historicalLinks=await page.locator('.pax-historical a').evaluateAll(links=>links.map(a=>a.href));
  check('Archived projects only link documented Pax reference',historicalLinks.length===3&&historicalLinks.every(h=>h==='https://paxmediamarketing.com/proyectos/'),historicalLinks);
  check('WTD three URLs remain one project',await page.locator('#web-what-to-do-argentina .pax-links a').count()===3);
  for(const [name,expected] of Object.entries({all:6,datos:2,operacion:3,automatizacion:3})) {
    await page.locator(`[data-filter="${name}"]`).click();
    const count=await page.locator('.project[data-category]:visible').count();
    check(`Filter ${name}`,count===expected,{expected,count,pressed:await page.locator(`[data-filter="${name}"]`).getAttribute('aria-pressed')});
  }
  await page.locator('[data-filter="datos"]').click();
  await page.locator('[data-system="crm"]').click();
  await page.locator('#system-destination').click();
  check('Explorer destination reveals case hidden by filters',await page.locator('#caso-crm').isVisible());
  await page.locator('[data-filter="all"]').click();
  for(const name of ['analytics','campaigns','projections','crm','whatsapp','payments']) {
    const button=page.locator(`[data-case="${name}"]`); await button.click();
    check(`Case ${name} opens`,await page.locator('#case-dialog').evaluate(e=>e.open),{title:await page.locator('#case-title').textContent()});
    check(`Case ${name} initial close focus`,await page.locator('#case-dialog .dialog-close').evaluate(e=>e===document.activeElement));
    await page.keyboard.press('Tab');
    check(`Case ${name} focus stays inside`,await page.evaluate(()=>!!document.activeElement.closest('#case-dialog')));
    if(name==='analytics') await shot(page,'case-analytics');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>!document.querySelector('#case-dialog').open);
    check(`Case ${name} Escape restores focus`,await button.evaluate(e=>e===document.activeElement));
    await button.click(); await page.locator('#case-dialog .dialog-close').click();
    check(`Case ${name} close button`,await page.locator('#case-dialog').evaluate(e=>!e.open));
  }
  const imageCount=await page.locator('[data-image]').count();check('11 images enlarge',imageCount===11);
  for(let i=0;i<imageCount;i++){
    const button=page.locator('[data-image]').nth(i);
    const expected=await button.evaluate(e=>({alt:e.querySelector('img').alt,title:e.closest('figure').querySelector('h3').textContent,caption:e.closest('figure').querySelector('.evidence-source').textContent}));
    await button.click();
    await page.locator('#expanded-image').evaluate(img=>img.decode());
    check(`Image ${i+1} opens and loads`,await page.locator('#image-dialog').evaluate(e=>e.open) && await page.locator('#expanded-image').evaluate(e=>e.naturalWidth>0));
    check(`Image ${i+1} alt, title and caption match`,await page.locator('#expanded-image').getAttribute('alt')===expected.alt&&await page.locator('#image-title').textContent()===expected.title&&await page.locator('#image-caption').textContent()===expected.caption,expected);
    if(i===0) await shot(page,'webs-expanded');
    await page.keyboard.press('Escape'); await page.waitForFunction(()=>!document.querySelector('#image-dialog').open);
    check(`Image ${i+1} restores focus`,await button.evaluate(e=>e===document.activeElement));
  }
  check('Authorized mailto',await page.locator('a[href="mailto:davidezmartin@gmail.com"]').count()===1);
  check('Authorized LinkedIn URL',await page.locator('a[href="https://www.linkedin.com/in/david-ezequiel-martin/"]').count()===1);
  const brokenAnchors=await page.locator('a[href^="#"]').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>h.length>1 && !document.getElementById(h.slice(1))));
  check('Internal links have targets',brokenAnchors.length===0,brokenAnchors);
  await page.setViewportSize({width:390,height:844}); await loaded(page);
  await shot(page,'mobile-viewport');await shot(page,'mobile-fullpage',true);
  const mobileOverflow=await overflow(page);check('Mobile 390px no horizontal overflow',mobileOverflow.document<=390,mobileOverflow);
  await audit(page,'mobile');
  await systemExplorer(page,'mobile');
  await page.locator('.system-explorer').screenshot({path:path.join(out,'mobile-system.png')});result.screenshots.push(path.join(out,'mobile-system.png'));
  await page.locator('#webs .section-heading').scrollIntoViewIfNeeded();await shot(page,'mobile-webs-viewport');
  const menu=page.locator('.menu-toggle');await menu.focus();await page.keyboard.press('Enter');
  check('Mobile menu opens by keyboard',await menu.getAttribute('aria-expanded')==='true');
  await page.keyboard.press('Tab');
  check('Mobile menu first link receives focus',await page.locator('#navigation a').first().evaluate(e=>e===document.activeElement));
  await page.keyboard.press('Escape');
  check('Mobile Escape closes menu, restores focus',await menu.getAttribute('aria-expanded')==='false' && await menu.evaluate(e=>e===document.activeElement));
  await menu.press('Enter');await page.locator('#navigation a[href="#docencia"]').click();
  check('Mobile nav click closes menu',await menu.getAttribute('aria-expanded')==='false');
  await page.locator('[data-case="analytics"]').click();
  const mobileDialog=await overflow(page);check('Mobile dialog no overflow',mobileDialog.document<=390,mobileDialog);
  await shot(page,'mobile-case'); await page.keyboard.press('Escape');
  await page.setViewportSize({width:320,height:844});await loaded(page);
  const narrowOverflow=await overflow(page);check('Mobile 320px no horizontal overflow',narrowOverflow.document<=320,narrowOverflow);
  await shot(page,'mobile-320-viewport');
  await page.setViewportSize({width:720,height:500});await loaded(page);
  const zoomOverflow=await overflow(page);check('200% desktop zoom equivalent (720 CSS px) no horizontal overflow',zoomOverflow.document<=720,zoomOverflow);
  await shot(page,'zoom-200-equivalent');
  check('No console errors',!result.consoleErrors.length,result.consoleErrors);check('No network failures',!result.networkErrors.length,result.networkErrors);
  result.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({checks:result.checks.length,failed:result.checks.filter(c=>!c.pass),contrast:{desktop:result.accessibility.desktop.contrastFailures,mobile:result.accessibility.mobile.contrastFailures},screenshots:result.screenshots},null,2));
  await browser.close();
})().catch(error=>{result.fatalError=error.stack;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.error(error);process.exit(1);});
