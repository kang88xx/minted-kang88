// Browser check for the page. Usage: node tools/check.cjs <base URL, e.g. https://minted.kang88.io/>
// PLAYWRIGHT_PATH points at a playwright module when it is not installed here; CHROME_PATH overrides the browser.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.argv[2];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--enable-unsafe-swiftshader']});
  for(const [file,lang] of [['','ko']]) for(const [w,h] of [[1440,900],[390,844],[320,568],[844,390]]){
    const page=await (await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:w<1000})).newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+file,{waitUntil:'networkidle'});
    const inside=page.locator('.plate[data-view=inside]'), side=page.locator('.side[data-view=inside]');
    const pressed=()=>inside.locator('.floors button[aria-pressed=true]').getAttribute('data-floor');
    const pins=()=>inside.locator('.pin:not([hidden])').evaluateAll(n=>n.map(p=>p.dataset.id));
    const sel=()=>side.locator('.area.sel').getAttribute('data-id');
    assert.equal(await pressed(),'1');
    assert.deepEqual(await pins(),['stage','players','seats','tech','booth','gate','buffet','hangwide','hangtall','shared']);
    // a 2F-only zone picked from the list switches the drawing to 2F
    await side.locator('.area[data-id=cast]').click();
    assert.equal(await pressed(),'2'); assert.equal(await sel(),'cast');
    assert.deepEqual(await pins(),['booth','hangwide','vip','cast','rail','shared']);
    // switching back by hand leaves a 2F-only zone and selects the stage
    await inside.locator('.floors button[data-floor="1"]').click();
    assert.equal(await pressed(),'1'); assert.equal(await sel(),'stage');
    // a zone on both floors survives the switch
    await side.locator('.area[data-id=booth]').click();
    await inside.locator('.floors button[data-floor="2"]').click();
    assert.equal(await sel(),'booth');
    await inside.locator('.pin[data-id=vip]').click(); assert.equal(await sel(),'vip');
    await side.locator('.area[data-id=gate]').click(); assert.equal(await pressed(),'1');
    // every visible pin lies inside its scene
    for(const v of ['outside','inside']){
      const out=await page.locator('.plate[data-view='+v+'] .scene').evaluate(sc=>{const r=sc.getBoundingClientRect();return [...sc.querySelectorAll('.pin:not([hidden])')].filter(p=>{const q=p.getBoundingClientRect();return q.left<r.left-1||q.right>r.right+1||q.top<r.top-1||q.bottom>r.bottom+1}).map(p=>p.dataset.id)});
      assert.deepEqual(out,[],v+' pins outside scene at '+w);
    }
    assert.deepEqual(await page.locator('.side[data-view=outside] .area').evaluateAll(n=>n.map(a=>a.dataset.id)),['exterior','banner','topbanner','signage','entrance']);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth); assert.ok(overflow<=1,'overflow '+overflow);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    assert.deepEqual(errors,[]);
    // schedule layer opens and closes; the hint text is gone; no insurance row; priced rows add up
    await page.locator('.tabs [data-open=schedule]').click();
    assert.equal(await page.locator('#schedule').evaluate(d=>d.open),true);
    assert.equal(await page.locator('#schedule .timeline tr').count(),18);
    const fits=await page.locator('#schedule').evaluate(d=>{const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1});
    assert.ok(fits,'schedule layer fits the viewport');
    await page.locator('#schedule [data-close]').click();
    assert.equal(await page.locator('#schedule').evaluate(d=>d.open),false);
    assert.equal(await page.locator('.controls small').count(),0);
    await page.locator('#budget summary').click();
    const sum=await page.locator('#budget tbody tr td:last-child').evaluateAll(n=>n.map(c=>+(c.textContent.replace(/[^0-9]/g,'')||0)).reduce((a,b)=>a+b,0));
    assert.equal(sum,42284000);
    assert.match(await page.locator('#budget tfoot tr:first-child td').textContent(),/42,284,000/);
    assert.ok(!/보험|insurance/i.test(await page.locator('body').innerText()));
    assert.equal(await page.locator('.metric').count(),4);
    assert.equal(await page.locator('.language, [hreflang]').count(),0);
    assert.match(await page.locator('header .updated').textContent(),/최근 업데이트 2026년 11월 20일/);
    const hd=await page.evaluate(()=>{const u=document.querySelector('.updated').getBoundingClientRect(),m=document.querySelector('.menupill').getBoundingClientRect();return {gap:u.left-m.right,off:Math.abs((u.left+u.right)/2-innerWidth/2)}});
    assert.ok(hd.off<2,'update text centred '+hd.off); assert.ok(await page.locator('.menupill').evaluate(e=>e.getBoundingClientRect().height<50),'menu pill on one line');
    const pdf=await page.request.get(new URL('catering-menu.pdf',page.url()).href); assert.equal(pdf.status(),200); assert.match(pdf.headers()['content-type'],/pdf/);
    await side.locator('.area[data-id=buffet]').click();
    assert.equal(await side.locator('.detail a[href="catering-menu.pdf"][target=_blank]').count(),1);
    assert.equal(await page.locator('a[href="catering-menu.pdf"]:not([target=_blank])').count(),0);
    await page.locator('.tabs [data-open=terms]').click(); assert.equal(await page.locator('#terms').evaluate(d=>d.open),true); assert.equal(await page.locator('#terms section').count(),8);
    assert.ok(await page.locator('#terms').evaluate(d=>{const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1}),'terms layer fits');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#terms').evaluate(d=>d.open),false);
    await page.locator('.tabs [data-open=signs]').click(); assert.equal(await page.locator('#signs').evaluate(d=>d.open),true); assert.equal(await page.locator('#signs tbody tr').count(),8);
    for(const f of ['venue-signage.pdf','venue-furniture.pdf']){const r=await page.request.get(new URL(f,page.url()).href); assert.equal(r.status(),200); assert.equal(await page.locator('a[href="'+f+'"][target=_blank]').count(),1);}
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#signs').evaluate(d=>d.open),false);
    await page.locator('.side[data-view=outside] .area[data-id=banner]').click(); assert.match(await page.locator('.side[data-view=outside] .detail').innerText(),/11,820 × 5,680 mm/); assert.match(await page.locator('.plate[data-view=outside] .cost-tip').innerText(),/11,820 × 5,680 mm/);
    await page.locator('#menu summary').click(); await page.locator('#menu nav a[data-open=schedule]').click(); assert.equal(await page.locator('#schedule').evaluate(d=>d.open),true); await page.locator('#schedule [data-close]').click();
    console.log('OK',file,w+'x'+h);
    await page.context().close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
