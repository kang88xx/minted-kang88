function makeVenueRenderer(canvas) {
  // World axes are x east, y north and z up. Angles use degrees, zoom 1 fits the site.
  const gl = canvas.getContext('webgl', {antialias:true, alpha:true, preserveDrawingBuffer:true});
  const ctx = gl ? null : canvas.getContext('2d');
  const colorCtx = document.createElement('canvas').getContext('2d');
  const colors = new Map(), signs = new Map();
  let shapes = [], angle = 32, elevation = 22, zoom = 1, frame, hits = [];
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
  function rect(points,fill,shade,group,image) { shapes.push({points,color:rgba(fill,shade),group,image}); }
  function line(a,b,color='#686868',width=1,group) { shapes.push({points:[a,b],color:rgba(color),width,group}); }
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
      const c=img.getContext('2d'); const led=tone==='led'||lines[0]==='PAPER', banner=tone==='banner'||lines[0]==='AGENTIC', dark=tone==='dark'||lines.join('')==='KUNSTHALLE'; c.fillStyle=dark?'#383838':led?'#515151':banner?'#e8e8e8':'#fafafa'; c.fillRect(0,0,img.width,img.height);
      const face=' system-ui, sans-serif'; c.font='700 100px'+face;
      const widest=Math.max(1,...lines.map(t=>c.measureText(t).width));
      const size=Math.min(100*img.width*.88/widest,img.height*.8/Math.max(1,lines.length));
      c.font='700 '+size+'px'+face; c.textAlign='center'; c.textBaseline='middle'; c.fillStyle='#232323';
      lines.forEach((s,i)=>{c.fillStyle=dark?'#fafafa':led?'#d6d6d6':banner&&i===1?'#656565':'#3a3a3a';c.fillText(s,img.width/2,img.height/2+(i-(lines.length-1)/2)*size*1.05)});
      if(led){c.fillStyle='#3a3a3a59';for(let x=0;x<img.width;x+=7)c.fillRect(x,0,1,img.height);for(let y=0;y<img.height;y+=7)c.fillRect(0,y,img.width,1)}
      signs.set(key,{img});
    }
    rect([[x,y,z+h],[x+w,y,z+h],[x+w,y,z],[x,y,z]],'#ffffff',1,group,signs.get(key));
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
    for(const x of [-12.19,12.19])for(const y of [-8.535,8.535])for(const z of [0,0.1])include([x,y,z]);
    shapes.forEach(s=>s.points.forEach(include));
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
    const projected=shapes.map(s=>({...s,p:s.points.map(project)}));
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
  return {setScene(build){shapes=[];build({box,line,sign,quad});frame=null;draw();},
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
    sign(x0,h0,s,w,h,text,group,tone){m.sign(X(x0),Y(s),h0,w,h,text,group,tone)},
    at:(x,h,s)=>[X(x),Y(s),h]
  };
}

// Banner and sign positions from the venue's signage guide (width x height in metres).
const SIGNS={right:[11.82,5.68],topLeft:[9.70,2.80],door:[2.40,0.52],hallWide:[6.30,2.38],hallTall:[2.43,5.54]};
const EVENT_NAME=['AGENTIC','ONCHAIN','TRADING CONTEST'];
const STREET_DOOR={x0:10.1,x1:11.85,height:2.3};
function drawStreetEntrance(r,group){
  const {x0,x1,height:h}=STREET_DOOR, s=KH.D, leaf=(x1-x0-.24)/2, mid=(x0+x1)/2, [sw,sh]=SIGNS.door;
  for(const x of [x0,x1-.12])r.box(x,0,s-.15,x+.12,h,s+.13,'#424242','#303030',group);
  r.box(mid-sw/2,h,s-.15,mid+sw/2,h+sh,s+.36,'#3b3b3b','#303030',group);            // replaceable sign box over the door
  r.sign(mid-sw/2+.035,h+.03,s+.37,sw-.07,sh-.055,['AGENTIC ONCHAIN TRADING CONTEST'],group,'dark');
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
  const tones=['#5d5d5d','#696969','#656565','#5f5f5f','#666666','#6c6c6c','#696969','#636363','#5e5e5e','#636363','#616161','#595959'];
  for(let k=0;k<3;k++)for(let i=0;i<4;i++){
    const x0=i*CW+.185,x1=(i+1)*CW-.185,h0=F[k]+.3,h1=F[k]+2.6;
    r.box(x0,h0,D+.07,x1,h1,D+.11,tones[k*4+i],post,'signage');
    if(k===1)continue;
    for(let n=1;n<10;n++){const x=x0+n*(x1-x0)/10;r.line([x,h0+.05,D+.125],[x,h1-.05,D+.125],'#8a8a8a',.32,'signage')}
    for(let n=1;n<11;n++){const h=h0+n*(h1-h0)/11;r.line([x0+.05,h,D+.125],[x1-.05,h,D+.125],'#8e8e8e',.34,'signage')}
  }
  // Example content on the 2F windows; the mullions stay in front of it.
  r.sign(.185,F[1]+.3,D+.12,XA-.37,2.3,['PAPER','TRADING'],'signage');
  for(let i=1;i<4;i++)r.box(i*CW-.185,F[1]+.3,D+.07,i*CW+.185,F[1]+2.6,D+.14,post,post,'signage');
  // The venue's vertical name sign on the west corner.
  r.box(-.62,4.9,D-.05,-.05,8.6,D+.2,post,post,'exterior');
  r.sign(-.57,5.0,D+.21,.47,3.5,'KUNSTHALLE'.split(''),'exterior');

  // Entrance bay (2.43 m): glazed door bay on 1F, one window on 2F, container wall above.
  r.box(XA,0,D+.02,XM,F[1]-.1,D+.06,glass,post,'entrance');
  drawStreetEntrance(r,'entrance');
  r.box(XA+.2,F[1]+.3,D+.02,XM-.2,F[2]-.3,D+.07,'#6f6f6f',post,'exterior');
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
  r.sign(bx+.25,bz+.25,D+.17,bw-.5,bh-.5,EVENT_NAME,'banner');
  // Upper-left banner area: 4F, above the LED windows.
  const [tw,th]=SIGNS.topLeft, tx=(XA-tw)/2, tz=F[3]+(T-F[3]-th)/2;
  r.box(tx,tz,D+.09,tx+tw,tz+th,D+.16,'#c8c8c8',post,'topbanner');
  r.sign(tx+.2,tz+.2,D+.17,tw-.4,th-.4,['AGENTIC ONCHAIN','TRADING CONTEST'],'topbanner','banner');
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
  return {exterior:r.at(13.4,T+.8,8.6),banner:r.at(bx+bw/2,bz+bh,D),topbanner:r.at(tx+tw/2,tz+th,D),
    signage:r.at(4.88,F[2]+1.45,D),entrance:r.at(10.975,1.5,D)};
}

// floor 1 cuts the camera-side walls 1.2 m above the ground floor. floor 2 draws the 2F plates
// alone, cut 1.2 m above the slab, over a solid hatched base that stands for the open hall below.
function buildInterior(m,floor=1) {
  const r=real(m), {W,D,CW,XA,XM,XG,XE0,XE1,N1,N2,S20,SB,SS,F}=KH;
  const dark='#363636', steel='#5c5c5c', pale='#e2e2e2', timber='#a0a0a0', sage='#b6b6b6', teal='#646464', amber='#b0b0b0';
  const shell='#4d4d4d', glass='#a9a9a9', deck='#c4c4c4';
  const CUT=1.2, SH=.45;
  const wall=(x0,h0,s0,x1,h1,s1,color=shell,group='shared')=>r.box(x0,h0,s0,x1,h1,s1,color,steel,group);
  function chair(x,h,s,back,group){
    r.box(x,h,s,x+.42,h+.45,s+.42,'#b1b1b1',steel,group);
    const b={'-x':[x,s,x+.05,s+.42],'+x':[x+.37,s,x+.42,s+.42],'+s':[x,s+.37,x+.42,s+.42]}[back];
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
  // The venue's fixed 10 x 5 m LED screen on the east wall, drawn from height `from` up.
  function screen(from){
    r.box(24.0,Math.max(from,.35),3.535,24.2,5.35,13.535,dark,steel,'stage');
    r.box(23.96,Math.max(from,.47),3.66,24.0,5.23,13.41,teal,dark,'stage');
    for(let i=0;i<9;i++){const s=4.3+i*1.06;r.line([23.945,Math.max(from,.8),s],[23.945,4.9,s],'#878787',.45,'stage')}
  }
  // Indoor banner positions from the venue's signage guide.
  function hallBanners(tall=true){
    const [ww,wh]=SIGNS.hallWide, [tw,th]=SIGNS.hallTall, h0=F[1]+(F[2]-F[1]-wh)/2;
    // Wide: opposite the main entrance, on the 2F container above the north garage door.
    r.box(XM,h0,N1,XM+ww,h0+wh,N1+.05,'#c8c8c8',steel,'hangwide');
    r.sign(XM+.15,h0+.15,N1+.06,ww-.3,wh-.3,EVENT_NAME,'hangwide');
    if(!tall)return;
    // Tall: right of the LED screen, on the north face of the lift shaft. Outline only, so it does not hide the hall.
    const x0=(XE0+XE1-tw)/2,x1=x0+tw,s=SS-.03,b=.15,t=b+th;
    for(const [p,q] of [[[x0,b,s],[x0,t,s]],[[x1,b,s],[x1,t,s]],[[x0,t,s],[x1,t,s]],[[x0,b,s],[x1,b,s]]])r.line(p,q,dark,1.6,'hangtall');
    for(let h=b+th/4;h<t-.1;h+=th/4)r.line([x0,h,s],[x1,h,s],steel,.7,'hangtall');
  }
  if(floor===2)return upperFloor();

  // ---- 1F shell ----
  wall(0,-.2,0,W,0,D,'#cdcdcd');
  wall(0,0,0,XM,F[1],N1);                                    // kitchen, toilet and inner stair container
  wall(0,0,N1,.6,F[1],N2);                                   // electrical room
  wall(XG,0,0,W,F[1],N1);                                    // storage, outside the rental area
  wall(XM,0,0,XG,F[1],.06,glass);                            // north garage door
  for(let n=1;n<6;n++){
    const h=n*F[1]/6,x=XM+n*(XG-XM)/6;
    r.line([XM,h,.075],[XG,h,.075],steel,.8,'shared');r.line([x,0,.075],[x,F[1],.075],steel,.8,'shared');
  }
  wall(W-.08,0,N1,W,F[2],SS);                                // east container wall behind the screen
  wall(XM,F[1],0,W,F[2],N1);                                 // 2F container over the north garage door
  wall(XM-.12,0,N2-.12,XM+.12,F[1],N2+.12,dark);             // the one free-standing column
  // West garage door, drawn as an open frame so it does not hide the hall.
  wall(0,0,N2,.06,.08,S20,dark);
  for(let n=0;n<=5;n++){const s=N2+n*(S20-N2)/5;r.line([.03,0,s],[.03,CUT,s],steel,1.2,'shared')}
  for(let h=.4;h<=CUT+.01;h+=.4)r.line([.03,h,N2],[.03,h,S20],steel,.8,'shared');
  stair('s',.15,1.25,10.6,6.1,0,F[1],'shared');              // up to the 2F balcony
  wall(0,0,S20,.08,CUT,11.3);wall(0,0,13.1,.08,CUT,SB);      // west wall with the staff door
  r.box(0,0,11.3,.05,CUT,13.1,'#8f8f8f','#4b4b4b','shared');
  for(let i=0;i<=4;i++){const x=Math.min(i*CW,XA-.08);wall(x,0,SB,x+.08,CUT,D-.08)}   // four street-side bays
  wall(0,0,D-.08,XA,CUT,D,dark);                             // LED window wall
  // Glazed entrance vestibule, lift and the storage container with the main stair.
  const {x0:dx0,x1:dx1}=STREET_DOOR;
  for(const [x0,s0,x1,s1] of [[XA,D-.06,dx0,D],[dx1,D-.06,XM,D],[XA,SS,dx0,SS+.06],[dx1,SS,XE0,SS+.06],[XM-.03,SS+.06,XM+.03,D-.06]])
    r.box(x0,0,s0,x1,CUT,s1,glass,steel,'gate');
  wall(XM+.03,0,D-.08,XE0,CUT,D);                            // container wall east of the entrance bay
  drawStreetEntrance(r,'gate');
  wall(XE0,0,SS,XE1,CUT,D,dark);
  wall(XE1,0,SS,W,CUT,D);
  hallBanners();

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
  // Stage in front of the LED screen.
  r.box(20.4,0,3.2,23.95,SH,13.9,dark,steel,'stage');
  for(let j=1;j<=2;j++)r.box(20.4-.3*j,0,7.75,20.4-.3*(j-1),SH-.15*j,9.35,pale,steel,'stage');
  screen(0);
  const trend=[0,.52,.34,.92,.64,1.04,.88,1.37,1.6];
  for(let i=0;i<8;i++){const s=4.3+i*1.06;r.line([23.94,1.7+trend[i]*1.5,s],[23.94,1.7+trend[i+1]*1.5,s+1.06],'#e0e0e0',2,'stage')}
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
  for(let i=0;i<7;i++)for(const block of [3.8,9.3])for(let j=0;j<8;j++)chair(12.6+i*.9,0,block+j*.5+.04,'-x','seats');   // 8 x 7 x 2 = 112
  // Control desk on a low riser behind the seating.
  r.box(9.9,0,6.95,11.7,.3,10.15,dark,steel,'tech');
  r.box(10.9,1.02,7.2,11.5,1.06,9.9,pale,steel,'tech');
  r.box(11.46,.3,7.2,11.5,1.02,9.9,pale,steel,'tech');
  for(let k=0;k<3;k++){const s=7.4+k*.85;r.box(11.28,1.16,s,11.32,1.5,s+.6,dark,steel,'tech')}
  for(const s of [7.5,8.35,9.2])chair(10.2,.3,s,'-x','tech');
  tripod(11.0,0,6.2,'tech');
  // Check-in at the bay next to the entrance; partner booths 1-3 in the other three bays.
  r.box(7.5,0,13.7,9.55,1.05,14.25,sage,steel,'gate');
  r.sign(7.7,.3,14.26,1.65,.44,[korean ? '등록' : 'CHECK-IN'],'gate');
  for(let i=0;i<3;i++){
    const x=i*CW;
    r.box(x+.12,0,14.1,x+2.4,.02,D-.12,sage,'none','booth');
    r.box(x+.3,0,14.5,x+1.5,1.0,15.0,i%2?teal:steel,dark,'booth');
    for(const bx of [x+.3,x+1.3])r.box(bx,0,16.55,bx+.8,1.9,16.61,pale,steel,'booth');
  }
  return {stage:r.at(23.95,3.9,8.5),players:r.at(21.5,SH+1.05,5.7),seats:r.at(15.5,.9,8.55),tech:r.at(10.8,1.45,8.55),
    booth:r.at(3.66,1.1,14.75),gate:r.at(8.5,1.15,13.98),buffet:r.at(4.6,1.25,4.68),shared:r.at(.03,1.3,7.9),
    hangwide:r.at(XM+SIGNS.hallWide[0]/2,F[1]+.25+SIGNS.hallWide[1],N1),hangtall:r.at((XE0+XE1)/2,.15+SIGNS.hallTall[1],SS)};

  function upperFloor(){
    const y=F[1], cut=y+CUT, slab=(x0,s0,x1,s1,group='shared')=>r.box(x0,y-.14,s0,x1,y,s1,deck,steel,group);
    // Solid base in place of the ground floor. Where no 2F plate covers it, the hatching marks the void over the hall.
    wall(0,y-.5,0,W,y-.14,D,'#a6a6a6');
    for(let c=-D+.4;c<W;c+=.7){
      const a=c>=0?[c,y-.132,0]:[0,y-.132,-c], b=c+D<=W?[c+D,y-.132,D]:[W,y-.132,W-c];
      r.line(a,b,'#8c8c8c',.5,'shared');
    }
    for(let s=6.3;s<9.9;s+=.28)r.line([.15,y-.13,s],[1.25,y-.13,s],dark,.9,'shared');   // stair down to the hall
    wall(W-.08,y-.5,N1,W,F[2],SS);                             // east container wall
    screen(y-.14);                                             // top half of the LED screen, for orientation
    wall(XM-.12,y-.14,N2-.12,XM+.12,cut,N2+.12,dark);
    for(let n=0;n<=5;n++){const s=N2+n*(S20-N2)/5;r.line([.03,y-.14,s],[.03,cut,s],steel,1.2,'shared')}   // west garage door, upper half
    for(let h=y+.4;h<=cut+.01;h+=.4)r.line([.03,h,N2],[.03,h,S20],steel,.8,'shared');
    // North gallery room: VIP lounge behind the LED glass that faces the hall.
    slab(0,0,XM,N2,'vip');
    wall(0,y,0,XM,F[2],.08);
    wall(0,y,.08,.08,cut,N2-.08);
    wall(XM-.08,y,N1,XM,cut,N2-.12);
    wall(0,y,N2-.08,.7,cut,N2);wall(2.3,y,N2-.08,2.6,cut,N2);
    r.box(2.6,y,N2-.06,XM-.12,cut,N2,glass,steel,'vip');
    for(let n=1;n<5;n++){const x=2.6+n*(XM-.12-2.6)/5;r.line([x,y,N2+.015],[x,cut,N2+.015],steel,1,'vip')}
    stair('x',.25,1.15,10.3,6.5,y,F[2],'shared',cut);
    for(const x of [3.2,6.0,8.8]){
      r.box(x,y,3.2,x+1.8,y+.42,4.0,sage,steel,'vip');
      r.box(x,y+.42,3.2,x+1.8,y+.8,3.4,sage,steel,'vip');
      r.box(x+.5,y,4.2,x+1.3,y+.38,4.62,timber,steel,'vip');
    }
    r.box(1.0,y,1.6,2.6,y+1.1,2.15,teal,steel,'vip');
    wall(XM,y-.14,0,W,F[2],N1);                                // women's toilet container
    hallBanners(false);
    // West balcony around the stair, with the second camera.
    slab(0,N2,3.55,6.1,'rail');slab(2.5,6.1,3.55,9.95,'rail');slab(0,9.95,XA,S20,'rail');
    for(const [a,b] of [[[3.55,N2],[3.55,9.95]],[[3.55,9.95],[XA,9.95]],[[2.5,6.1],[2.5,9.95]],[[1.25,6.1],[2.5,6.1]],[[.1,9.95],[2.5,9.95]],[[XA,9.95],[XA,SS]],[[XA,SS],[XE0,SS]]])
      rail(a,b,y,'rail');
    tripod(3.02,y,7.4,'rail');
    // South-west gallery room: partner booths 4-6.
    slab(0,S20,7.32,D,'booth');
    wall(0,y,S20,1.0,cut,S20+.08);wall(1.9,y,S20,7.32,cut,S20+.08);
    wall(0,y,S20+.08,.08,cut,D-.08);
    wall(7.24,y,S20+.08,7.32,cut,14.7);wall(7.24,y,16.3,7.32,cut,D-.08);
    wall(0,y,D-.08,XA,cut,D,dark);
    for(let i=0;i<3;i++){
      const x=.45+i*2.3;
      r.box(x-.2,y,11.5,x+1.9,y+.02,13.9,sage,'none','booth');
      r.box(x,y,12.4,x+1.2,y+1.0,12.9,i%2?teal:steel,dark,'booth');
      for(const bx of [x-.1,x+.9])r.box(bx,y,13.6,bx+.8,y+1.9,13.66,pale,steel,'booth');
    }
    // Corridor and the south walkway: commentary desk, lift and the stair up.
    slab(7.32,S20,XA,D);slab(XA,SS,W,D);
    wall(XA,y,D-.08,XE0,cut,D);wall(XE1,y,D-.08,W-.08,cut,D);
    wall(W-.08,y,SS,W,cut,D);
    wall(XE0,y-.14,SS,XE1,cut,D,dark);
    r.box(XE1,y,SS,W-.08,cut,SS+.05,glass,steel,'shared');
    stair('x',15.5,16.5,19.0,23.0,y,F[2],'shared',cut);
    r.box(12.4,y+.72,14.8,14.2,y+.76,15.4,pale,steel,'cast');
    r.box(12.4,y,14.8,14.2,y+.72,14.84,pale,steel,'cast');
    for(const x of [12.65,13.45])r.box(x,y+.86,14.95,x+.5,y+1.18,14.99,dark,steel,'cast');
    for(const x of [12.7,13.5])chair(x,y,15.55,'+s','cast');
    return {booth:r.at(3.35,y+1.1,12.65),vip:r.at(6.9,y+.9,3.5),cast:r.at(13.3,y+1.0,15.1),rail:r.at(3.55,y+1.1,7.4),shared:r.at(15.55,cut,15.85),
      hangwide:r.at(XM+SIGNS.hallWide[0]/2,y+.25+SIGNS.hallWide[1],N1)};
  }
}
