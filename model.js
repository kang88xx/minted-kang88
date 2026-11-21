function makeVenueRenderer(canvas) {
  // World axes are x east, y north and z up. Angles use degrees, zoom 1 fits the site.
  const gl = canvas.getContext('webgl', {antialias:true, alpha:true, preserveDrawingBuffer:true});
  const ctx = gl ? null : canvas.getContext('2d');
  const colorCtx = document.createElement('canvas').getContext('2d');
  const colors = new Map(), signs = new Map();
  let shapes = [], angle = 32, elevation = 22, zoom = 1, frame, hits = [], extent = null, topLayer = false, lift = 0;
  let program, buffer, pos, uv, tint, useTexture;
  if (gl) {
    function shader(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s));
      return s;
    }
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec3 p;attribute vec2 t;varying vec2 v;void main(){gl_Position=vec4(p,1.);v=t;}'));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float;varying vec2 v;uniform vec4 c;uniform bool textured;uniform sampler2D img;void main(){if(textured){gl_FragColor=texture2D(img,v)*c;}else{gl_FragColor=c;}}'));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    pos = gl.getAttribLocation(program,'p'); uv = gl.getAttribLocation(program,'t');
    tint = gl.getUniformLocation(program,'c'); useTexture = gl.getUniformLocation(program,'textured');
    buffer = gl.createBuffer();
  }
  function rgba(value, shade=1) {
    const key=value+'|'+shade;
    if (!colors.has(key)) {
      colorCtx.fillStyle='#8a8a8a'; colorCtx.fillStyle=value;
      colorCtx.clearRect(0,0,1,1); colorCtx.fillRect(0,0,1,1);
      const p=colorCtx.getImageData(0,0,1,1).data;
      colors.set(key,[p[0]*shade/255,p[1]*shade/255,p[2]*shade/255,p[3]/255]);
    }
    return colors.get(key);
  }
  function rect(points,fill,shade,group,image) { shapes.push({points,color:rgba(fill,shade),group,image,top:topLayer}); }
  function line(a,b,color='#686868',width=1,group) { shapes.push({points:[a,b],color:rgba(color),width,group,top:topLayer}); }
  function box(x,y,z,w,d,h,fill='#dddddd',stroke='#767676',group) {
    const X=x+w,Y=y+d,Z=z+h;
    const p=[[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]];
    const faces=[[0,1,2,3],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
    faces.forEach((indices,i)=>rect(indices.map(k=>p[k]),fill,[.75,.96,.85,.91,.88,1][i],group));
    if(stroke && stroke!=='none') for(let i=0;i<4;i++) {
      line(p[i],p[(i+1)%4],stroke,.7,group); line(p[i+4],p[(i+1)%4+4],stroke,.7,group);
      line(p[i],p[i+4],stroke,.7,group);
    }
  }
  function sign(x,y,z,w,h,textLines,group,tone) {
    const lines=Array.isArray(textLines)?textLines:String(textLines).split('\n');
    const key=JSON.stringify([w,h,lines,tone]);
    if(!signs.has(key)){
      const img=document.createElement('canvas'); img.width=Math.max(2,Math.min(1536,Math.round(128*w))); img.height=Math.max(2,Math.round(img.width*h/w));
      const c=img.getContext('2d'); const led=tone==='led', banner=tone==='banner', dark=tone==='dark'||lines.join('')==='KUNSTHALLE'; if(led){const g=c.createLinearGradient(0,0,img.width,img.height);g.addColorStop(0,'#e14bd2');g.addColorStop(1,'#7b3fe0');c.fillStyle=g;}   // lit LED content in colour
      else c.fillStyle=dark?'#383838':banner?'#e8e8e8':'#fafafa';
      c.fillRect(0,0,img.width,img.height);
      if(tone==='partners'){drawPartnerBanner(c,img.width,img.height,lines);signs.set(key,{img});return rect([[x,y,z+h],[x+w,y,z+h],[x+w,y,z],[x,y,z]],'#ffffff',1,group,signs.get(key));}
      const face=' system-ui, sans-serif'; c.font='700 100px'+face;
      const widest=Math.max(1,...lines.map(t=>c.measureText(t).width));
      const size=Math.min(100*img.width*.88/widest,img.height*.8/Math.max(1,lines.length));
      c.font='700 '+size+'px'+face; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#232323';
      lines.forEach((s,i)=>{c.fillStyle=dark?'#fafafa':led?'#ffffff':banner&&i===1?'#656565':'#3a3a3a';c.fillText(s,img.width/2,img.height/2+(i-(lines.length-1)/2)*size*1.05)});
      if(led){c.fillStyle='#1a1a3a33';for(let x=0;x<img.width;x+=7)c.fillRect(x,0,1,img.height);for(let y=0;y<img.height;y+=7)c.fillRect(0,y,img.width,1)}
      signs.set(key,{img});
    }
    rect([[x,y,z+h],[x+w,y,z+h],[x+w,y,z],[x,y,z]],'#ffffff',1,group,signs.get(key));
  }
  // Right-centre banner: event name on top, then partner tiers 1 (1-2), 2 (6-10) and 3 (a long row) as logo boxes.
  function drawPartnerBanner(c,W,H,title){
    c.fillStyle='#ececea';c.fillRect(0,0,W,H);
    const face=' system-ui, sans-serif',fit=(t,maxW,maxH,weight)=>{c.font=weight+' 100px'+face;return Math.min(100*maxW/Math.max(1,c.measureText(t).width),maxH)};
    c.textAlign='center';c.textBaseline='middle';
    const lines=[title[0],title.slice(1).join(' ')],size=Math.min(...lines.map(t=>fit(t,W*.84,H*.16,800)));
    c.font='800 '+size+'px'+face;lines.forEach((t,i)=>{c.fillStyle=i?'#2a2a2a':'#2a2a2a';c.fillText(t,W/2,H*(.17+i*.19))});
    c.fillStyle='#9a9a9a';c.fillRect(W*.05,H*.455,W*.9,Math.max(1,H*.004));
    const row=(n,y,h,bw,gap,fill)=>{const total=n*bw+(n-1)*gap;for(let i=0;i<n;i++){const x=(W-total)/2+i*(bw+gap);c.fillStyle=fill;c.fillRect(x,y,bw,h);c.strokeStyle='#8c8c8c';c.lineWidth=Math.max(1,W/700);c.strokeRect(x,y,bw,h);}};
    row(2,H*.50,H*.19,W*.24,W*.04,'#d2d2d0');     // tier 1
    row(8,H*.73,H*.10,W*.085,W*.018,'#dadad8');   // tier 2
    row(16,H*.875,H*.055,W*.043,W*.011,'#e2e2e0'); // tier 3
  }
  function axes(){
    const a=angle*Math.PI/180,e=elevation*Math.PI/180;
    const co=Math.cos(a),si=Math.sin(a),ce=Math.cos(e),se=Math.sin(e);
    return ([x,y,z])=>[co*x+si*y,-se*si*x+se*co*y+ce*z,ce*si*x-ce*co*y+se*z];
  }
  function measure(){
    const w=canvas.clientWidth||canvas.width||1,h=canvas.clientHeight||canvas.height||1,ax=axes();
    let l=Infinity,r=-Infinity,b=Infinity,t=-Infinity;
    const include=(p)=>{const [x,y]=ax(p);l=Math.min(l,x);r=Math.max(r,x);b=Math.min(b,y);t=Math.max(t,y);};
    if(extent)extent.forEach(include);
    else{
      for(const x of [-12.19,12.19])for(const y of [-8.535,8.535])for(const z of [0,0.1])include([x,y,z]);
      shapes.forEach(s=>s.points.forEach(include));
    }
    frame={w,h,ax,scale:zoom*.92*Math.min(w/(r-l),h/(t-b)),cx:(l+r)/2,cy:(t+b)/2};
  }
  function project(p){
    if(!frame)measure();
    const [u,v,d]=frame.ax(p);
    return {x:frame.w/2+(u-frame.cx)*frame.scale,y:frame.h/2-(v-frame.cy)*frame.scale,d};
  }
  function draw(){
    measure(); hits=[];
    const {w,h}=frame,pr=Math.min(2,window.devicePixelRatio||1);
    const W=Math.max(1,Math.round(w*pr)),H=Math.max(1,Math.round(h*pr));
    if(canvas.width!==W)canvas.width=W;
    if(canvas.height!==H)canvas.height=H;
    const raised=q=>project([q[0],q[1],q[2]+lift]);
    const projected=shapes.map(s=>({...s,p:s.points.map(lift&&s.top?raised:project)}));
    if(gl){
      gl.useProgram(program);gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clearDepth(1);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(pos);gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(pos,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);
      let batch=[];
      function flush(tex){
        if(!batch.length)return;
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(batch),gl.STREAM_DRAW);
        gl.uniform1i(useTexture,tex?1:0);
        gl.drawArrays(gl.TRIANGLES,0,batch.length/5);batch=[];
      }
      let prev=null;
      for(const s of projected){
        const p=s.p,edge=p.length===2,bias=edge?.012:s.image?.008:0;
        if(prev!==s.color || s.image){flush(false);gl.uniform4fv(tint,s.color);prev=s.color;}
        function vertex(q,u=0,v=0){batch.push(q.x*2/w-1,1-q.y*2/h,-(q.d+bias)/512,u,v);}
        if(edge){
          const [a,b]=p,dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<.001)continue;
          const ox=-dy/len*s.width/2,oy=dx/len*s.width/2;
          const pts=[a,b,b,a].map((q,i)=>({...q,x:q.x+(i<2?ox:-ox),y:q.y+(i<2?oy:-oy)}));
          for(const i of [0,1,2,0,2,3])vertex(pts[i]);
        }else{
          if(s.image){
            if(!s.image.tex){
              s.image.tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,s.image.tex);
              for(const k of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,k,gl.CLAMP_TO_EDGE);
              for(const k of [gl.TEXTURE_MAG_FILTER,gl.TEXTURE_MIN_FILTER])gl.texParameteri(gl.TEXTURE_2D,k,gl.LINEAR);
              gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,s.image.img);
            }else gl.bindTexture(gl.TEXTURE_2D,s.image.tex);
          }
          for(const i of [0,1,2,0,2,3])vertex(p[i],i===1||i===2?1:0,i>1?1:0);
          if(s.image)flush(true);
        }
      }
      flush(false);
    }else{
      ctx.setTransform(pr,0,0,pr,0,0);ctx.clearRect(0,0,w,h);
      const avg=s=>s.p.reduce((n,q)=>n+q.d,0)/s.p.length;
      projected.sort((a,b)=>avg(a)-avg(b));
      for(const s of projected){
        const p=s.p,c=s.color;ctx.beginPath();p.forEach((q,i)=>i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y));
        const css='rgba('+c.slice(0,3).map(n=>Math.round(n*255)).concat(c[3]).join(',')+')';
        if(p.length===2){ctx.strokeStyle=css;ctx.lineWidth=s.width;ctx.stroke();}
        else if(s.image){
          const img=s.image.img;ctx.save();ctx.transform((p[1].x-p[0].x)/img.width,(p[1].y-p[0].y)/img.width,(p[3].x-p[0].x)/img.height,(p[3].y-p[0].y)/img.height,p[0].x,p[0].y);ctx.drawImage(img,0,0);ctx.restore();
        }else{ctx.closePath();ctx.fillStyle=css;ctx.fill();}
      }
    }
    hits=projected;
  }
  function hit(clientX,clientY){
    const r=canvas.getBoundingClientRect(),x=(clientX-r.left)*frame.w/r.width,y=(clientY-r.top)*frame.h/r.height;
    let best=-Infinity,group=null;
    for(const s of hits){
      const [a,b,c,d]=s.p;
      let depth;
      if(!d){
        const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));
        if(Math.hypot(x-a.x-t*dx,y-a.y-t*dy)>Math.max(1,s.width/2))continue;
        depth=a.d+t*(b.d-a.d)+.012;
      }else{
        const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-a.x,ey=d.y-a.y,det=dx*ey-dy*ex;
        if(Math.abs(det)<.001)continue;
        const u=((x-a.x)*ey-(y-a.y)*ex)/det,v=(dx*(y-a.y)-dy*(x-a.x))/det;
        if(u<0||v<0||u>1||v>1)continue;
        depth=a.d+u*(b.d-a.d)+v*(d.d-a.d)+(s.image?.008:0);
      }
      if(depth>=best){best=depth;group=s.group??null;}
    }
    return group;
  }
  const quad=(points,fill,shade=1,group)=>rect(points,fill,shade,group);
  // A painted picture on any flat quad. Points run top-left, top-right, bottom-right, bottom-left as the viewer reads it.
  // The canvas is painted once per key and kept, so a scene that is rebuilt often reuses its textures.
  function picture(points,key,w,h,paint,group){
    if(!signs.has(key)){const img=document.createElement('canvas');img.width=w;img.height=h;paint(img.getContext('2d'),w,h);signs.set(key,{img});}
    rect(points,'#ffffff',1,group,signs.get(key));
  }
  // top(true) marks the shapes that follow as the floor on show; setLift raises that floor by a height in metres.
  return {setScene(build){shapes=[];topLayer=false;build({box,line,sign,quad,picture,top(on){topLayer=!!on}});frame=null;draw();},
    setExtent(points){extent=points;frame=null;},setLift(height){lift=height;draw();},
    setCamera(a,e,z=1){angle=a;elevation=e;zoom=Math.max(.1,z);frame=null;draw();},draw,project,hit};
}

// Dimensions in metres, read from the venue's official drawings (plans and elevations, 2021).
// Real-building coordinates: x runs east from the west wall, s runs south from the north wall
// (the street is s = 17.07) and h is the height above the ground-floor level.
const KH={W:24.38,D:17.07,CW:2.44,          // footprint, container width
  XA:9.76,XM:12.19,XV:17.06,XG:18.285,      // four LED bays | 40 ft container | atrium east edge | north garage door east edge
  XE0:14.43,XE1:16.68,                      // lift shaft
  N1:2.44,N2:4.88,S20:10.975,SB:14.02,SS:14.63,
  F:[0,2.89,5.78,8.67],T:11.71,TOP:13.51};  // floor levels, 4F roof line, lift tower
function real(m){
  const X=x=>x-KH.W/2, Y=s=>KH.D/2-s, P=p=>[X(p[0]),Y(p[2]),p[1]];
  return {
    box(x0,h0,s0,x1,h1,s1,fill,stroke,group){m.box(X(x0),Y(s1),h0,x1-x0,s1-s0,h1-h0,fill,stroke,group)},
    line(a,b,color,width,group){m.line(P(a),P(b),color,width,group)},
    quad(points,fill,shade,group){m.quad(points.map(P),fill,shade,group)},
    picture(points,key,w,h,paint,group){m.picture(points.map(P),key,w,h,paint,group)},
    sign(x0,h0,s,w,h,text,group,tone){m.sign(X(x0),Y(s),h0,w,h,text,group,tone)},
    top(on){m.top(on)},
    at:(x,h,s)=>[X(x),Y(s),h]
  };
}
// Corner points that frame the interior drawing at one scale on every floor.
function interiorExtent(){
  const pts=[], top=KH.F[2]+1.2;
  for(const x of [-.1,KH.W+.1])for(const s of [0,KH.D+.9])for(const h of [-.2,top])pts.push([x-KH.W/2,KH.D/2-s,h]);
  return pts;
}

// Banner and sign positions from the venue's signage guide (width x height in metres).
var LED_MODE=0;   // exterior LED content type shown, cycled by the page
var SCREEN_MODE=0;   // main LED screen content shown, cycled by the page
// The four pictures the main LED screen cycles through: title, live ranking, a trader's chart and the session vote.
// Each paints a W x H canvas; shapes are kept large because the screen is small in the drawing.
const SCREENS=(()=>{
  const face=' system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif', UP='#3ddc84', DOWN='#ff5c6c', INK='#ffffff', DIM='#a9b0d6';
  const ground=(c,W,H)=>{const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#1a1d4a');g.addColorStop(1,'#0e1030');c.fillStyle=g;c.fillRect(0,0,W,H);};
  const text=(c,s,x,y,size,color,align='left',weight=700,style='')=>{c.font=style+' '+weight+' '+size+'px'+face;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(s,x,y);};
  const fit=(c,s,maxW,size,weight,style)=>{c.font=style+' '+weight+' '+size+'px'+face;return Math.min(size,size*maxW/Math.max(1,c.measureText(s).width));};
  const head=(c,W,title,right,rightColor=DIM)=>{
    c.fillStyle='#ffffff14';c.fillRect(0,0,W,58);text(c,title,24,30,24,INK);if(right)text(c,right,W-24,30,24,rightColor,'right');
  };
  return [
    // 1 Title card
    (c,W,H)=>{
      ground(c,W,H);
      c.fillStyle=UP;c.fillRect(0,0,W,8);c.fillRect(0,H-8,W,8);
      text(c,'Minted Labs × Nouns DAO',W/2,44,20,DIM,'center',600);
      const lines=['SEOUL ONCHAIN','TRADING','CHAMPIONSHIP'], size=Math.min(...lines.map(s=>fit(c,s,W*.86,66,800,'italic')));
      lines.forEach((s,i)=>text(c,s,W/2,104+i*62,size,INK,'center',800,'italic'));
      text(c,'2026.12.19–20 · SJ KUNSTHALLE',W/2,H-36,20,UP,'center',700);
    },
    // 2 Live ranking of the four traders on stage
    (c,W,H)=>{
      ground(c,W,H);head(c,W,'조별 예선 A조 · 실시간 순위','12:34');
      c.fillStyle=DOWN;c.fillRect(W-150,18,54,24);text(c,'LIVE',W-123,30,14,INK,'center',800);
      [['TRADER 3',12.4],['TRADER 1',7.8],['TRADER 4',1.9],['TRADER 2',-3.2]].forEach(([name,v],i)=>{
        const y=92+i*56, w=Math.abs(v)/12.4*250;
        text(c,String(i+1),38,y,30,i<2?UP:DIM,'center',800);
        text(c,name,70,y,24,INK);
        c.fillStyle='#ffffff18';c.fillRect(230,y-14,250,28);
        c.fillStyle=v<0?DOWN:UP;c.fillRect(230,y-14,w,28);
        text(c,(v<0?'−':'+')+Math.abs(v).toFixed(1)+'%',W-24,y,26,v<0?DOWN:UP,'right',800);
      });
    },
    // 3 One trader's screen: candles and the running return
    (c,W,H)=>{
      ground(c,W,H);head(c,W,'TRADER 1 · BTC-USDT','+7.8%',UP);
      c.strokeStyle='#ffffff1c';c.lineWidth=1;for(let i=1;i<4;i++){const y=58+i*(H-78)/4;c.beginPath();c.moveTo(20,y);c.lineTo(W-20,y);c.stroke();}
      const moves=[6,-4,9,5,-7,11,-3,8,-10,4,12,-5,7,9,-6,13,-4,6,10,-8,9,11], n=moves.length, step=(W-56)/n;
      let price=96;
      moves.forEach((d,i)=>{
        const open=price, close=price+d, hi=Math.max(open,close)+4, lo=Math.min(open,close)-4, x=30+i*step, Y=p=>H-22-(p-80)*1.55;
        c.fillStyle=c.strokeStyle=d<0?DOWN:UP;c.lineWidth=2;
        c.beginPath();c.moveTo(x+step*.33,Y(hi));c.lineTo(x+step*.33,Y(lo));c.stroke();
        c.fillRect(x,Math.min(Y(open),Y(close)),step*.66,Math.max(3,Math.abs(Y(open)-Y(close))));
        price=close;
      });
    },
    // 4 Session vote: who finishes first in this heat
    (c,W,H)=>{
      ground(c,W,H);head(c,W,'세션 투표 · 누가 1위일까?','마감 01:20',UP);
      [['T1',38],['T2',27],['T3',21],['T4',14]].forEach(([name,v],i)=>{
        const x=40+i*104, h=v/38*150, y0=H-52;
        c.fillStyle='#ffffff18';c.fillRect(x,y0-150,70,150);
        c.fillStyle=i?'#8d93ff':UP;c.fillRect(x,y0-h,70,h);
        text(c,v+'%',x+35,y0-h-18,24,INK,'center',800);
        text(c,name,x+35,H-28,22,DIM,'center',700);
      });
      const q=130, qx=W-q-34, qy=96;   // QR placeholder
      c.fillStyle=INK;c.fillRect(qx,qy,q,q);c.fillStyle='#12142e';
      for(let a=0;a<7;a++)for(let b=0;b<7;b++)if((a*5+b*3+a*b)%3===0||((a<2||a>4)&&(b<2||b>4)&&!(a>4&&b>4)))c.fillRect(qx+10+a*16,qy+10+b*16,14,14);
      text(c,'플레이 카드로 투표',qx+q/2,qy+q+26,18,DIM,'center',700);
    }
  ];
})();
// Stage variants. Draft A ("draftA", shown on the site): pentagon stage, desks along the diagonal edges facing the audience.
// Draft B ("draftB"): back edge 10 m like the screen, 2 x 2 desks per side turned 30 degrees, back row faces the audience,
// front row faces the screen. 'line' is the old straight stage, 'facing' an early pentagon draft with desks facing each other.
// Points are (x east, s south) in metres.
var STAGE_VARIANT='draftA';
const THRUST={h:.6,xFront:20.05,firstDesk:.75,pitch:1.1,
  pts:[[23.95,3.2],[22.45,3.2],[20.05,8.05],[20.05,9.05],[22.45,13.9],[23.95,13.9]]};
// Draft B: back edge matches the 10 m screen (about 1.1 m left free on each side), side edges 2.10 m deep so 2 x 2 desks per side fit, turned 30 degrees from the audience towards the centre.
const THRUST_B={h:.6,xFront:20.05,phi:30,
  pts:[[23.95,3.55],[21.85,3.55],[20.05,8.05],[20.05,9.05],[21.85,13.55],[23.95,13.55]],   // back edge = screen width 10.0 m
  desks:[[22.2,5.0],[22.77,6.0],[21.79,6.39],[22.37,7.39]],     // north side; the south side mirrors them
  reverse:[false,false,true,true]};   // front row (3, 4 / 7, 8) faces the screen: the audience sees their backs, sides and monitors
const SIGNS={right:[11.82,5.68],topLeft:[9.70,2.80],door:[2.40,0.52],hallWide:[6.30,2.38],hallTall:[2.43,5.54]};
const EVENT_NAME=['SEOUL ONCHAIN','TRADING','CHAMPIONSHIP'];
const STREET_DOOR={x0:10.1,x1:11.85,height:2.3};
function drawStreetEntrance(r,group){
  const {x0,x1,height:h}=STREET_DOOR, s=KH.D, leaf=(x1-x0-.24)/2, mid=(x0+x1)/2, [sw,sh]=SIGNS.door;
  for(const x of [x0,x1-.12])r.box(x,0,s-.15,x+.12,h,s+.13,'#424242','#303030',group);
  r.box(mid-sw/2,h,s-.15,mid+sw/2,h+sh,s+.36,'#3b3b3b','#303030',group);            // replaceable sign box over the door
  r.sign(mid-sw/2+.035,h+.03,s+.37,sw-.07,sh-.055,['SEOUL ONCHAIN TRADING CHAMPIONSHIP'],group,'dark');
  r.box(x0-.10,-.15,s+.02,x1+.10,0,s+.9,'#b2b2b2','#8b8b8b',group);
  for(let i=0;i<2;i++){
    const x=x0+.12+i*leaf;
    r.box(x,.1,s-.06,x+leaf-.03,h-.11,s+.10,'#8f8f8f','#4b4b4b',group);
    const grip=i?x+.16:x+leaf-.19;
    r.line([grip,.91,s+.12],[grip,1.4,s+.12],'#eeeeee',1.4,group);
  }
}

function buildExterior(m) {
  const r=real(m), {W,D,CW,XA,XM,XV,XG,N1,N2,S20,F,T,TOP}=KH;
  const wall='#585858', post='#373737', rib='#797979', roof='#5e5e5e', glass='#808080';
  // Corrugation lines sit just proud of each wall face.
  const ribs={
    south(x0,x1,h0,h1,step=.29){for(let x=x0+step*.6;x<x1-.05;x+=step)r.line([x,h0,D+.035],[x,h1,D+.035],rib,.55,'exterior')},
    north(x0,x1,h0,h1,step=.29){for(let x=x0+step*.6;x<x1-.05;x+=step)r.line([x,h0,-.035],[x,h1,-.035],rib,.55,'exterior')},
    west(s0,s1,h0,h1,step=.29){for(let s=s0+step*.6;s<s1-.05;s+=step)r.line([-.035,h0,s],[-.035,h1,s],rib,.55,'exterior')},
    east(s0,s1,h0,h1,step=.29){for(let s=s0+step*.6;s<s1-.05;s+=step)r.line([W+.035,h0,s],[W+.035,h1,s],rib,.55,'exterior')}
  };
  r.box(-1.4,-.33,-1.4,W+1.4,-.15,D+2.4,'#c6c6c6','#979797','exterior');
  r.box(0,-.15,0,W,T,D,wall,post,'exterior');
  r.box(0,0,D,W,T,D+.02,wall,'none','exterior');
  r.box(-.02,0,0,0,T,D,wall,'none','exterior');

  // Street front, west 9.76 m: four bays of LED windows on three floors (the colour LED face).
  r.box(0,0,D+.02,XA,F[3],D+.07,post,post,'signage');
  // The LED face cycles through three content types (LED_MODE): 0 one band across the 2F row,
  // 1 a band on every row, 2 a logo in each of the twelve windows. Sponsor logos and copy, video allowed.
  const tones=['#5d5d5d','#696969','#656565','#5f5f5f','#666666','#6c6c6c','#696969','#636363','#5e5e5e','#636363','#616161','#595959'];
  const banded=k=>LED_MODE===1||(LED_MODE===0&&k===1);
  for(let k=0;k<3;k++)for(let i=0;i<4;i++){
    const x0=i*CW+.185,x1=(i+1)*CW-.185,h0=F[k]+.3,h1=F[k]+2.6;
    r.box(x0,h0,D+.07,x1,h1,D+.11,tones[k*4+i],post,'signage');
    if(banded(k))continue;
    if(LED_MODE===2){r.sign(x0+.04,h0+.04,D+.12,x1-x0-.08,h1-h0-.08,['LOGO'],'signage','led');continue;}
    for(let n=1;n<10;n++){const x=x0+n*(x1-x0)/10;r.line([x,h0+.05,D+.125],[x,h1-.05,D+.125],'#8a8a8a',.32,'signage')}
    for(let n=1;n<11;n++){const h=h0+n*(h1-h0)/11;r.line([x0+.05,h,D+.125],[x1-.05,h,D+.125],'#8e8e8e',.34,'signage')}
  }
  // Bands run across the four windows of a row; the mullions stay in front of them.
  for(let k=0;k<3;k++){
    if(!banded(k))continue;
    r.sign(.185,F[k]+.3,D+.12,XA-.37,2.3,LED_MODE===0?['SPONSOR LOGO · MESSAGE']:[['SPONSOR C','SPONSOR B','SPONSOR A'][k]+' · LOGO'],'signage','led');
    for(let i=1;i<4;i++)r.box(i*CW-.185,F[k]+.3,D+.07,i*CW+.185,F[k]+2.6,D+.14,post,post,'signage');
  }
  // The venue's vertical name sign on the west corner.
  r.box(-.62,4.9,D-.05,-.05,8.6,D+.2,post,post,'exterior');
  r.sign(-.57,5.0,D+.21,.47,3.5,'KUNSTHALLE'.split(''),'exterior');

  // Entrance bay (2.43 m): glazed door bay on 1F, one window on 2F, container wall above.
  r.box(XA,0,D+.02,XM,F[1]-.1,D+.06,glass,post,'entrance');
  drawStreetEntrance(r,'entrance');
  // The 2F window over the door is plain glass, not a thirteenth LED window: in the venue's night photo
  // (signage guide p.4) the twelve LED windows are lit and this one stays dark. Its own zone, with glare lines.
  const gx=XA+.2, gh=F[1]+.3;
  r.box(gx,gh,D+.02,XM-.2,F[2]-.3,D+.07,'#7a7a7a',post,'glass');
  r.line([gx+.3,gh+.5,D+.08],[gx+1.0,gh+1.8,D+.08],'#b4b4b4',.7,'glass');
  r.line([gx+.62,gh+.35,D+.08],[gx+1.5,gh+1.95,D+.08],'#a4a4a4',.5,'glass');
  ribs.south(XA,XM,F[2]+.1,F[3]-.1);
  // East 12.19 m: container wall on every floor.
  for(let k=0;k<3;k++)ribs.south(XM,W,F[k]+.1,F[k+1]-.1);
  ribs.south(XA,W,F[3]+.1,T-.14,.61);
  for(const h of [F[1],F[2],F[3]])r.box(XA,h-.05,D+.02,W,h+.05,D+.09,post,post,'exterior');
  r.box(0,F[3]-.05,D+.02,XA,F[3]+.05,D+.09,post,post,'exterior');
  r.box(0,T-.12,D+.02,W,T,D+.09,post,post,'exterior');
  for(const x of [0,XA-.06,XM-.06,W-.12])r.box(x,0,D+.02,x+.12,T,D+.1,post,post,'exterior');
  // Right-centre banner area: 2F-3F of the east container wall.
  const [bw,bh]=SIGNS.right, bx=XM+(W-XM-bw)/2, bz=F[1]+(F[3]-F[1]-bh)/2;
  r.box(bx,bz,D+.09,bx+bw,bz+bh,D+.16,'#c8c8c8',post,'banner');
  r.sign(bx+.25,bz+.25,D+.17,bw-.5,bh-.5,EVENT_NAME,'banner','partners');   // event name over three partner tiers
  // Upper-left banner area: 4F, above the LED windows.
  const [tw,th]=SIGNS.topLeft, tx=(XA-tw)/2, tz=F[3]+(T-F[3]-th)/2;
  r.box(tx,tz,D+.09,tx+tw,tz+th,D+.16,'#c8c8c8',post,'topbanner');
  r.sign(tx+.2,tz+.2,D+.17,tw-.4,th-.4,['SEOUL ONCHAIN','TRADING CHAMPIONSHIP'],'topbanner','banner');
  // The venue's name lettering on the 1F container wall, under the banner area.
  r.sign(18.6,2.42,D+.03,5.2,.42,['SJ.KUNSTHALLE'],'exterior','dark');
  for(const x of [1.5,4.55,7.6,10.65,13.7,16.75,19.8,22.85])r.box(x-.13,T+.02,D+.02,x+.13,T+.2,D+.28,'#b6b6b6',post,'exterior');

  // West side: two-storey garage door (equipment load-in) and the staff door.
  r.box(-.08,.05,N2,-.02,F[2]-.05,S20,glass,post,'exterior');
  for(let n=1;n<12;n++){const h=.05+n*(F[2]-.1)/12;r.line([-.095,h,N2],[-.095,h,S20],'#474747',1.1,'exterior')}
  for(let n=1;n<5;n++){const s=N2+n*(S20-N2)/5;r.line([-.097,.05,s],[-.097,F[2]-.05,s],post,1,'exterior')}
  r.box(-.09,0,11.3,-.02,2.3,13.1,'#414141',post,'exterior');
  r.line([-.105,0,12.2],[-.105,2.3,12.2],rib,.9,'exterior');
  ribs.west(0,N1,.1,F[1]-.1);ribs.west(S20,11.3,.1,F[1]-.1);ribs.west(13.1,D,.1,F[1]-.1);
  ribs.west(0,N2,F[1]+.1,F[2]-.1);ribs.west(S20,D,F[1]+.1,F[2]-.1);
  ribs.west(0,D,F[2]+.1,F[3]-.1);ribs.west(0,D,F[3]+.1,T-.14,.61);
  for(const h of [F[1],F[2],F[3],T-.06])r.box(-.09,h-.05,0,-.02,h+.05,D,post,post,'exterior');

  // North and east sides.
  r.box(XM,.05,-.07,XG,F[1]-.05,-.02,glass,post,'exterior');
  ribs.north(0,XM,.1,F[3]-.1);ribs.north(XG,W,.1,F[1]-.1);ribs.north(XM,W,F[1]+.1,F[3]-.1);ribs.north(0,W,F[3]+.1,T-.14,.61);
  ribs.east(0,D,.1,F[3]-.1);ribs.east(0,D,F[3]+.1,T-.14,.61);

  // Roof: mono-pitch glazing over the atrium and the lift and stair tower.
  r.box(.25,T,.25,W-.25,T+.1,D-.25,roof,post,'exterior');
  for(let x=.9;x<W-.3;x+=.61)r.line([x,T+.115,.3],[x,T+.115,D-.3],'#777777',.4,'exterior');
  const xa=XA-.15,xb=XV+.15,sa=N2-.1,sb=12.5,ha=T+.45,hb=T+.95,base=T+.1;
  const foot=[[xa,base,sa],[xb,base,sa],[xb,base,sb],[xa,base,sb]], top=[[xa,ha,sa],[xb,ha,sa],[xb,hb,sb],[xa,hb,sb]];
  r.quad(top,'#9d9d9d',1,'exterior');
  [.91,.85,.96,.88].forEach((shade,i)=>{
    const j=(i+1)%4;
    r.quad([foot[i],foot[j],top[j],top[i]],'#6e6e6e',shade,'exterior');
    r.line(foot[i],top[i],post,.7,'exterior');r.line(top[i],top[j],post,.7,'exterior');
  });
  for(let x=xa+.45;x<xb-.1;x+=.45)r.line([x,ha+.01,sa],[x,hb+.01,sb],'#c4c4c4',.4,'exterior');
  r.box(14.2,T,14.2,17.1,TOP,D,wall,post,'exterior');
  for(let x=14.2+.37;x<17.05;x+=.61)r.line([x,T+.1,D+.015],[x,TOP-.1,D+.015],rib,.55,'exterior');
  return {exterior:r.at(4.9,T+.15,8.5),   // on the dark roof, left of the atrium skylight
    banner:r.at(bx+bw/2,bz+bh,D),topbanner:r.at(tx+tw/2,tz+th,D),
    signage:r.at(4.88,F[2]+1.45,D),glass:r.at(10.975,F[2]-.3,D),entrance:r.at(10.975,-.15,D+1.15)};   // on the front step, clear of the door
}

// Interior cutaway for one floor. See the stacking rule inside.
function buildInterior(m,floor=1) {
  const r=real(m), {W,D,CW,XA,XM,XG,XE0,XE1,N1,N2,S20,SB,SS,F}=KH;
  const dark='#363636', steel='#5c5c5c', pale='#e2e2e2', timber='#a0a0a0', sage='#b6b6b6', teal='#646464', amber='#b0b0b0';
  const shell='#4d4d4d', glass='#a9a9a9', deck='#c4c4c4';
  const CUT=1.2, SH=.45;
  const wall=(x0,h0,s0,x1,h1,s1,color=shell,group='shared')=>r.box(x0,h0,s0,x1,h1,s1,color,steel,group);
  function chair(x,h,s,back,group){
    r.box(x,h,s,x+.42,h+.45,s+.42,'#b1b1b1',steel,group);
    const b={'-x':[x,s,x+.05,s+.42],'+x':[x+.37,s,x+.42,s+.42],'+s':[x,s+.37,x+.42,s+.42],'-s':[x,s,x+.42,s+.05]}[back];
    r.box(b[0],h+.45,b[1],b[2],h+.86,b[3],dark,'none',group);
  }
  function tripod(x,h,s,group){
    for(const [dx,ds] of [[-.3,-.2],[.3,-.2],[0,.34]])r.line([x+dx,h,s+ds],[x,h+1.5,s],dark,1.2,group);
    r.box(x-.2,h+1.5,s-.12,x+.22,h+1.72,s+.12,dark,steel,group);
  }
  // Open-tread stairs. `along` is the axis they climb on; treads stop at `limit`.
  function stair(along,a0,a1,from,to,h0,h1,group,limit=Infinity){
    const n=Math.round((h1-h0)/.18),run=(to-from)/n,rise=(h1-h0)/n;
    let made=0;
    for(;made<n&&h0+(made+1)*rise<=limit;made++){
      const p=from+made*run,q=p+run,h=h0+(made+1)*rise,lo=Math.min(p,q),hi=Math.max(p,q);
      if(along==='s')r.box(a0,h-.05,lo,a1,h,hi,steel,dark,group);else r.box(lo,h-.05,a0,hi,h,a1,steel,dark,group);
    }
    const end=from+made*run,top=h0+made*rise;
    for(const a of [a0,a1])for(const lift of made<n?[0]:[0,.95]){
      if(along==='s')r.line([a,h0+lift,from],[a,top+lift,end],dark,1.1,group);else r.line([from,h0+lift,a],[end,top+lift,a],dark,1.1,group);
    }
  }
  function rail(a,b,h,group){
    const n=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/1.2));
    r.line([a[0],h+1.1,a[1]],[b[0],h+1.1,b[1]],dark,1.4,group);
    r.line([a[0],h+.55,a[1]],[b[0],h+.55,b[1]],steel,.8,group);
    for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,s=a[1]+(b[1]-a[1])*i/n;r.line([x,h,s],[x,h+1.1,s],dark,1.1,group)}
  }
  // Casino poker table centred at (cx, cs): long axis along s. Built from quads around a racetrack outline.
  function pokerTable(cx,cs){
    const y=F[2],a=1.4,b=.7,N=40,top=y+.78,edge=y+.62;
    const outline=(k)=>{const pts=[],half=a-b;   // k scales the outline inwards
      for(let i=0;i<N;i++){const t=i/N*2*Math.PI,c=Math.cos(t),sn=Math.sin(t);
        const ds=sn>=0?half:-half;pts.push([cx+c*b*k,cs+ds*k+sn*b*k]);}return pts;};
    const outer=outline(1),inner=outline(.8),bet=outline(.55),P=(p,h)=>[p[0],h,p[1]];
    r.box(cx-.3,y,cs-.8,cx+.3,y+.62,cs+.8,'#2a2a2a','none','gallery');               // pedestal
    for(let i=0;i<N;i++){const j=(i+1)%N;
      r.quad([P(outer[i],edge),P(outer[j],edge),P(outer[j],top),P(outer[i],top)],'#2b2b2b',.8+.15*Math.abs(Math.cos(i/N*2*Math.PI)),'gallery');
      r.quad([P(outer[i],top),P(outer[j],top),P(inner[j],top),P(inner[i],top)],'#3a3a3a',1,'gallery');   // padded rail
      r.quad([P(inner[i],top-.015),P(inner[j],top-.015),[cx,top-.015,cs],[cx,top-.015,cs]],'#4f7a5c',1,'gallery');   // felt
      r.line(P(bet[i],top-.01),P(bet[j],top-.01),'#d9e6dc',.6,'gallery');                                  // betting line
    }
    r.box(cx+.38,top-.01,cs-.25,cx+.5,top+.03,cs+.25,'#1e1e1e','none','gallery');      // chip tray
    for(const d of [-.3,0,.3])r.box(cx-.15+d*.0,top-.01,cs+d-.04,cx-.03+d*.0,top+.005,cs+d+.04,'#f2f2f2','none','gallery');   // community cards
    r.box(cx+.95,y,cs-.18,cx+1.25,y+1.55,cs+.18,'#4a4a4a','none','gallery');           // dealer
    // Nine seats: around the west side and both ends, spaced along the outline away from the dealer.
    const R=b+.55,seats=[[180,0],[180,-1],[180,1],[215,-1],[250,-1],[290,-1],[145,1],[110,1],[70,1]];
    for(const [deg,end] of seats){
      const g=deg*Math.PI/180,c=Math.cos(g),sn=Math.sin(g);
      const ex=cx+c*R,es=cs+end*(a-b)+sn*R;
      const back=Math.abs(c)>Math.abs(sn)?(c<0?'-x':'+x'):(sn>0?'+s':'-s');
      chair(ex-.21,y,es-.21,back,'gallery');
    }
  }
  // The venue's fixed 10 x 5 m LED screen on the east wall.
  function screen(){
    r.box(24.0,.35,3.535,24.2,5.35,13.535,dark,steel,'stage');
    r.box(23.96,.47,3.66,24.0,5.23,13.41,'#14163a',dark,'stage');   // lit screen face
    // The picture on show, read from the hall: north end on the left, south end on the right.
    const k=SCREEN_MODE%SCREENS.length;
    r.picture([[23.955,5.23,3.66],[23.955,5.23,13.41],[23.955,.47,13.41],[23.955,.47,3.66]],'screen'+k,640,312,SCREENS[k],'stage');
  }
  // Indoor banner positions from the venue's signage guide.
  function hallBanners(wide,tall){
    const [ww,wh]=SIGNS.hallWide, [tw,th]=SIGNS.hallTall, h0=F[1]+(F[2]-F[1]-wh)/2;
    if(wide){   // opposite the main entrance, on the 2F container above the north garage door
      r.box(XM,h0,N1,XM+ww,h0+wh,N1+.05,'#c8c8c8',steel,'hangwide');
      r.sign(XM+.15,h0+.15,N1+.06,ww-.3,wh-.3,EVENT_NAME,'hangwide','banner');
    }
    if(!tall)return;
    // Right of the LED screen, on the north face of the lift shaft. Outline only, so it does not hide the hall.
    const x0=(XE0+XE1-tw)/2,x1=x0+tw,s=SS-.03,b=.15,t=b+th;
    for(const [p,q] of [[[x0,b,s],[x0,t,s]],[[x1,b,s],[x1,t,s]],[[x0,t,s],[x1,t,s]],[[x0,b,s],[x1,b,s]]])r.line(p,q,dark,1.6,'hangtall');
    for(let h=b+th/4;h<t-.1;h+=th/4)r.line([x0,h,s],[x1,h,s],steel,.7,'hangtall');
  }
  // Flat tread lines for a stair that leads down from the floor being drawn.
  function stairDown(along,a0,a1,from,to,h,group='facility'){
    for(let p=Math.min(from,to)+.14;p<Math.max(from,to);p+=.28){
      if(along==='s')r.line([a0,h,p],[a1,h,p],dark,.9,group);else r.line([p,h,a0],[p,h,a1],dark,.9,group);
    }
  }
  // Street and west faces of a floor that lies below the one on show: LED window panels and the garage door glazing.
  function outerFaces(k){
    for(let i=0;i<4;i++)r.box(i*CW+.185,F[k]+.3,D,(i+1)*CW-.185,F[k]+2.6,D+.04,'#676767',dark,'shared');
    for(let n=1;n<6;n++){const h=F[k]+n*(F[k+1]-F[k])/6;r.line([-.012,h,N2],[-.012,h,S20],steel,.9,'shared')}
  }
  // The floor on show is cut 1.2 m above its slab and sits on the floors below it, which are drawn whole.
  // Only the atrium shows what is underneath.
  if(floor===1)return firstFloor(false);
  firstFloor(true);
  if(floor===2){r.top(true);return upperFloor(false);}
  upperFloor(true);
  r.top(true);
  return thirdFloor();

  function firstFloor(whole){
  const full=whole?F[1]-.14:F[1], low=whole?F[1]-.14:CUT;
  // ---- 1F shell ----
  wall(0,-.2,0,W,0,D,'#cdcdcd');
  wall(0,0,0,XM,full,N1);                                    // kitchen, men's toilet and inner stair container
  r.sign(1.6,1.75,N1+.012,2.2,.42,['주방'],'shared');
  r.sign(8.4,1.75,N1+.012,3.1,.42,['화장실 (남)'],'facility');
  for(const s of [.35,1.45])r.box(XM,0,s,XM+.05,2.1,s+.8,'#8f8f8f','#4b4b4b','facility');   // stair door, toilet door
  wall(0,0,N1,.6,full,N2);                                   // electrical room
  wall(XG,0,0,W,full,N1);                                    // storage, outside the rental area
  wall(XM,0,0,XG,full,.06,glass);                            // north garage door
  for(let n=1;n<6;n++){
    const h=n*full/6,x=XM+n*(XG-XM)/6;
    r.line([XM,h,.075],[XG,h,.075],steel,.8,'shared');r.line([x,0,.075],[x,full,.075],steel,.8,'shared');
  }
  wall(W-.08,0,N1,W,F[2],SS);                                // east container wall behind the screen
  if(!whole)wall(XM,F[1],0,W,F[2],N1);                       // 2F container over the north garage door
  wall(XM-.12,0,N2-.12,XM+.12,full,N2+.12,dark);             // the one free-standing column
  wall(0,0,N2,.06,whole?F[1]:CUT,S20,glass);                 // west garage door
  if(whole)outerFaces(0);
  else for(let h=.4;h<CUT;h+=.4)r.line([-.012,h,N2],[-.012,h,S20],steel,.9,'shared');
  stair('s',.15,1.25,10.6,6.1,0,F[1],'shared');              // up to the 2F balcony
  wall(0,0,S20,.08,low,11.3);wall(0,0,13.1,.08,low,SB);      // west wall with the staff door
  r.box(0,0,11.3,.05,Math.min(low,2.3),13.1,'#8f8f8f','#4b4b4b','shared');
  for(let i=0;i<=4;i++){const x=Math.min(i*CW,XA-.08);wall(x,0,SB,x+.08,low,D-.08)}   // four street-side bays
  wall(0,0,D-.08,XA,low,D,dark);                             // LED window wall
  // Glazed entrance vestibule, lift and the storage container with the main stair.
  const {x0:dx0,x1:dx1}=STREET_DOOR;
  for(const [x0,s0,x1,s1] of [[XA,D-.06,dx0,D],[dx1,D-.06,XM,D],[XA,SS,dx0,SS+.06],[dx1,SS,XE0,SS+.06],[XM-.03,SS+.06,XM+.03,D-.06]])
    r.box(x0,0,s0,x1,low,s1,glass,steel,'gate');
  wall(XM+.03,0,D-.08,XE0,low,D);                            // container wall east of the entrance bay
  drawStreetEntrance(r,'gate');
  wall(XE0,0,SS,XE1,whole?F[1]:CUT,D,dark);
  wall(XE1,0,SS,W,low,D);
  hallBanners(!whole,true);

  // ---- 1F event layout ----
  // Existing bar counters in front of the kitchen serve the catering.
  for(const [x0,x1] of [[.8,5.9],[6.5,11.9]]){
    r.box(x0,0,4.5,x1,1.02,4.85,teal,steel,'buffet');
    r.box(x0-.05,1.02,4.45,x1+.05,1.1,4.9,timber,steel,'buffet');
    for(let x=x0+.35,i=0;x+1<x1;x+=1.3,i++)r.box(x,1.1,4.52,x+.9,1.2,4.84,[amber,sage,'#8b8b8b'][i%3],steel,'buffet');
  }
  r.sign(7.4,.3,4.86,3.6,.45,[korean ? '바 / 케이터링' : 'BAR / CATERING'],'buffet');
  for(const [x,s] of [[3.4,6.6],[5.6,7.5],[7.8,6.4],[4.2,9.7],[6.6,10.4],[8.4,8.9]]){   // standing tables in the lounge
    r.box(x-.3,1.05,s-.3,x+.3,1.1,s+.3,pale,steel,'buffet');
    r.box(x-.04,.03,s-.04,x+.04,1.05,s+.04,steel,'none','buffet');
    r.box(x-.2,0,s-.2,x+.2,.03,s+.2,steel,'none','buffet');
  }
  if(STAGE_VARIANT!=='line')thrustStage(STAGE_VARIANT==='draftA',STAGE_VARIANT==='draftB');
  else{
  // Stage in front of the LED screen.
  r.box(20.4,0,3.2,23.95,SH,13.9,dark,steel,'stage');
  for(let j=1;j<=2;j++)r.box(20.4-.3*j,0,7.75,20.4-.3*(j-1),SH-.15*j,9.35,pale,steel,'stage');
  screen();
  r.box(20.72,SH,8.32,21.02,SH+1.1,8.78,steel,dark,'stage');                            // host lectern
  for(const s of [2.9,14.0])r.box(19.58,0,s,19.82,4.6,s+.2,dark,steel,'stage');        // ground-supported lighting truss
  r.box(19.55,4.6,2.9,19.85,4.9,14.2,steel,dark,'stage');
  for(let s=3.9;s<13.7;s+=1.3)r.box(19.59,4.28,s-.11,19.81,4.6,s+.11,dark,'none','stage');
  for(const g of [3.45,9.15])for(let i=0;i<4;i++){                                      // player desks, 4 + 4
    const s0=g+i*1.15,s1=s0+1.05,sc=s0+.525;
    r.box(21.2,SH+.70,s0,21.85,SH+.74,s1,pale,steel,'players');
    r.box(21.2,SH,s0,21.24,SH+.70,s1,pale,steel,'players');
    r.box(21.42,SH+.86,sc-.28,21.46,SH+1.2,sc+.28,dark,steel,'players');
    r.line([21.44,SH+.74,sc],[21.44,SH+.86,sc],dark,1.2,'players');
    chair(22.05,SH,sc-.21,'+x','players');
  }
  }
  // Draft: thrust stage pointing at the audience (reference photo). Two banks of four desks face each other across a centre lane.
  // out=true (draft A): desks sit along the diagonal edges and the players face outwards, towards the audience.
  function thrustStage(out,angled){
    const T=angled?THRUST_B:THRUST, H=T.h, [A,B,C,Dp,E,F]=T.pts, MID=(T.pts[0][1]+T.pts[5][1])/2;
    const P=(p,h)=>[p[0],h,p[1]];
    r.quad([P(A,H),P(B,H),P(E,H),P(F,H)],dark,1,'stage');
    r.quad([P(B,H),P(C,H),P(Dp,H),P(E,H)],dark,1,'stage');
    [[A,B,.86],[B,C,.93],[C,Dp,.8],[Dp,E,.9],[E,F,.84]].forEach(([p,q,sh])=>{
      r.quad([P(p,0),P(q,0),P(q,H),P(p,H)],dark,sh,'stage');
      r.line(P(p,H+.004),P(q,H+.004),'#f7f7f7',2.2,'stage');      // LED strip on the top edge
      r.line(P(p,.03),P(q,.03),'#d8d8d8',1.1,'stage');             // floor glow line
      r.line(P(p,0),P(p,H),steel,.7,'stage');
    });
    // Printed skirt panels on the two long diagonals.
    for(const [p,q] of [[B,C],[Dp,E]]){
      const dx=q[0]-p[0],ds=q[1]-p[1],len=Math.hypot(dx,ds),ox=-ds/len*.012*(p===B?1:-1),os=dx/len*.012*(p===B?1:-1);
      const a=[p[0]+dx*.08-ox,p[1]+ds*.08-os],b=[p[0]+dx*.92-ox,p[1]+ds*.92-os];
      r.quad([P(a,.1),P(b,.1),P(b,H-.1),P(a,H-.1)],'#d9d9d9',1,'stage');
    }
    // Steps: front chamfer to the centre aisle, and a crew step on the north side.
    r.box(T.xFront-.3,0,C[1],T.xFront,H*2/3,Dp[1],pale,steel,'stage');
    r.box(T.xFront-.6,0,C[1],T.xFront-.3,H/3,Dp[1],pale,steel,'stage');
    r.box(22.7,0,A[1]-.3,23.7,H*2/3,A[1],pale,steel,'stage');
    r.box(22.7,0,A[1]-.6,23.7,H/3,A[1]-.3,pale,steel,'stage');
    screen();
    for(const s of [2.9,14.0])r.box(19.58,0,s,19.82,4.6,s+.2,dark,steel,'stage');        // ground-supported lighting truss
    r.box(19.55,4.6,2.9,19.85,4.9,14.2,steel,dark,'stage');
    for(let s=3.9;s<13.7;s+=1.3)r.box(19.59,4.28,s-.11,19.81,4.6,s+.11,dark,'none','stage');
    // Oriented box: centre (x,s), unit axes u and n in the x-s plane, half sizes a and b.
    function obox(c,u,n,a,b,h0,h1,fill,stroke,group,mirror){
      const M=q=>mirror?[q[0],2*MID-q[1]]:q;
      const k=(i,j)=>M([c[0]+u[0]*i*a+n[0]*j*b,c[1]+u[1]*i*a+n[1]*j*b]);
      const ring=[k(-1,-1),k(1,-1),k(1,1),k(-1,1)];
      r.quad(ring.map(q=>P(q,h1)),fill,1,group);
      ring.forEach((q,i)=>{const w=ring[(i+1)%4];r.quad([P(q,h0),P(w,h0),P(w,h1),P(q,h1)],fill,[.86,.92,.8,.95][i],group);
        if(stroke!=='none'){r.line(P(q,h1),P(w,h1),stroke,.7,group);r.line(P(q,h0),P(q,h1),stroke,.7,group);}});
    }
    const dx=C[0]-B[0],ds=C[1]-B[1],len=Math.hypot(dx,ds),u=[dx/len,ds/len],n=[u[1],-u[0]];   // n points into the stage
    const at=(t,d)=>[B[0]+u[0]*t+n[0]*d,B[1]+u[1]*t+n[1]*d];
    if(angled){
      const ph=T.phi*Math.PI/180,fd=[-Math.cos(ph),Math.sin(ph)],ad=[fd[1],-fd[0]];   // fd: towards the audience; ad: along the desk
      for(const mirror of [false,true])T.desks.forEach((c,k)=>{
        const fl=T.reverse[k]?-1:1,f=[fd[0]*fl,fd[1]*fl],a=[ad[0]*fl,ad[1]*fl];
        const off=(c,da,df)=>[c[0]+a[0]*da+f[0]*df,c[1]+a[1]*da+f[1]*df];
        obox(c,a,f,.525,.325,H+.70,H+.74,pale,steel,'players',mirror);                 // desk top
        obox(off(c,0,.31),a,f,.525,.015,H,H+.70,'#9a9a9a',steel,'players',mirror);     // front panel facing the audience
        obox(off(c,-.27,.17),a,f,.22,.02,H+.86,H+1.14,dark,steel,'players',mirror);    // low monitor at the outer end
        obox(off(c,0,-.72),a,f,.21,.21,H,H+.45,'#b1b1b1',steel,'players',mirror);      // chair seat
        obox(off(c,0,-.93),a,f,.21,.025,H+.45,H+.86,dark,'none','players',mirror);     // chair back
      });
    }
    else for(const mirror of [false,true])for(let i=0;i<4;i++){
      const t=T.firstDesk+i*T.pitch;
      if(out){
        obox(at(t,.80),u,n,.525,.325,H+.70,H+.74,pale,steel,'players',mirror);    // desk top, along the edge
        obox(at(t,.49),u,n,.525,.015,H,H+.70,'#9a9a9a',steel,'players',mirror);   // front panel facing the audience
        obox(at(t-.27,.66),u,n,.22,.02,H+.86,H+1.14,dark,steel,'players',mirror); // low monitor at one end, so the face stays visible
        obox(at(t,1.5),u,n,.21,.21,H,H+.45,'#b1b1b1',steel,'players',mirror);     // chair seat
        obox(at(t,1.71),u,n,.21,.025,H+.45,H+.86,dark,'none','players',mirror);   // chair back, toward the centre lane
        continue;
      }
      obox(at(t,1.275),u,n,.525,.325,H+.70,H+.74,pale,steel,'players',mirror);   // desk top
      obox(at(t,1.585),u,n,.525,.015,H,H+.70,'#9a9a9a',steel,'players',mirror);   // front panel facing the centre lane
      obox(at(t,1.42),u,n,.28,.02,H+.86,H+1.2,dark,steel,'players',mirror);       // monitor, facing the player
      obox(at(t,.6),u,n,.21,.21,H,H+.45,'#b1b1b1',steel,'players',mirror);        // chair seat
      obox(at(t,.39),u,n,.21,.025,H+.45,H+.86,dark,'none','players',mirror);      // chair back, toward the edge
    }
    obox([T.xFront+.75,MID],[0,1],[1,0],.18,.14,H,H+1.7,'#4a4a4a','none','stage',false);   // host
  }
  for(let i=0;i<7;i++)for(const block of [3.8,9.3])for(let j=0;j<8;j++)chair(12.6+i*.9,0,block+j*.5+.04,'-x','seats');   // 8 x 7 x 2 = 112
  // Check-in at the bay next to the entrance; partner booths 1-3 in the other three bays.
  r.box(7.5,0,13.7,9.55,1.05,14.25,sage,steel,'gate');
  r.sign(7.7,.3,14.26,1.65,.44,[korean ? '등록' : 'CHECK-IN'],'gate');
  for(let i=0;i<3;i++){
    const x=i*CW;
    r.box(x+.12,0,14.1,x+2.4,.02,D-.12,sage,'none','booth');
    r.box(x+.3,0,14.5,x+1.5,1.0,15.0,i%2?teal:steel,dark,'booth');
    for(const bx of [x+.3,x+1.3])r.box(bx,0,16.55,bx+.8,1.9,16.61,pale,steel,'booth');
  }
  // Screen pin near the top of the screen, stage pin over the north bank of desks, so neither touches another pin.
  return {stage:r.at(23.95,4.7,8.5),players:STAGE_VARIANT!=='line'?r.at(21.7,THRUST.h+1.3,5.6):r.at(21.5,SH+1.05,5.7),seats:r.at(15.5,.9,8.55),
    booth:r.at(3.66,1.1,14.75),gate:r.at(8.5,1.15,13.98),door:r.at(10.975,-.15,D+1.15),buffet:r.at(4.6,1.25,4.68),shared:r.at(.03,1.3,7.9),facility:r.at(11.95,1.96,N1),
    hangwide:r.at(XM+SIGNS.hallWide[0],F[1]+.25+SIGNS.hallWide[1],N1),hangtall:r.at((XE0+XE1)/2,.15+SIGNS.hallTall[1],SS)};
  }

  function upperFloor(whole){
    const y=F[1], cut=whole?F[2]-.14:y+CUT, back=whole?F[2]-.14:F[2], slab=(x0,s0,x1,s1,group='shared')=>r.box(x0,y-.14,s0,x1,y,s1,deck,steel,group);
    wall(XM-.12,y-.14,N2-.12,XM+.12,cut,N2+.12,dark);
    wall(0,y,N2,.06,whole?F[2]:cut,S20,glass);                 // west garage door, upper half
    if(whole)outerFaces(1);
    else for(let h=y+.4;h<cut;h+=.4)r.line([-.012,h,N2],[-.012,h,S20],steel,.9,'shared');
    // North gallery room behind the LED glass that faces the hall: partner booths 4-7.
    slab(0,0,XM,N2,'booth');
    wall(0,y,0,XM,back,.08);
    wall(0,y,.08,.08,cut,N2-.08);
    wall(XM-.08,y,N1,XM,cut,N2-.12);
    wall(0,y,N2-.08,.7,cut,N2);wall(2.3,y,N2-.08,2.6,cut,N2);
    r.box(2.6,y,N2-.06,XM-.12,cut,N2,glass,steel,'booth');
    for(let n=1;n<5;n++){const x=2.6+n*(XM-.12-2.6)/5;r.line([x,y,N2+.015],[x,cut,N2+.015],steel,1,'booth')}
    stair('x',.25,1.15,10.3,6.5,y,F[2],'shared',cut);
    // Three booths against the north wall and one in front of the stair; the east end stays clear for the stair foot and the toilet door.
    for(const [x0,s0,w,d] of [[.3,.12,1.9,1.8],[2.3,.12,1.9,1.8],[4.3,.12,1.9,1.8],[6.7,1.35,2.2,1.8]]){
      const xc=x0+w/2;
      r.box(x0,y,s0,x0+w,y+.02,s0+d,sage,'none','booth');
      r.box(xc-.75,y,s0+d-.95,xc+.75,y+.74,s0+d-.25,pale,steel,'booth');            // event table 1,500 x 700
      for(const bx of [xc-.85,xc+.05])r.box(bx,y,s0+.05,bx+.8,y+1.9,s0+.11,pale,steel,'booth');   // two banners at the back
    }
    wall(XM,y-.14,0,W,back,N1);                                // women's toilet container
    r.sign(19.4,y+1.45,N1+.012,3.1,.42,['화장실 (여)'],'facility');
    r.box(XM-.05,y,1.4,XM,cut,2.3,'#8f8f8f','#4b4b4b','facility');   // toilet door, reached through the north room
    hallBanners(true,false);
    // West balcony around the stair, with the second camera.
    slab(0,N2,3.55,6.1,'rail');slab(2.5,6.1,3.55,9.95,'rail');slab(0,9.95,XA,S20,'rail');
    for(const [a,b] of [[[3.55,N2],[3.55,9.95]],[[3.55,9.95],[XA,9.95]],[[2.5,6.1],[2.5,9.95]],[[1.25,6.1],[2.5,6.1]],[[.1,9.95],[2.5,9.95]],[[XA,9.95],[XA,SS]],[[XA,SS],[XE0,SS]]])
      rail(a,b,y,'rail');
    tripod(3.02,y,7.4,'rail');
    // South-west gallery room: VIP room (west) and player waiting zone (east), split by a low partition.
    slab(0,S20,7.32,D,'vip');
    wall(0,y,S20,1.0,cut,S20+.08);wall(1.9,y,S20,7.32,cut,S20+.08);
    wall(0,y,S20+.08,.08,cut,D-.08);
    wall(7.24,y,S20+.08,7.32,cut,14.7);wall(7.24,y,16.3,7.32,cut,D-.08);
    wall(0,y,D-.08,XA,cut,D,dark);
    r.box(.15,y,12.0,.95,y+.42,15.6,sage,steel,'vip');r.box(.15,y+.42,12.0,.35,y+.8,15.6,sage,steel,'vip');     // VIP sofa on the west wall
    r.box(2.7,y,12.6,3.4,y+.42,15.0,sage,steel,'vip');r.box(3.2,y+.42,12.6,3.4,y+.8,15.0,sage,steel,'vip');      // facing sofa
    r.box(1.4,y,13.1,2.3,y+.38,14.5,timber,steel,'vip');                                                       // low table
    r.box(3.85,y,11.6,3.95,y+1.2,16.6,pale,steel,'vip');                                                       // partition
    r.box(4.75,y+.72,12.1,5.55,y+.76,15.9,pale,steel,'vip');r.box(5.1,y,12.2,5.2,y+.72,15.8,steel,'none','vip');  // waiting-zone table
    for(let j=0;j<4;j++){const sc=12.25+j*.92;chair(4.2,y,sc,'-x','vip');chair(5.7,y,sc,'+x','vip');}
    // Corridor and the south walkway: commentary desk, lift and the stair up.
    slab(7.32,S20,XA,D);slab(XA,SS,W,D);
    wall(XA,y,D-.08,XE0,cut,D);wall(XE1,y,D-.08,W-.08,cut,D);
    wall(W-.08,y,SS,W,cut,D);
    wall(XE0,y,SS,XE1,whole?F[2]:cut,D,dark);
    r.box(XE1,y,SS,W-.08,cut,SS+.05,glass,steel,'shared');
    stair('x',15.5,16.5,19.0,23.0,y,F[2],'shared',cut);
    // Commentary desk on the south walkway: hall and screen in one view, backdrop behind the three seats.
    r.box(11.9,y+.72,14.8,14.5,y+.76,15.4,pale,steel,'cast');
    r.box(11.9,y,14.8,14.5,y+.72,14.84,pale,steel,'cast');
    for(const x of [12.05,12.75,13.45])r.box(x,y+.86,14.95,x+.55,y+1.2,14.99,dark,steel,'cast');   // monitors
    for(const x of [12.2,13.0,13.8])chair(x,y,15.55,'+s','cast');
    r.box(11.8,y,16.86,14.4,cut,16.92,dark,steel,'cast');                                            // backdrop behind the commentators
    // Broadcast and lighting control in the corridor, at the rail that looks straight at the stage.
    r.box(9.0,y+.72,11.4,9.6,y+.76,13.6,pale,steel,'control');
    r.box(9.56,y,11.4,9.6,y+.72,13.6,pale,steel,'control');
    for(const s of [11.6,12.3,13.0])r.box(9.3,y+.86,s,9.34,y+1.2,s+.5,dark,steel,'control');        // monitors
    r.box(9.05,y+.76,13.1,9.28,y+.84,13.5,dark,steel,'control');                                     // sound mixer
    for(const s of [11.65,12.35,13.05])chair(8.48,y,s,'-x','control');
    return {booth:r.at(4.3,y+1.1,1.9),vip:r.at(3.9,y+1.3,13.4),cast:r.at(13.3,y+1.0,15.1),control:r.at(9.3,y+1.0,12.5),rail:r.at(3.55,y+1.1,7.4),shared:r.at(15.55,cut,15.85),facility:r.at(XM-.35,y+1.7,1.85),   // the women's toilet door, reached through the north room
      
      hangwide:r.at(XM+SIGNS.hallWide[0],y+.25+SIGNS.hallWide[1],N1)};
  }
  function thirdFloor(){
    const {XV}=KH, y=F[2], cut=y+CUT, RAIL=3.66, slab=(x0,s0,x1,s1,group='shared')=>r.box(x0,y-.14,s0,x1,y,s1,deck,steel,group);
    // North: toilet, inner stair and the corridor to the rooms.
    slab(0,0,XM,N2);
    wall(0,y,0,XV,cut,.08);
    wall(0,y,.08,.08,cut,D-.08);
    wall(.08,y,N1-.08,3.3,cut,N1);                             // toilet: two cubicles in the north-west corner
    wall(3.72,y,.08,3.8,cut,1.3);
    r.box(3.72,y,1.3,3.77,cut,2.3,'#8f8f8f','#4b4b4b','facility');
    for(const x of [.9,1.9])r.box(x,y,.08,x+.9,y+1.0,1.3,pale,steel,'facility');
    r.sign(.45,y+.4,N1+.012,2.4,.42,['화장실'],'facility');
    wall(4.2,y,1.25,10.6,cut,1.31);                            // fire partition along the stair
    stairDown('x',.25,1.15,6.5,10.3,y+.012);
    stair('x',.25,1.15,10.3,6.5,y,F[3],'facility',y+.6);
    for(const x of [6.2,9.15])wall(x-.1,y,2.4,x+.1,cut,2.6,dark);
    wall(XM-.08,y,1.3,XM,cut,N2);
    // West: two containers outside the rental area, then B room and A room as player waiting rooms.
    slab(0,N2,XA,D,'rooms');
    r.box(.08,y,N1,3.8,cut,N2,'#7d7d7d',steel,'shared');
    r.box(.08,y,N2,2*CW,cut,D-.08,'#7d7d7d',steel,'shared');
    for(let c=N2+.5;c<D;c+=.8)r.line([.08,cut+.005,c],[2*CW,cut+.005,c],'#5f5f5f',.5,'shared');
    for(const [i,door,zone] of [[2,5.6,'rooms'],[3,8.1,'interview']]){
      const x=i*CW;
      wall(x,y,N2,door,cut,N2+.08);wall(door+.9,y,N2,x+CW,cut,N2+.08);
      wall(x+CW-.08,y,N2+.08,x+CW,cut,D-.08,i===3?glass:shell,zone);
      if(zone==='interview'){
        // A room (glass on the hall side): interview set at the street end, facing the door end.
        r.box(x+.25,y,16.2,x+2.15,cut,16.26,dark,steel,zone);                              // backdrop
        for(const cx of [x+.55,x+1.45])chair(cx,y,15.2,'+s',zone);                         // two interview chairs, backs to the backdrop
        for(const lx of [x+.4,x+1.95]){                                                    // two light stands
          r.box(lx-.04,y,13.9-.04,lx+.04,y+1.15,13.9+.04,steel,'none',zone);
          r.box(lx-.18,y+1.0,13.9-.14,lx+.18,y+1.19,13.9+.14,pale,steel,zone);
        }
        tripod(x+1.2,y,12.8,zone);                                                         // camera
        r.box(x+.2,y,9.2,x+.9,y+.74,11.0,pale,steel,zone);                                 // table for checking footage
        for(const ms of [9.5,10.3])r.box(x+.3,y+.86,ms,x+.34,y+1.16,ms+.5,dark,steel,zone);
        for(const cs of [6.0,6.6,7.2])chair(x+.15,y,cs,'-x',zone);                         // waiting chairs by the door
        continue;
      }
      for(const s0 of [6.2,10.6]){
        r.box(x+.3,y,s0,x+1.0,y+.42,s0+3.0,sage,steel,'rooms');
        r.box(x+.3,y+.42,s0,x+.5,y+.8,s0+3.0,sage,steel,'rooms');
        r.box(x+1.35,y,s0+.6,x+1.95,y+.4,s0+2.4,timber,steel,'rooms');
      }
      // Luggage racks at the street end: player and VIP bags.
      r.box(x+.2,y,14.3,x+.75,y+1.6,16.7,pale,steel,'rooms');
      for(const h of [.55,1.1])r.line([x+.2,y+h,14.3],[x+.2,y+h,16.7],steel,.8,'rooms');
      for(const bs of [14.6,15.4,16.1])r.box(x+.95,y,bs,x+1.45,y+.65,bs+.4,teal,steel,'rooms');
    }
    wall(0,y,D-.08,XA,cut,D,dark);
    // Bridge with its handrail, and the gallery over the stage (outside the standard rental).
    slab(XM,0,XV,RAIL);
    rail([XM,RAIL],[XV,RAIL],y,'shared');
    slab(XV,0,W,14.47,'gallery');
    wall(XV,y,.08,XV+.08,cut,1.6,shell,'gallery');wall(XV,y,3.2,XV+.08,cut,RAIL,shell,'gallery');
    r.box(XV,y,RAIL,XV+.06,cut,14.47,glass,steel,'gallery');   // LED glass facing the hall
    for(let n=1;n<6;n++){const s=RAIL+n*(14.47-RAIL)/6;r.line([XV-.015,y,s],[XV-.015,cut,s],steel,1,'gallery')}
    wall(XV,y,0,W,cut,.08,shell,'gallery');
    wall(W-.08,y,.08,W,cut,14.47,shell,'gallery');
    wall(XV,y,14.39,W-.08,cut,14.47,shell,'gallery');
    for(let c=1.2;c<14;c+=1.2)r.line([XV+.1,y+.006,c],[W-.1,y+.006,c],'#a9a9a9',.5,'gallery');
    // Hold'em game zone: two casino-style tables (racetrack shape about 2.8 x 1.4 m, padded rail, green felt,
    // dealer at the middle of the east long side, 9 seats around the rest).
    for(const gs of [4.6,10.2])pokerTable(20.6,gs);
    r.box(21.3,y,.5,23.7,y+1.0,1.1,teal,steel,'gallery');                                 // chip and sign-in desk
    // South: landing, lift and the stair down.
    slab(XA,SS,W,D);
    rail([XA,SS],[XM,SS],y,'shared');
    wall(XA,y,D-.08,XE0,cut,D);wall(XE1,y,D-.08,W-.08,cut,D);
    wall(W-.08,y,SS,W,cut,D);
    wall(XM,y,SS,12.6,cut,SS+.08);wall(13.6,y,SS,XE0,cut,SS+.08);wall(XE1,y,SS,W-.08,cut,SS+.08);
    wall(XE0,y,SS,XE1,cut,D,dark);
    stairDown('x',15.5,16.5,19.0,23.0,y+.012);
    return {rooms:r.at(2*CW+1.2,cut,9.6),interview:r.at(3*CW+1.2,cut,13.6),gallery:r.at(22.6,y+.9,7.4),facility:r.at(1.9,cut,N1),shared:r.at(15.55,cut,15.85)};
  }
}
