// Browser check for the outside copy (built by tools/build-share.py): it must show and ship no amount of money.
// Usage: node tools/check-share.cjs <base URL, e.g. https://example.vercel.app/>
// PLAYWRIGHT_PATH points at a playwright module when it is not installed here; CHROME_PATH overrides the browser.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
const base=process.argv[2], online=/^https?:/.test(base);
const MONEY=/[0-9][0-9,]*\s*(?:만\s*)?원|KRW\s*[0-9]/;
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  for(const [w,h] of [[1440,900],[390,844],[320,568]]){
    const page=await (await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,hasTouch:w<1000})).newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base,{waitUntil:'networkidle'});
    // no amount in anything a visitor can open: the page, every pop-up, the budget list and every zone detail
    await page.locator('#budget summary').click();
    for(const id of await page.locator('dialog.layer').evaluateAll(n=>n.map(d=>d.id))){
      await page.evaluate(i=>document.getElementById(i).showModal(),id);
      assert.ok(!MONEY.test(await page.locator('#'+id).innerText()),'amount in pop-up '+id);
      await page.evaluate(i=>document.getElementById(i).close(),id);
    }
    for(const id of await page.locator('.area').evaluateAll(n=>n.map(a=>a.dataset.id))){
      await page.locator('.area[data-id='+id+']').first().click();
      const shown=await page.locator('#areas, .cost-tip').evaluateAll(n=>n.map(e=>e.innerText).join(' '));
      assert.ok(!MONEY.test(shown),'amount in zone '+id);
    }
    assert.ok(!MONEY.test(await page.locator('body').innerText()),'amount on the page');
    assert.equal(await page.locator('#budget thead th').count(),2);
    assert.equal(await page.locator('#budget tfoot').count(),0);
    assert.equal(await page.locator('.metric').count(),3);
    assert.equal(await page.locator('a[href*="catering-menu"]').count(),0);
    assert.ok(await page.locator('.pin').count()>10,'pins drawn');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth); assert.ok(overflow<=1,'overflow '+overflow);
    assert.deepEqual(errors,[]);
    if(online){
      // the files themselves carry no amount, and the price menu is not there
      for(const f of ['','plan.js','model.js','style.css']){const r=await page.request.get(new URL(f,page.url()).href); assert.equal(r.status(),200); assert.ok(!MONEY.test(await r.text()),'amount in source '+(f||'index.html'));}
      assert.equal((await page.request.get(new URL('catering-menu.pdf',page.url()).href)).status(),404);
      for(const f of ['venue-signage.pdf','venue-furniture.pdf'])assert.equal((await page.request.get(new URL(f,page.url()).href)).status(),200);
    }
    console.log('OK',w+'x'+h);
    await page.context().close();
  }
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
