// Export the venue's 3D views (exterior + interior floors 1-3) as layered, editable SVG.
// Usage: node tools/export-svg.cjs model.js <out dir>   (writes 1-exterior.svg, 2-interior-1F.svg, 3-interior-2F.svg, 4-interior-3F.svg)
const fs = require('fs'), vm = require('vm'), path = require('path');
const [modelPath, outDir] = process.argv.slice(2);
const ctx = {console, Math, JSON, Array, Object, String, Number, Infinity, korean:true, t:(en,ko)=>ko};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(modelPath, 'utf8') + '\n;this.KH=KH;this.buildExterior=buildExterior;this.buildInterior=buildInterior;this.interiorExtent=interiorExtent;', ctx);

const GROUP_NAMES = {exterior:'건물·대관', banner:'우측 중앙 현수막', topbanner:'좌측 상단 현수막', signage:'외벽 LED', glass:'출입문 위 유리창', entrance:'출입구',
  stage:'무대·LED', players:'선수 데스크', seats:'관람석', tech:'중계·기술', booth:'부스', gate:'등록·입장', buffet:'바·케이터링',
  hangwide:'실내 가로 현수막', hangtall:'실내 세로 현수막', vip:'VIP 라운지', cast:'해설석', rail:'발코니·스탠딩', rooms:'선수 대기실 A·B룸',
  gallery:'3층 갤러리', facility:'화장실·승강기·계단', shared:'공용 구조'};

function capture(build) {
  const shapes = [];
  const add = s => shapes.push(s);
  const m = {
    box(x, y, z, w, d, h, fill = '#dddddd', stroke = '#767676', group) {
      const X = x + w, Y = y + d, Z = z + h;
      const p = [[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]];
      const faces = [[0,1,2,3],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
      faces.forEach((f, i) => add({kind:'face', points:f.map(k => p[k]), fill, shade:[.75,.96,.85,.91,.88,1][i], group}));
      if (stroke && stroke !== 'none') for (let i = 0; i < 4; i++) {
        add({kind:'line', points:[p[i], p[(i+1)%4]], fill:stroke, width:.7, group});
        add({kind:'line', points:[p[i+4], p[(i+1)%4+4]], fill:stroke, width:.7, group});
        add({kind:'line', points:[p[i], p[i+4]], fill:stroke, width:.7, group});
      }
    },
    line(a, b, color = '#686868', width = 1, group) { add({kind:'line', points:[a, b], fill:color, width, group}); },
    quad(points, fill, shade = 1, group) { add({kind:'face', points, fill, shade, group}); },
    sign(x, y, z, w, h, textLines, group, tone) {
      const lines = Array.isArray(textLines) ? textLines : String(textLines).split('\n');
      add({kind:'sign', points:[[x,y,z+h],[x+w,y,z+h],[x+w,y,z],[x,y,z]], lines, tone, w, h, group});
    },
    top() {}
  };
  build(m);
  return shapes;
}

function axes(angle, elevation) {
  const a = angle*Math.PI/180, e = elevation*Math.PI/180;
  const co = Math.cos(a), si = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
  return ([x,y,z]) => [co*x+si*y, -se*si*x+se*co*y+ce*z, ce*si*x-ce*co*y+se*z];
}
const hex = c => { c = c.replace('#',''); if (c.length === 3) c = [...c].map(x => x+x).join(''); return [0,2,4].map(i => parseInt(c.slice(i,i+2),16)); };
const shadeColor = (c, s) => '#' + hex(c).map(v => Math.round(v*s).toString(16).padStart(2,'0')).join('');
const lerp = (a, b, t) => a.map((v, i) => v + (b[i]-v)*t);

function render(name, title, build, angle, elevation, extentPts) {
  const shapes = capture(build), ax = axes(angle, elevation);
  // Frame: same fit rule as the site renderer (extent, or site corners + every shape).
  let l=Infinity, r=-Infinity, b=Infinity, t=-Infinity;
  const inc = p => { const [x,y] = ax(p); l=Math.min(l,x); r=Math.max(r,x); b=Math.min(b,y); t=Math.max(t,y); };
  if (extentPts) extentPts.forEach(inc);
  else { for (const x of [-12.19,12.19]) for (const y of [-8.535,8.535]) for (const z of [0,.1]) inc([x,y,z]); shapes.forEach(s => s.points.forEach(inc)); }
  const W = 1600, pad = 40, scale = (W - 2*pad)/(r-l), H = Math.round((t-b)*scale + 2*pad);
  const proj = p => { const [u,v,d] = ax(p); return {x: pad + (u-l)*scale, y: pad + (t-v)*scale, d}; };

  // Split large faces into tiles so the depth sort holds; the z-buffer then drops hidden tiles.
  const L = 0.25, LL = 0.08, items = [];
  shapes.forEach((s, si) => {
    if (s.kind === 'line') {
      const [A, B] = s.points, n = Math.max(1, Math.ceil(dist(A, B)/LL)), segs = [];
      for (let k = 0; k < n; k++) segs.push({kind:'line', src:si, k, width:s.width, p:[proj(lerp(A,B,k/n)), proj(lerp(A,B,(k+1)/n))], bias:.012, tile:true});
      Object.assign(s, {segs, n, at:k => proj(lerp(A,B,k/n))}); items.push(...segs); return;
    }
    const [A,B,C,D] = s.points;
    const nu = Math.max(1, Math.ceil(Math.max(dist(A,B), dist(D,C))/L)), nv = Math.max(1, Math.ceil(Math.max(dist(A,D), dist(B,C))/L));
    const tiles = [], P = (u, v) => lerp(lerp(A,B,u), lerp(D,C,u), v);
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const q = [P(i/nu,j/nv), P((i+1)/nu,j/nv), P((i+1)/nu,(j+1)/nv), P(i/nu,(j+1)/nv)];
      tiles.push({kind:s.kind, src:si, i, j, p:q.map(proj), bias:s.kind==='sign'?.008:0, tile:true});
    }
    Object.assign(s, {tiles, nu, nv, corner:(i, j) => proj(P(i/nu, j/nv))}); items.push(...tiles);
  });
  function dist(a,b){ return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]); }

  // Z-buffer pass at 2x: count visible and covered pixels per item.
  const R = 2, ZW = Math.ceil(W*R), ZH = Math.ceil(H*R), zb = new Float32Array(ZW*ZH).fill(-Infinity), idb = new Int32Array(ZW*ZH).fill(-1);
  const cover = new Int32Array(items.length);
  const tri = (a, b, c, id, bias) => {
    const x0 = Math.max(0, Math.floor(Math.min(a.x,b.x,c.x)*R)), x1 = Math.min(ZW-1, Math.ceil(Math.max(a.x,b.x,c.x)*R));
    const y0 = Math.max(0, Math.floor(Math.min(a.y,b.y,c.y)*R)), y1 = Math.min(ZH-1, Math.ceil(Math.max(a.y,b.y,c.y)*R));
    const den = (b.y-c.y)*(a.x-c.x) + (c.x-b.x)*(a.y-c.y); if (Math.abs(den) < 1e-9) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = (x+.5)/R, py = (y+.5)/R;
      const w1 = ((b.y-c.y)*(px-c.x) + (c.x-b.x)*(py-c.y))/den, w2 = ((c.y-a.y)*(px-c.x) + (a.x-c.x)*(py-c.y))/den, w3 = 1-w1-w2;
      if (w1 < -1e-6 || w2 < -1e-6 || w3 < -1e-6) continue;
      const d = w1*a.d + w2*b.d + w3*c.d + bias, k = y*ZW + x; cover[id]++;
      if (d >= zb[k]) { zb[k] = d; idb[k] = id; }
    }
  };
  items.forEach((it, id) => {
    it.idx = id; let p = it.p;
    if (it.kind === 'line') {
      const [a, c] = p, dx = c.x-a.x, dy = c.y-a.y, len = Math.hypot(dx,dy); if (len < .001) return;
      const w = Math.max(it.width, .5)/2, ox = -dy/len*w, oy = dx/len*w;
      p = [{...a,x:a.x+ox,y:a.y+oy},{...c,x:c.x+ox,y:c.y+oy},{...c,x:c.x-ox,y:c.y-oy},{...a,x:a.x-ox,y:a.y-oy}];
    }
    tri(p[0], p[1], p[2], id, it.bias); tri(p[0], p[2], p[3], id, it.bias);
  });
  const vis = new Int32Array(items.length); for (const id of idb) if (id >= 0) vis[id]++;

  // One element per visible face: the whole face when nothing covers it, else the outline of its visible tiles.
  const out = [], avgD = q => q.reduce((n, v) => n + v.d, 0)/q.length;
  const lines = [];
  shapes.forEach(s => {
    if (s.segs) {   // visible runs of each line
      let run = null;
      s.segs.forEach((sg, k) => {
        if (vis[sg.idx]) { if (!run) { run = {...s, kind:'line', from:k}; } run.to = k + 1; }
        if ((!vis[sg.idx] || k === s.n - 1) && run) { run.p = [s.at(run.from), s.at(run.to)]; run.depth = avgD(run.p); lines.push(run); run = null; }
      });
      return;
    }
    if (!s.tiles) return;
    const seen = s.tiles.filter(tl => vis[tl.idx]);
    if (!seen.length) return;
    const bias = s.kind === 'sign' ? .008 : 0, whole = s.tiles.every(tl => vis[tl.idx] >= cover[tl.idx]*0.98);
    // A clipped face only overlaps what covers it, so it goes under everything near it.
    const depth = (whole ? avgD(s.tiles.flatMap(tl => tl.p)) : Math.min(...s.tiles.map(tl => avgD(tl.p)))) + bias;
    const loops = whole ? [s.points.map(proj)] : outline(s, new Set(seen.map(tl => tl.i + ',' + tl.j)));
    out.push({...s, kind:s.kind === 'sign' ? 'signbg' : 'face', loops, depth});
    if (s.kind === 'sign') out.push({...s, kind:'text', p:s.points.map(proj), depth:depth + .0001});
  });
  out.sort((a, b) => a.depth - b.depth);
  lines.sort((a, b) => a.depth - b.depth); out.push(...lines);   // only visible runs are kept, so lines sit on top
  // Trace the boundary of a set of grid cells into closed loops of projected points.
  function outline(s, cells) {
    const has = (i, j) => cells.has(i + ',' + j), edges = new Map();
    const add = (a, b) => { const k = a.join(','); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
    for (const key of cells) {
      const [i, j] = key.split(',').map(Number);
      if (!has(i, j-1)) add([i, j], [i+1, j]);
      if (!has(i+1, j)) add([i+1, j], [i+1, j+1]);
      if (!has(i, j+1)) add([i+1, j+1], [i, j+1]);
      if (!has(i-1, j)) add([i, j+1], [i, j]);
    }
    const loops = [];
    for (const [k0, list] of edges) while (list.length) {
      const loop = [k0.split(',').map(Number)]; let cur = list.pop();
      while (cur.join(',') !== k0) { loop.push(cur); const nx = edges.get(cur.join(',')); cur = nx.pop(); }
      const simple = loop.filter((q, n) => { const a = loop[(n + loop.length - 1) % loop.length], b = loop[(n + 1) % loop.length]; return (q[0]-a[0])*(b[1]-q[1]) !== (q[1]-a[1])*(b[0]-q[0]); });
      loops.push(simple.map(([i, j]) => s.corner(i, j)));
    }
    return loops;
  }

  // Write SVG; consecutive items of one zone share a named group.
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  const f = n => n.toFixed(2);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n<title>${esc(title)}</title>\n<rect id="배경" width="${W}" height="${H}" fill="#ffffff"/>\n`;
  // Pull each element back into the latest group of its zone when nothing drawn in between overlaps it.
  const groups = [];
  const boxOf = it => { const pts = it.loops ? it.loops.flat() : it.p; const xs = pts.map(q => q.x), ys = pts.map(q => q.y), w = (it.width || 0) + 1;
    return [Math.min(...xs) - w, Math.min(...ys) - w, Math.max(...xs) + w, Math.max(...ys) + w]; };
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (const it of out) {
    const g = it.group || 'shared', bb = boxOf(it);
    let target = null;
    for (let k = groups.length - 1; k >= 0; k--) {
      if (groups[k].g === g) { target = groups[k]; break; }
      if (hit(groups[k].bb, bb) && groups[k].items.some(o => hit(o.bb, bb))) break;
    }
    if (!target) { target = {g, items:[], bb:[...bb]}; groups.push(target); }
    target.items.push({it, bb}); const B = target.bb; B[0] = Math.min(B[0], bb[0]); B[1] = Math.min(B[1], bb[1]); B[2] = Math.max(B[2], bb[2]); B[3] = Math.max(B[3], bb[3]);
  }
  const counts = {};
  for (const G of groups) {
    const label = GROUP_NAMES[G.g] || G.g; counts[label] = (counts[label] || 0) + 1;
    svg += `<g id="${esc(label)}${counts[label] > 1 ? ' ' + counts[label] : ''}">\n`;
    for (const {it} of G.items) {
    const d = () => it.loops.map(l => 'M' + l.map(q => f(q.x)+' '+f(q.y)).join('L') + 'Z').join('');
    if (it.kind === 'line') svg += `<line x1="${f(it.p[0].x)}" y1="${f(it.p[0].y)}" x2="${f(it.p[1].x)}" y2="${f(it.p[1].y)}" stroke="${it.fill}" stroke-width="${f(it.width*1.4)}" stroke-linecap="round"/>\n`;
    else if (it.kind === 'signbg' || it.kind === 'text') {
      const lines = it.lines, led = it.tone === 'led' || lines[0] === 'PAPER', banner = it.tone === 'banner' || lines[0] === 'AGENTIC', dark = it.tone === 'dark' || lines.join('') === 'KUNSTHALLE';
      const bg = dark ? '#383838' : led ? '#515151' : banner ? '#e8e8e8' : '#fafafa';
      if (it.kind === 'signbg') svg += `<path d="${d()}" fill="${bg}" fill-rule="evenodd"/>\n`;
      else {
        // Map a w x h text box (units = metres x 100) onto the sign's projected parallelogram.
        const [P0, P1, , P3] = it.p, Wt = it.w*100, Ht = it.h*100;
        const m = [(P1.x-P0.x)/Wt, (P1.y-P0.y)/Wt, (P3.x-P0.x)/Ht, (P3.y-P0.y)/Ht, P0.x, P0.y].map(v => v.toFixed(5)).join(' ');
        const widest = Math.max(1, ...lines.map(s => s.length*0.62)), size = Math.min(Wt*.88/widest, Ht*.8/Math.max(1, lines.length));
        svg += `<g transform="matrix(${m})">`;
        lines.forEach((s, i) => {
          const fill = dark ? '#fafafa' : led ? '#d6d6d6' : banner && i === 1 ? '#656565' : '#3a3a3a';
          svg += `<text x="${f(Wt/2)}" y="${f(Ht/2 + (i-(lines.length-1)/2)*size*1.05 + size*.35)}" font-family="Noto Sans KR" font-weight="700" font-size="${f(size)}" text-anchor="middle" fill="${fill}">${esc(s)}</text>`;
        });
        svg += `</g>\n`;
      }
    } else svg += `<path d="${d()}" fill="${shadeColor(it.fill, it.shade)}" fill-rule="evenodd"/>\n`;
    }
    svg += '</g>\n';
  }
  svg += '</svg>\n';
  fs.writeFileSync(path.join(outDir, name + '.svg'), svg);
  console.log(name, 'shapes', shapes.length, 'items', items.length, 'emitted', out.length, 'groups', groups.length, 'size', (svg.length/1024).toFixed(0)+'KB', W+'x'+H);
}

render('1-exterior', '외관 입체도', m => ctx.buildExterior(m), -32, 15, null);
for (const fl of [1, 2, 3]) render(`${fl+1}-interior-${fl}F`, `내부 절개 투시도 ${fl}층`, m => ctx.buildInterior(m, fl), -32, 35, ctx.interiorExtent());
