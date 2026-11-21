// Browser check for the page. Usage: node tools/check.cjs <base URL, e.g. https://minted.kang88.io/>
// PLAYWRIGHT_PATH points at a playwright module when it is not installed here; CHROME_PATH overrides the browser.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.argv[2];
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const [file,lang] of [['','ko']]) for(const [w,h] of [[1440,900],[390,844],[375,667],[320,568],[844,390]]){
    const page=await (await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:w<1000})).newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+file,{waitUntil:'networkidle'});
    const inside=page.locator('.plate[data-view=inside]'), side=page.locator('.side[data-view=inside]');
    const pressed=()=>inside.locator('.floors button[aria-pressed=true]').getAttribute('data-floor');
    const pins=()=>inside.locator('.pin:not([hidden])').evaluateAll(n=>n.map(p=>p.dataset.id));
    const sel=()=>side.locator('.area.sel').evaluateAll(n=>n.length?n[0].dataset.id:null);
    assert.equal(await pressed(),'1');
    // nothing is selected and no bubble or detail shows until a zone is picked
    assert.equal(await page.locator('.cost-tip:visible, .detail:visible, .area.sel, .pin.sel').count(),0);
    assert.deepEqual(await pins(),['stage','players','seats','booth','gate','door','buffet','hangwide','hangtall','facility']);
    // a 2F-only zone picked from the list switches the drawing to 2F
    await side.locator('.area[data-id=cast]').click();
    assert.equal(await pressed(),'2'); assert.equal(await sel(),'cast');
    assert.deepEqual(await pins(),['booth','hangwide','vip','cast','control','facility']);
    // switching back by hand deselects a zone that is not on that floor
    await inside.locator('.floors button[data-floor="1"]').click();
    assert.equal(await pressed(),'1'); assert.equal(await sel(),null);
    assert.equal(await inside.locator('.cost-tip').isVisible(),false); assert.equal(await side.locator('.detail').isVisible(),false);
    // a zone on both floors survives the switch
    await side.locator('.area[data-id=booth]').click();
    await inside.locator('.floors button[data-floor="2"]').click();
    assert.equal(await sel(),'booth');
    // 3F: its own zones, and a zone shared by all floors keeps its selection
    await inside.locator('.floors button[data-floor="3"]').click();
    assert.equal(await pressed(),'3'); assert.equal(await sel(),null);
    assert.deepEqual(await pins(),['rooms','interview','gallery','facility']);
    // a 1F-only icon pin (the door) is really gone from view on the upper floors
    assert.equal(await inside.locator('.pin[data-id=door]').isVisible(),false);
    await side.locator('.area[data-id=facility]').click(); assert.equal(await pressed(),'3');
    await inside.locator('.floors button[data-floor="2"]').click(); assert.equal(await sel(),'facility');
    await inside.locator('.pin[data-id=vip]').click(); assert.equal(await sel(),'vip');
    await side.locator('.area[data-id=gate]').click(); assert.equal(await pressed(),'1');
    // every visible pin lies inside its scene, once the floor-change motion has finished
    await page.waitForFunction(()=>document.getAnimations().length===0);
    for(const v of ['outside','inside']){
      const out=await page.locator('.plate[data-view='+v+'] .scene').evaluate(sc=>{const r=sc.getBoundingClientRect();return [...sc.querySelectorAll('.pin:not([hidden])')].filter(p=>{const q=p.getBoundingClientRect();return q.left<r.left-1||q.right>r.right+1||q.top<r.top-1||q.bottom>r.bottom+1}).map(p=>p.dataset.id)});
      assert.deepEqual(out,[],v+' pins outside scene at '+w);
    }
    // no two visible pins overlap, on any floor
    const overlaps=sc=>{const ps=[...sc.querySelectorAll('.pin')].filter(p=>p.checkVisibility()).map(p=>[p.dataset.id,p.getBoundingClientRect()]);const o=[];for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){const a=ps[i][1],b=ps[j][1];if(a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom)o.push(ps[i][0]+'/'+ps[j][0])}return o};
    assert.deepEqual(await page.locator('.plate[data-view=outside] .scene').evaluate(overlaps),[],'outside pin overlap at '+w);
    for(const f of ['1','2','3']){
      await inside.locator('.floors button[data-floor="'+f+'"]').click();await page.waitForFunction(()=>document.getAnimations().length===0);
      assert.deepEqual(await inside.locator('.scene').evaluate(overlaps),[],'pin overlap on '+f+'F at '+w);
    }
    await inside.locator('.floors button[data-floor="1"]').click();
    assert.deepEqual(await page.locator('.side[data-view=outside] .area').evaluateAll(n=>n.map(a=>a.dataset.id)),['banner','topbanner','signage','entrance']);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth); assert.ok(overflow<=1,'overflow '+overflow);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);
    // the main LED screen moves on to its next picture
    await page.waitForFunction(()=>SCREEN_MODE>0,null,{timeout:8000});
    assert.deepEqual(errors,[]);
    // amounts show only in the budget section: none in the zone lists, the bubble or the detail
    await side.locator('.area[data-id=buffet]').click();
    assert.ok(!/[0-9]원/.test(await page.locator('#areas, .cost-tip').evaluateAll(n=>n.map(e=>e.innerText).join(' '))),'no amounts in zone lists, bubbles or details');
    await inside.locator('.floors button[data-floor="1"]').click();
    // schedule layer opens and closes; the hint text is gone; no insurance row; priced rows add up
    await page.locator('.tabs [data-open=schedule]').click();
    assert.equal(await page.locator('#schedule').evaluate(d=>d.open),true);
    assert.equal(await page.locator('#schedule .timeline tr').count(),33);
    const fits=await page.locator('#schedule').evaluate(d=>{const r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1});
    assert.ok(fits,'schedule layer fits the viewport');
    await page.locator('#schedule [data-close]').click();
    assert.equal(await page.locator('#schedule').evaluate(d=>d.open),false);
    assert.equal(await page.locator('.controls small').count(),0);
    await page.locator('#budget summary').click();
    const sum=await page.locator('#budget tbody tr td:last-child').evaluateAll(n=>n.map(c=>+(c.textContent.replace(/[^0-9]/g,'')||0)).reduce((a,b)=>a+b,0));
    assert.equal(sum,46888000);
    assert.match(await page.locator('#budget tfoot tr:first-child td').textContent(),/46,888,000/);
    assert.ok(!/보험|insurance/i.test(await page.locator('body').innerText()));
    assert.equal(await page.locator('.metric').count(),4);
    assert.equal(await page.locator('.language, [hreflang]').count(),0);
    assert.match(await page.locator('header .updated').textContent(),/최근 업데이트 2026년 11월 21일 [0-9]{2}:[0-9]{2} \(한국시간\)/);
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
