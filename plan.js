'use strict';
const korean = document.documentElement.lang === 'ko';
const t = (en, ko) => korean ? ko : en;
const views = [
  {id:'outside', title:t('Exterior view','외관 입체도'), areaTitle:t('Exterior zones','외관 구역'), angle:-32, elevation:15,
   zones:['exterior','banner','topbanner','signage','entrance']},
  {id:'inside', title:t('Interior cutaway','내부 절개 투시도'), areaTitle:t('Interior zones','내부 구역'), angle:-32, elevation:35,
   zones:['stage','players','seats','tech','booth','gate','buffet','hangwide','hangtall','vip','cast','rail','rooms','gallery','facility','shared']}
];
// Floors each interior zone is drawn on. Zones not listed here appear on every floor.
const zoneFloors = {stage:[1], players:[1], seats:[1], tech:[1], gate:[1], buffet:[1], hangtall:[1], booth:[1,2], hangwide:[1,2],
  vip:[2], cast:[2], rail:[2], rooms:[3], gallery:[3]};
// Sizes of banner, sign and LED positions, shown with the zone name on the drawing.
const specs = {banner:'11,820 × 5,680 mm', topbanner:'9,700 × 2,800 mm', signage:'약 2,070 × 2,300 mm × 12면', entrance:'사인 2,400 × 520 mm',
  stage:'LED 10,000 × 5,000 mm', hangwide:'6,300 × 2,380 mm', hangtall:'2,430 × 5,540 mm'};
// Amounts exclude VAT. Zones without a set amount show a dash.
const costs = {
  exterior:[t('KRW 30,000,000','30,000,000원'),t('venue hire and LED screen, 19–20 December, excl. VAT','대관·LED, 12월 19–20일, 부가세 별도')],
  banner:[t('approx. KRW 1,500,000','약 1,500,000원'),t('print and high-level installation, estimate','출력·고소 설치, 추정')],
  topbanner:['약 600,000원','선택 · 출력·고소 설치, 추정'],
  hangwide:['약 250,000원','선택 · 출력·설치, 추정'],
  hangtall:['약 250,000원','선택 · 출력·설치, 추정'],
  players:[t('approx. KRW 1,000,000','약 1,000,000원'),t('10 PC sets, estimate','PC 10세트, 추정')],
  seats:[t('approx. KRW 44,000','약 44,000원'),t('11 rented chairs, estimate','추가 임대 11석, 나머지는 대관처 보유 의자, 추정')],
  booth:[t('approx. KRW 480,000','약 480,000원'),t('12 banners, estimate','배너 12개, 추정')],
  gate:[t('approx. KRW 1,070,000','약 1,070,000원'),t('hosts, wristbands, draw tickets and badges, estimate','안내 스태프·팔찌·추첨권·명찰, 추정')],
  buffet:[t('KRW 6,250,000','6,250,000원'),t('250 × KRW 25,000, unconfirmed, excl. VAT and delivery','250인분 × 25,000원, 확정 아님, 부가세·출장비 별도')]
};
const floorStart = {1:'stage', 2:'vip', 3:'rooms'};
const zones = {
  exterior:[t('Building & venue','건물·대관'),t('48 hours','48시간'),
    t('The building is 24.38 m wide and 17.07 m deep: shipping containers stacked on four floors around an atrium. The 48-hour hire on 19–20 December covers setup, both event days and teardown. Equipment loads in through the two-storey garage door on the west side. The seating plan still requires venue confirmation.','정면 24.38 m, 깊이 17.07 m 규모로, 아트리움 둘레에 컨테이너를 4개 층으로 쌓은 건물입니다. 12월 19–20일 48시간 대관 안에 설치, 이틀 행사, 철거를 모두 진행합니다. 장비는 서쪽 면의 2개 층 높이 개러지 도어로 반입합니다. 좌석 배치는 대관처 확인이 필요합니다.')],
  banner:['우측 중앙 현수막','11,820 × 5,680 mm',
    '정면 오른쪽 컨테이너 벽의 2–3층에 거는 현수막 자리로, 대관처 규격은 가로 11,820 × 세로 5,680 mm입니다. 대관처가 피스·나사 시공을 허용하지 않으므로 고정 방식과 게시 기간은 대관처와 협의합니다.'],
  topbanner:['좌측 상단 현수막','9,700 × 2,800 mm',
    'LED 창 위, 4층 높이의 현수막 자리입니다. 대관처 규격은 가로 9,700 × 세로 2,800 mm입니다. 사용 여부는 선택이며, 우측 중앙 현수막과 함께 설치하면 고소 작업을 한 번에 끝낼 수 있습니다.'],
  signage:['외벽 LED','약 2,070 × 2,300 mm × 12면',
    '정면 왼쪽에 4열 × 3단으로 LED 창 12개가 있고, 창 하나는 약 2,070 × 2,300 mm입니다. 대관 시 무료로 쓰는 외부 컬러 LED 면으로 영상과 이미지를 송출할 수 있으며, 구현 방법은 계약 후 대관처가 메일로 안내합니다. 가운데 단의 글자는 송출 예시입니다.'],
  entrance:['관객 출입구','안내 3명',
    'LED 창 오른쪽 쌍문으로 들어서면 유리 전실을 지나 홀 안쪽 등록대로 이어집니다. 문 위 사인은 교체할 수 있고 규격은 외측 2,400 × 520 mm, 내측 2,330 × 465 mm입니다. 등록대와 같은 안내 스태프 3명이 티켓을 확인하고 입장 팔찌를 채웁니다. 대관 시 무료 주차는 3대입니다. 차량 통제는 협의 중입니다.'],
  stage:[t('Main stage','메인 무대'),t('1 host','MC 1명'),
    t('The stage sits in front of the venue\'s fixed 10 × 5 m LED screen on the east wall. It is 3.55 m deep, 10.70 m wide and 0.45 m high. The host introduces each round and presents the awards, and the screen shows the live standings. Lighting stands on a ground-supported truss because the 3rd-floor gallery covers the stage at 5.78 m. The venue\'s free house stage is 6 × 2 m, so this size needs extra staging, and stage LED lighting is a paid venue option.','동쪽 벽에 고정된 10 × 5 m LED 스크린 앞에 무대를 둡니다. 무대는 깊이 3.55 m, 폭 10.70 m, 높이 0.45 m입니다. MC가 경기를 소개하고 시상을 진행하며, 스크린에는 실시간 순위가 표시됩니다. 무대 위 5.78 m 높이를 3층 갤러리가 덮고 있어 조명은 지상 지지식 트러스에 답니다. 대관처 기본 무대는 6,000 × 2,000 × 500 mm(계단 2개)라 이 크기는 추가 임대가 필요하고, 무대용 LED 조명은 대관처 별도 옵션입니다. 스크린 위 3층 갤러리 유리는 간단한 문자를 띄우는 흑백 LED 글라스입니다.')],
  players:[t('Competitor desks','선수 데스크'),t('8 finalists · 2 officials','선수 8명 · 운영 2명'),
    t('Eight desks stand in one line along the screen, in two groups of four, facing the audience with the screen behind them. Two officials oversee the match. The desks hide roughly the bottom 1.3 m of the screen, so on-screen graphics should sit above that. Allow room for capture equipment and test the two spare PC sets during rehearsal.','무대 위에 선수 데스크 8개를 스크린을 따라 한 줄로, 4개씩 두 묶음으로 놓습니다. 선수는 스크린을 등지고 관객을 봅니다. 심판·경기 진행 인력 2명을 배치합니다. 데스크가 스크린 아래쪽 1.3 m가량을 가리므로 화면 구성은 그 위쪽에 맞춥니다. 화면 캡처 장비와 예비 PC 2세트를 준비하고 리허설에서 점검합니다.')],
  seats:[t('Audience seating','관객석'),t('112 seats · 10 crew planned','관람 112석 · 운영안 10명'),
    t('Two blocks of seven rows by eight chairs face the stage, with a centre aisle between them. The rear rows sit under the open atrium. The plan is for 500 guests, so most stand: in the lounge behind the seating and at the 2nd-floor railings. About 100 of the chairs can be the venue\'s free house chairs. Confirm aisles, accessible seating, exits and equipment clearances before fixing capacity.','무대를 향해 8석 × 7열 두 블록, 의자 112석을 배치한 제안입니다. 두 블록 사이에 가운데 통로를 두었고 뒤쪽 열은 아트리움 아래에 놓입니다. 계획 인원이 500명이라 대부분은 서서 봅니다. 객석 뒤 라운지와 2층 난간을 씁니다. 의자는 대관처 보유분 114개(접이식 50개 포함)를 먼저 쓰고 모자라는 만큼만 빌립니다. 통로, 휠체어석, 출입구와 장비 간격을 반영한 정원은 대관처와 확인합니다.')],
  tech:[t('Broadcast desk','기술·중계석'),t('1 broadcast lead','중계 담당 1명'),
    t('The control desk sits on a low riser behind the seating, on the centre line of the screen. One lead operates the competition feed and prepares screen content. The technical crew supports cameras, capture, switching and the single-channel stream. A second camera stands on the 2nd-floor balcony. House sound and four wireless microphones come free with the hire.','객석 뒤, 스크린 중심선 위의 낮은 단에 운영 콘솔을 둡니다. 담당자 1명이 전광판 화면과 대회 중계를 운영합니다. 기술 보조가 카메라·캡처·스위칭과 단일 채널 송출을 지원합니다. 두 번째 카메라는 2층 발코니에 둡니다. 기본 음향과 무선 마이크 4대는 대관 시 무료입니다.')],
  booth:[t('Partner booths','파트너 부스'),t('6 booths · 3 shared crew','부스 6곳 · 공용 인력 3명'),
    t('Booths 1–3 use three of the four street-side bays on the ground floor, next to check-in. Booths 4–6 use the south-west gallery room on the 2nd floor. Each booth has a table and two banners. Plan for two shared staff, one lobby guard and one partner representative per booth. Confirm the booth layout with the venue.','부스 1–3은 1층 가로 쪽 전시 칸 네 곳 중 등록대 옆 세 곳에, 부스 4–6은 2층 남서 전시실에 둡니다. 부스마다 테이블 1개와 배너 2개를 놓으며, 테이블은 대관처 행사 테이블(1,500 × 700 mm, 20개 보유)을 씁니다. 공용 운영 2명, 로비 경호 1명, 각 부스 후원사 담당자 1명을 가정합니다. 부스 배치는 대관처와 협의합니다.')],
  gate:[t('Check-in','등록·입장'),t('3 hosts','안내 3명'),
    t('The check-in desk stands at the street-side bay next to the entrance vestibule. The entrance team checks tickets, fits entry wristbands and hands out prize-draw tickets and guest packs there. Wristbands and draw tickets are ordered for 600: 500 guests plus a reserve of 100. These are the same staff shown at the exterior entrance.','출입구 전실 바로 옆 전시 칸 앞에 등록대를 둡니다. 안내 스태프 3명이 이곳에서 티켓 확인, 입장 팔찌 착용, 추첨권·굿즈 배부를 맡습니다. 팔찌와 추첨권은 관객 500명에 예비 100명을 더해 600개를 준비합니다. 외관에 표시된 관객 출입구와 같은 인력입니다.')],
  buffet:[t('Bar & catering','바·케이터링'),t('250 guests','케이터링 250인분'),
    t('Catering for 250 guests is planned with Deho Catering at KRW 25,000 per person, not yet confirmed. It is served from the venue\'s existing bar counters on the north side of the hall, in front of the kitchen. Guests eat standing at the lounge tables behind the seating. Keep the aisles and exits clear as guests collect food. Confirm catering access, hot holding, power and staffing with the venue and caterer.','드호 케이터링에 250인분을 1인 25,000원 기준으로 주문할 예정이며, 확정 전입니다. 홀 북쪽 주방 앞의 기존 바 카운터를 배식대로 씁니다. 관객은 객석 뒤 라운지의 스탠딩 테이블에서 식사합니다. 음식 수령 후 통로와 출입문을 비웁니다. 음식 반입, 온장, 전력과 인력은 대관처·업체와 협의합니다.')],
  hangwide:['실내 가로 현수막','6,300 × 2,380 mm',
    '정문으로 들어서면 정면에 보이는 자리로, 북쪽 개러지 도어 위 2층 컨테이너 면입니다. 대관처 규격은 가로 6,300 × 세로 2,380 mm이며 사용 여부는 선택입니다.'],
  hangtall:['실내 세로 현수막','2,430 × 5,540 mm',
    'LED 스크린 오른쪽, 승강기 쪽 컨테이너 면에 2개 층 높이로 거는 자리입니다. 대관처 규격은 가로 2,430 × 세로 5,540 mm이며 사용 여부는 선택입니다. 홀을 가리지 않도록 도면에는 테두리만 그렸습니다.'],
  rooms:['선수 대기실','3층 A룸 · B룸',
    '3층 컨테이너 A룸과 B룸을 선수 8명의 대기실로 씁니다. 방 하나는 폭 2.44 m, 길이 약 12 m이고 북쪽 복도 쪽 문으로 드나듭니다. 무대까지는 북쪽 내부 계단이나 승강기로 내려갑니다. 서쪽 두 칸은 대관 제외 공간입니다.'],
  gallery:['3층 갤러리','기본 대관 제외',
    '무대 위쪽의 3층 갤러리는 기본 대관에 들어 있지 않고, 별도 협의 후 대관할 수 있습니다. 이 계획에서는 쓰지 않습니다. 홀 쪽 유리는 간단한 문자를 띄우는 흑백 LED 글라스입니다.'],
  facility:['화장실 · 승강기 · 계단','1층 남 · 2층 여 · 3층 2칸',
    '화장실은 층마다 북쪽에 있습니다. 1층은 남자 화장실로, 주방 옆 컨테이너의 동쪽 끝 문으로 들어갑니다. 2층은 여자 화장실로, 북쪽 전시실 동쪽 끝 문을 지나야 합니다. 3층은 북서쪽 모서리에 2칸이 있습니다. 승강기는 남쪽 가로변 가운데에 있습니다. 북쪽 내부 계단이 1–3층을 잇고, 서쪽 계단은 1층 홀에서 2층 발코니로 올라갑니다.'],
  vip:[t('VIP lounge','VIP 라운지'),t('2F · 12.19 × 4.88 m','2층 · 12.19 × 4.88 m'),
    t('The north gallery room on the 2nd floor looks down on the stage through its LED glass wall, so it serves as the VIP lounge. The seating shown is a proposal.','2층 북쪽 전시실은 LED 유리벽 너머로 무대가 내려다보여 VIP 라운지로 씁니다. 이 유리벽은 홀 쪽으로 간단한 문자를 띄우는 흑백 LED 글라스입니다. 여자 화장실 문이 이 방 동쪽 끝에 있어, 화장실로 가는 통로를 비워 두어야 합니다. 표시한 좌석은 제안 배치입니다.')],
  cast:[t('Commentary desk','해설석'),t('2F · 2 seats','2층 · 2석'),
    t('Two commentators sit on the 2nd-floor south walkway, overlooking the hall and the screen. The 3rd-floor railing was ruled out because the gallery floor hides the top of the screen from there.','홀과 스크린이 내려다보이는 2층 남쪽 통로에 해설석 2석을 둡니다. 3층 난간에서는 갤러리 바닥에 가려 스크린 위쪽이 보이지 않아 2층을 골랐습니다.')],
  rail:[t('Balcony & standing rail','발코니·스탠딩 관람'),t('2F · balcony camera','2층 · 발코니 카메라'),
    t('Standing guests can watch from the west balcony and the walkway railings on the 2nd floor. A camera on the balcony covers the stage and the audience. Confirm with the venue how many people the balcony may hold.','서서 보는 관객은 2층 서쪽 발코니와 통로 난간에서 관람할 수 있습니다. 발코니의 카메라가 무대와 객석을 잡습니다. 발코니 허용 인원은 대관처와 확인합니다.')],
  shared:[t('Venue operations','공통 운영·시설'),t('4 crew planned','운영안 4명'),
    t('Four roles cover production management, show calling, floor supervision, and emergency and accessibility support. The host team coordinates safety, logistics, cleaning and supplies. Equipment comes in through the west garage door, and the north garage door stays clear as the emergency route. After the event the host team removes all installations, cleans and restores the venue, using waste bags bought separately.','총괄 PM, 큐콜, 현장 감독, 응급·접근성 지원을 각 1명이 맡습니다. 주최팀이 안전, 물류, 청소와 현장 소모품을 관리합니다. 장비는 서쪽 개러지 도어로 반입하고, 북쪽 개러지 도어는 비상 동선으로 비워 둡니다. 행사 후에는 설치물 제거와 청소까지 마쳐 원상 복구하며, 종량제·분리수거 봉투는 따로 구매합니다.')]
};
function element(tag, className, value) {
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==undefined)node.textContent=value;
  return node;
}
function mountView(view){
 const inside=view.id==='inside', plate=element('section','plate'), side=element('section','side');
 plate.dataset.view=side.dataset.view=view.id;
 const strip=element('div','strip'), scene=element('div','scene'), model=element('canvas'), pins=element('div','pins');
 strip.append(element('h2','',view.title));
 const floorButtons=[];
 if(inside){
   const aside=element('div','stripside'),switcher=element('div','floors');
   switcher.setAttribute('role','group');switcher.setAttribute('aria-label',t('Floor','층'));
   for(const level of [1,2,3]){
     const b=element('button','',t(level+'F',level+'층'));b.type='button';b.dataset.floor=level;
     b.setAttribute('aria-label',view.title+' · '+t('floor '+level,level+'층'));b.onclick=()=>showFloor(level,true);
     switcher.append(b);floorButtons.push(b);
   }
   const link=element('a','',t('Venue floor plan ↗','공식 도면 ↗'));
   link.href='https://www.sjkunsthalle.com/_files/ugd/f9390f_e8d3d3e585f7497288ba45912c586fef.pdf#page=3';
   link.target='_blank';link.rel='noopener';const note=element('small');note.append(link);aside.append(switcher,note);strip.append(aside);
 }
 const instructions=t('Drag to rotate · Select a numbered zone','드래그로 회전 · 번호로 구역 선택');
 model.setAttribute('aria-label',view.title+' · '+instructions);
 const tip=element('div','cost-tip'),tipTitle=element('span'),tipSpec=element('small'),tipValue=element('strong','','-');
 tip.setAttribute('aria-hidden','true');tip.append(tipTitle,tipSpec,tipValue);scene.append(model,pins,tip);
 const controls=element('div','controls'),tools=element('div','tools');controls.append(tools);plate.append(strip,scene,controls);
 document.querySelector('#plans').append(plate);
 const list=element('div','list'), detail=element('section','detail'), sideHead=element('div','sidehead');
 detail.setAttribute('aria-live','polite');sideHead.append(element('h2','',view.areaTitle));side.append(sideHead,list,detail);
 document.querySelector('#areas').append(side);
 const renderer=makeVenueRenderer(model);
 let anchors,floor=1;
 if(inside)renderer.setScene(m=>{anchors=buildInterior(m,floor)});
 else renderer.setScene(m=>{anchors=buildExterior(m)});
 let angle=view.angle,elevation=view.elevation,zoom=1,selected=view.zones[0],pending=0;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function place(){
   for(const pin of pins.children){
     pin.hidden=!anchors[pin.dataset.id];
     if(pin.hidden)continue;
     const {x,y}=renderer.project(anchors[pin.dataset.id]);
     pin.style.left=x+'px';pin.style.top=y+'px';
   }
   const {x,y}=renderer.project(anchors[selected]),w=tip.offsetWidth,h=tip.offsetHeight;
   tip.style.left=clamp(x-w/2,3,scene.clientWidth-w-3)+'px';
   tip.style.top=clamp(y-h-18>3?y-h-18:y+18,3,scene.clientHeight-h-3)+'px';
 }
 function draw(){renderer.setCamera(angle,elevation,zoom);place();}
 function queueDraw(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;draw()})}
 // Floor change: the old drawing sinks away while the new one comes in from above, or the reverse going down.
 const still=matchMedia('(prefers-reduced-motion: reduce)');
 function snapshot(){
   if(still.matches||!model.animate)return null;
   const ghost=element('canvas','ghost');ghost.width=model.width;ghost.height=model.height;
   ghost.getContext('2d').drawImage(model,0,0);return ghost;
 }
 function lift(ghost,up){
   if(!ghost)return;
   for(const old of scene.querySelectorAll('.ghost'))old.remove();
   scene.append(ghost);
   const shift=(up?1:-1)*36,timing={duration:480,easing:'cubic-bezier(.3,.7,.2,1)'};
   ghost.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY('+shift+'%)',opacity:0}],timing).onfinish=()=>ghost.remove();
   for(const layer of [model,pins,tip])layer.animate([{transform:'translateY('+(-shift)+'%)',opacity:0},{transform:'translateY(0)',opacity:1}],timing);
 }
 // Redraws the interior for one floor. A zone that is not on that floor hands over to the floor's first zone.
 function showFloor(level,reselect){
   if(level!==floor){const ghost=snapshot(),up=level>floor;floor=level;renderer.setScene(m=>{anchors=buildInterior(m,floor)});lift(ghost,up);}
   for(const b of floorButtons)b.setAttribute('aria-pressed',String(+b.dataset.floor===floor));
   if(reselect)choose(anchors[selected]?selected:floorStart[floor]);
 }
 function choose(id){
   if(!view.zones.includes(id))return;
   if(inside&&zoneFloors[id]&&!zoneFloors[id].includes(floor))showFloor(zoneFloors[id][0],false);
   selected=id;const [name,info,desc]=zones[id];
   for(const el of [...list.children,...pins.children]){
     const active=el.dataset.id===id;el.classList.toggle('sel',active);el.setAttribute('aria-pressed',String(active));
   }
   tipTitle.textContent=name;tipSpec.textContent=specs[id]||'';tipSpec.hidden=!specs[id];
   const cost=costs[id];tipValue.textContent=cost?cost[0]:'-';
   const data=element('div','data');data.append(element('b','',info),element('span','',t('Budget','예산')+'  '+(cost?cost[0]+' ('+cost[1]+')':'-')));
   if(specs[id])data.prepend(element('b','spec',specs[id]));
   detail.replaceChildren(element('h3','',name),data,element('p','',desc));
   if(id==='buffet'){
     const menu=element('a','tabpill',t('Catering menu (PDF) ↗','케이터링 메뉴 PDF ↗'));
     menu.href='catering-menu.pdf';menu.target='_blank';menu.rel='noopener';detail.append(menu);
   }
   place();
 }
 view.zones.forEach((id,i)=>{
   const name=zones[id][0],number=String(i+1).padStart(2,'0');
   const row=element('button','area'),label=element('span');
   label.append(element('i','num',number),document.createTextNode(name));row.append(label,element('small','',costs[id]?costs[id][0]:'-'));
   const pin=element('button','pin',number);pin.title=name;
   for(const btn of [row,pin]){btn.type='button';btn.dataset.id=id;btn.setAttribute('aria-label',number+' · '+name);btn.onclick=()=>choose(id);}
   pins.append(pin);list.append(row);
 });
 function tool(label,symbol,fn){
   const b=element('button','',symbol);b.type='button';b.title=label;b.setAttribute('aria-label',view.title+' · '+label);b.onclick=()=>{fn();queueDraw()};tools.append(b);
 }
 tool(t('Rotate left','왼쪽 회전'),'↶',()=>angle-=12);
 tool(t('Rotate right','오른쪽 회전'),'↷',()=>angle+=12);
 tool(t('Zoom out','축소'),'−',()=>zoom=clamp(zoom-.12,.65,1.65));
 tool(t('Zoom in','확대'),'+',()=>zoom=clamp(zoom+.12,.65,1.65));
 const reset=t('Reset view','시점 복원');
 tool(reset,reset,()=>{angle=view.angle;elevation=view.elevation;zoom=1});
 let drag=null;
 model.onpointerdown=e=>{
   if(!e.isPrimary||e.button!==0)return;
   drag={id:e.pointerId,x:e.clientX,y:e.clientY,a:angle,h:elevation,moved:false};model.setPointerCapture(e.pointerId);
 };
 model.onpointermove=e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
   if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;
   if(drag.moved){angle=drag.a-dx*.35;elevation=clamp(drag.h+dy*.23,8,68);queueDraw();}
 };
 model.onpointerup=e=>{
   if(drag&&drag.id===e.pointerId&&!drag.moved){const id=renderer.hit(e.clientX,e.clientY);if(anchors[id])choose(id);}
   drag=null;
 };
 model.onpointercancel=()=>{drag=null};
 showFloor(floor,false);choose(selected);draw();new ResizeObserver(queueDraw).observe(model);
}
for(const view of views)mountView(view);
const menu=document.getElementById('menu');
menu.querySelector('nav').addEventListener('click',e=>{
 if(e.target.tagName==='A'){
   menu.open=false;const dest=document.querySelector(e.target.hash);
   if(dest instanceof HTMLDetailsElement)dest.open=true;
 }
});
document.addEventListener('pointerdown',e=>{if(!menu.contains(e.target))menu.open=false});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus()}});
// Layer pop-ups for the schedule and the venue terms. Documents such as PDFs open in a new tab instead.
document.addEventListener('click',e=>{
 const opener=e.target.closest('[data-open]');
 if(opener){e.preventDefault();document.getElementById(opener.dataset.open).showModal();return;}
 const layer=e.target.closest('dialog.layer');
 if(layer&&(e.target===layer||e.target.closest('[data-close]')))layer.close();
});
