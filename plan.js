'use strict';
const korean = document.documentElement.lang === 'ko';
const t = (en, ko) => korean ? ko : en;
const views = [
  {id:'outside', title:t('Exterior view','외관 입체도'), areaTitle:t('Exterior zones','외관 구역'), angle:-32, elevation:15,
   zones:['banner','topbanner','signage','entrance']},
  {id:'inside', title:t('Interior cutaway','내부 절개 투시도'), areaTitle:t('Interior zones','내부 구역'), angle:-32, elevation:35,
   zones:['stage','players','seats','booth','gate','door','buffet','lounge','hangwide','hangtall','vip','cast','control','rooms','interview','gallery','facility']}
];
// Floors each interior zone is drawn on. Zones not listed here appear on every floor.
const zoneFloors = {stage:[1], players:[1], seats:[1], gate:[1], door:[1], buffet:[1], lounge:[1], hangtall:[1], booth:[1,2], hangwide:[1,2],
  vip:[2], cast:[2], control:[2], rooms:[3], interview:[3], gallery:[3]};
// Sizes of banner, sign and LED positions, shown with the zone name on the drawing.
const specs = {banner:'11,820 × 5,680 mm', topbanner:'9,700 × 2,800 mm', signage:'약 2,070 × 2,300 mm × 12면', glass:'LED 아님 · 일반 유리 1면', entrance:'사인 2,400 × 520 mm',
  stage:'10,000 × 5,000 mm', hangwide:'6,300 × 2,380 mm', hangtall:'2,430 × 5,540 mm'};
// Amounts exclude VAT. Zones without a set amount show a dash.
// For now the user wants amounts only in the budget section at the bottom: the zone lists, bubbles and details leave them out.
const SHOW_ZONE_COSTS=false;
const costs = {
  stage:['대관료 포함','LED 스크린은 대관료 30,000,000원에 포함'],
  exterior:[t('KRW 30,000,000','30,000,000원'),t('venue hire and LED screen, 19–20 December, excl. VAT','대관·LED, 12월 19–20일, 부가세 별도')],
  banner:[t('approx. KRW 1,500,000','약 1,500,000원'),t('print and high-level installation, estimate','출력·고소 설치, 추정')],
  topbanner:['약 600,000원','선택 · 출력·고소 설치, 추정'],
  hangwide:['약 250,000원','선택 · 출력·설치, 추정'],
  hangtall:['약 250,000원','선택 · 출력·설치, 추정'],
  players:[t('approx. KRW 2,000,000','약 2,000,000원'),t('10 PC sets × 2 days, estimate','PC 10세트 × 2일, 추정')],
  seats:[t('approx. KRW 88,000','약 88,000원'),t('11 rented chairs × 2 days, estimate','추가 임대 11석 × 2일, 나머지는 대관처 보유 의자, 추정')],
  booth:[t('approx. KRW 560,000','약 560,000원'),t('14 banners, estimate','배너 14개, 추정')],
  gate:[t('approx. KRW 1,210,000','약 1,210,000원'),t('hosts, wristbands and draw tickets for 2 days, plus badges, estimate','안내 스태프·팔찌·추첨권 2일분과 명찰, 추정')],
  buffet:[t('KRW 8,750,000','8,750,000원'),t('150 on 19 Dec + 200 on 20 Dec × KRW 25,000, unconfirmed, excl. VAT and delivery','19일 150인분 + 20일 200인분 × 25,000원, 확정 아님, 부가세·출장비 별도')]
};
// A button shown in the zone's bubble and detail: a document in a new tab, or a layer pop-up.
const actions = {
  buffet:{label:'케이터링 메뉴 PDF ↗', href:'catering-menu.pdf'},
  banner:{label:'배너 시안 보기', open:'banner-layout'},
  booth:{label:'부스 시안 보기', open:'booth-layout'},
  topbanner:{label:'현수막 시안 보기', open:'topbanner-layout'},
  hangwide:{label:'현수막 시안 보기', open:'hangwide-layout'},
  hangtall:{label:'현수막 시안 보기', open:'hangtall-layout'},
  signage:{label:'LED 송출 시안 보기', open:'led-layout'},
  players:{label:'무대 시안 보기', open:'stage-drafts'},
  stage:{label:'스크린 시안 보기', open:'screen-layout'}
};
function actionButton(id, cls){
  const a=actions[id]; if(!a)return null;
  let node;
  if(a.href){node=element('a',cls,a.label);node.href=a.href;node.target='_blank';node.rel='noopener';}
  else{node=element('button',cls,a.label);node.type='button';node.dataset.open=a.open;}
  return node;
}
const ICONS = {
  entrance:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h10v18H5z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12.3" cy="12" r="1.2"/><path d="M17 12h5m-2.2-2.5L22 12l-2.2 2.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  facility:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="4.2" r="2"/><path d="M5 7.5h4l1 7H8.6V21H5.4v-6.5H4z"/><circle cx="17" cy="4.2" r="2"/><path d="M15 7.5h4l2.2 8h-2.4V21h-3.6v-5.5h-2.4z"/></svg>'
};
ICONS.door = ICONS.entrance;   // the same door icon inside and outside
const zones = {
  exterior:[t('Building & venue','건물·대관'),t('48 hours','48시간'),
    t('The building is 24.38 m wide and 17.07 m deep: shipping containers stacked on four floors around an atrium. The 48-hour hire on 19–20 December covers setup, both event days and teardown. Equipment loads in through the two-storey garage door on the west side. The seating plan still requires venue confirmation.','정면 24.38 m, 깊이 17.07 m 규모로, 아트리움 둘레에 컨테이너를 4개 층으로 쌓은 건물입니다. 12월 19–20일 48시간 대관 안에 설치, 이틀 행사, 철거를 모두 진행합니다. 장비는 서쪽 면의 2개 층 높이 개러지 도어로 반입합니다. 좌석 배치는 대관처 확인이 필요합니다.')],
  banner:['우측 중앙 현수막','11,820 × 5,680 mm',
    '정면 오른쪽 컨테이너 벽의 2–3층에 거는 현수막 자리로, 대관처 규격은 가로 11,820 × 세로 5,680 mm입니다. 위쪽에 행사명을 크게 넣고, 아래에 파트너사를 등급별로 나열합니다. 1등급 1–2곳은 큰 로고, 2등급 6–10곳은 중간 크기 한 줄, 3등급은 작은 로고로 이어서 넣습니다. 대관처가 피스·나사 시공을 허용하지 않으므로 고정 방식과 게시 기간은 대관처와 협의합니다.'],
  topbanner:['좌측 상단 현수막','9,700 × 2,800 mm',
    'LED 창 위, 4층 높이의 현수막 자리입니다. 대관처 규격은 가로 9,700 × 세로 2,800 mm입니다. 사용 여부는 선택이며, 우측 중앙 현수막과 함께 설치하면 고소 작업을 한 번에 끝낼 수 있습니다. 가로로 긴 면이라 행사명과 날짜를 한 줄로 크게 넣고, 오른쪽에 1등급 파트너 로고를 두는 안입니다.'],
  signage:['외벽 LED','약 2,070 × 2,300 mm × 12면',
    '정면 왼쪽에 4열 × 3단으로 LED 창 12개가 있고, 창 하나는 약 2,070 × 2,300 mm입니다. 대관 시 무료로 쓰는 외부 컬러 LED 면으로 영상과 이미지를 송출할 수 있으며, 구현 방법은 계약 후 대관처가 메일로 안내합니다. 송출은 세 가지 화면을 번갈아 돌립니다. ① 가운데 2층 한 줄에 스폰서 로고와 문구를 길게 띄우는 화면, ② 1·2·3층 세 줄에 각각 띄우는 화면, ③ 창 12개마다 로고를 하나씩 띄우는 화면입니다. 영상도 넣을 수 있습니다. 도면에서도 세 화면이 차례로 바뀝니다. LED 창은 이 12개뿐이고, 오른쪽 출입문 위 2층 창은 LED가 아닌 일반 유리입니다.'],
  glass:['출입문 위 유리창','2층 · 출입문 사인 위',
    '왼쪽 LED 창 12개의 바로 오른쪽, 출입문 사인 위 2층에 있는 창입니다. 낮에는 LED 창과 비슷한 유리창으로 보이지만, 대관처 부착물 안내서의 야간 행사 사진(4쪽)에서는 왼쪽 12개에만 화면이 나오고 이 창은 꺼진 채 유리 너머 실내가 보입니다. 그래서 외부 컬러 LED 12면에 넣지 않고 일반 유리창으로 따로 표시했습니다. 이 창에 행사 이미지를 넣으려면 시트지나 출력물을 붙여야 하며, 부착 가능 여부와 방법은 대관처와 확인합니다.'],
  entrance:['관객 출입구','안내 3명',
    'LED 창 오른쪽 쌍문으로 들어서면 유리 전실을 지나 정면의 리셉션으로 이어집니다. 문 위 사인은 교체할 수 있고 규격은 외측 2,400 × 520 mm, 내측 2,330 × 465 mm입니다. 리셉션과 같은 안내 스태프 3명이 티켓을 확인하고 입장 팔찌를 채웁니다. 대관 시 무료 주차는 3대입니다. 차량 통제는 협의 중입니다.'],
  stage:[t('Main LED screen','메인 LED 스크린'),t('East wall · 10 × 5 m','동쪽 벽 고정 · 10 × 5 m'),
    t('The venue fixed LED screen.','동쪽 벽에 고정된 대관처의 메인 LED 스크린으로, 가로 10,000 × 세로 5,000 mm입니다. 대관처에서는 별도 옵션이지만 이번 대관에 포함했습니다. 대회 중에는 실시간 순위, 선수 화면, 중계 화면을 띄우고, 무대 프로그램 때는 발표 자료와 파트너 영상을 띄웁니다. 송출은 2층 방송·조명 컨트롤이 맡습니다. 무대와 선수 데스크가 스크린 아래쪽을 일부 가리므로 중요한 그래픽은 화면 위쪽에 둡니다. 도면의 스크린은 타이틀, 8명 실시간 순위, 선수 캠, 순위 경쟁 비교, 세션 투표 다섯 화면이 차례로 바뀌는 시안입니다. 순위표와 비교 화면에는 선수가 등록한 프로필 사진을 쓰고, 등록하지 않은 선수는 무대 PC 캠으로 찍은 사진을 씁니다. 크게 보려면 아래 버튼을 누릅니다. 스크린 위 3층 갤러리 유리는 간단한 문자를 띄우는 흑백 LED 글라스입니다.')],
  players:[t('Main stage & competitor desks','메인 무대 · 선수 데스크'),t('Stage 10.70 × 3.90 m','무대 10.70 × 3.90 m · 선수 8석 · MC 1명'),
    t('Main stage and desks.','LED 스크린 앞에, 객석 쪽으로 꼭짓점이 튀어나온 오각형 무대를 둡니다(시안 A). 폭 10.70 m, 깊이 3.90 m, 높이 0.6 m이고, 위 모서리를 따라 흰 LED 띠를 두르고 비스듬한 두 면 스커트에 출력물을 붙입니다. 선수 데스크 8개는 사선 모서리를 따라 한쪽에 4석씩 놓습니다. 본선은 한 경기에 4명이 뛰어 한쪽에 2석씩 쓰고, 8석 전체는 20일 쇼매치(결승 진출자 4명 + 크리에이터 4명 제안)에 씁니다. 크리에이터는 20일에만 참석합니다. 선수는 가운데 통로를 등지고 바깥쪽 객석을 봐서, 같은 쪽 객석에서는 얼굴 정면, 반대쪽에서는 옆얼굴이 보입니다. 모니터는 얼굴을 가리지 않게 데스크 바깥쪽 끝에 낮게 둡니다. 모니터마다 웹캠을 달아 선수 얼굴을 메인 스크린에 띄웁니다. MC는 앞 꼭짓점에 서고, 계단은 앞 꼭짓점과 북쪽 크루용 두 곳입니다. 심판·경기 진행 인력 2명과 예비 PC 2세트를 둡니다. 무대 위를 3층 갤러리가 덮고 있어 조명은 지상 지지식 트러스에 답니다. 각진 모양이라 대관처 기본 무대(6 × 2 m)로는 만들 수 없어 제작 무대가 필요하고, 무대용 LED 조명은 대관처 별도 옵션입니다. 시안 B(뒷줄은 객석, 앞줄은 스크린을 봄)는 아래 버튼에서 비교할 수 있습니다.')],
  seats:[t('Audience seating','관객석'),t('112 seats · 2 blocks of 8 × 7','관람 112석 · 8석 × 7열 2블록'),
    t('Two blocks of seven rows by eight chairs face the stage, with a centre aisle between them. The rear rows sit under the open atrium. The plan is for 500 guests, so most stand: in the lounge behind the seating and at the 2nd-floor railings. About 100 of the chairs can be the venue\'s free house chairs. Confirm aisles, accessible seating, exits and equipment clearances before fixing capacity.','무대를 향해 8석 × 7열 두 블록, 의자 112석을 배치한 제안입니다. 두 블록 사이에 가운데 통로를 두었고 뒤쪽 열은 아트리움 아래에 놓입니다. 계획 인원이 500명이라 대부분은 서서 봅니다. 객석 뒤 라운지와 2층 난간을 씁니다. 의자는 대관처 보유분 114개(접이식 50개 포함)를 먼저 쓰고 모자라는 만큼만 빌립니다. 통로, 휠체어석, 출입구와 장비 간격을 반영한 정원은 대관처와 확인합니다.')],
  booth:[t('Partner booths','파트너 부스'),t('7 booths · 3 shared crew','부스 7곳 · 공용 인력 3명'),
    t('Booths 1–3 use three of the four street-side bays on the ground floor; booths 4–7 use the north gallery room on the 2nd floor.','부스 1–3은 1층 가로 쪽 전시 칸 네 곳 중 서쪽 세 곳(칸마다 약 2.3 × 2.8 m)에, 부스 4–7은 2층 북쪽 전시실에 둡니다. 2층은 북쪽 벽을 따라 3곳(각 약 1.9 × 1.8 m), 계단 앞에 1곳(약 2.2 × 1.8 m)이고, 동쪽 끝은 계단 입구와 여자 화장실 문으로 가는 통로라 비워 둡니다. 부스마다 대관처 행사 테이블(1,500 × 700 mm) 1개와 배너 2개를 놓습니다. 공용 운영 2명, 로비 경호 1명, 각 부스 후원사 담당자 1명을 가정합니다. 부스 배치는 대관처와 협의합니다.')],
  door:['관객 출입구','정문 쌍문 · 언주로148길 쪽',
    '관객은 건물 정면의 쌍문으로 들어와 유리 전실을 지나 정면의 리셉션(05번)에서 티켓을 확인하고 입장 팔찌를 받습니다. 문 위 사인은 교체할 수 있으며 규격은 외측 2,400 × 520 mm, 내측 2,330 × 465 mm입니다. 장비 반입은 서쪽 개러지 도어를 쓰고, 북쪽 개러지 도어는 비상 동선으로 비워 둡니다.'],
  gate:['리셉션 · 티켓 확인','정문 정면 · 안내 3명',
    '정문으로 들어서면 바로 정면에 리셉션 데스크(약 2.2 × 0.6 m)를 둡니다. 안내 스태프 3명이 이곳에서 티켓 확인, 입장 팔찌 착용, 플레이 카드 QR 체크인, 추첨권·굿즈 배부를 맡습니다. 안내판은 문 쪽을 향하고, 데스크와 전실 사이 약 1.7 m에 줄을 세웁니다. 줄이 길어지면 전실 밖으로 나가지 않게 서쪽 부스 앞으로 돌립니다. 출입구 옆 전시 칸은 팔찌와 굿즈를 두는 보관 자리로 씁니다. 팔찌와 추첨권은 관객 500명에 예비 100명을 더해 날마다 600개씩 준비하고, 팔찌는 날짜별로 색을 다르게 합니다. 외관에 표시된 관객 출입구와 같은 인력입니다.'],
  lounge:['라운지','바 앞 · 약 5.3 × 3.0 m · 벤치 2개 · 스탠딩 테이블 3개',
    '바 카운터 앞 서쪽에 라운지 구역을 둡니다. 약 5.3 × 3.0 m 크기로 바닥에 카펫을 깔아 구역을 나누고, 벤치 2개, 스탠딩 테이블 3개, 안내 데스크를 둡니다. 경기 사이에 쉬거나 음식을 먹으면서 무대와 스크린을 볼 수 있는 자리입니다. 받은 계획안의 라운지(약 7.5 × 4.2 m)보다 30%쯤 작게 잡아, 바 앞 통로 약 1.1 m와 서쪽 계단 앞을 비웠습니다. 카펫과 가구는 피스·나사 없이 놓는 방식으로 준비합니다.'],
  buffet:[t('Bar & catering','바·케이터링'),t('150 + 200 guests','케이터링 150 + 200인분'),
    t('Catering is planned with Deho Catering at KRW 25,000 per person, not yet confirmed: 150 guests on 19 December and 200 on 20 December. If food runs short, pizza or fried chicken is ordered for delivery on the day. It is served from the venue\'s existing bar counters on the north side of the hall, in front of the kitchen. Guests eat standing at the lounge tables behind the seating. Keep the aisles and exits clear as guests collect food. Confirm catering access, hot holding, power and staffing with the venue and caterer.','드호 케이터링에 19일 150인분, 20일 200인분을 주문할 예정이며, 확정 전입니다. 모자라면 현장에서 피자나 치킨을 배달 주문합니다. 홀 북쪽 주방 앞의 기존 바 카운터를 배식대로 씁니다. 관객은 바 앞 라운지와 그 둘레의 스탠딩 테이블에서 식사합니다. 음식 수령 후 통로와 출입문을 비웁니다. 음식 반입, 온장, 전력과 인력은 대관처·업체와 협의합니다.')],
  hangwide:['실내 가로 현수막','6,300 × 2,380 mm',
    '정문으로 들어서면 정면에 보이는 자리로, 북쪽 개러지 도어 위 2층 컨테이너 면입니다. 대관처 규격은 가로 6,300 × 세로 2,380 mm이며 사용 여부는 선택입니다. 입장객이 처음 보는 면이라 환영 문구와 행사명, 1·2등급 파트너 로고를 넣는 안입니다.'],
  hangtall:['실내 세로 현수막','2,430 × 5,540 mm',
    'LED 스크린 오른쪽, 승강기 쪽 컨테이너 면에 2개 층 높이로 거는 자리입니다. 대관처 규격은 가로 2,430 × 세로 5,540 mm이며 사용 여부는 선택입니다. 홀을 가리지 않도록 도면에는 테두리만 그렸습니다. 세로로 긴 면이라 행사명을 세로로 쌓고, 이틀 일정과 1등급 파트너 로고를 아래에 넣는 안입니다.'],
  rooms:['짐 보관 · 휴식 대기실','3층 B룸 · 선수·VIP',
    '3층 컨테이너 B룸을 선수와 VIP의 짐 보관 및 휴식 대기실로 씁니다. 방은 폭 2.44 m, 길이 약 12 m이고 북쪽 복도 쪽 문으로 드나듭니다. 안쪽에는 소파와 낮은 테이블을 두어 쉬는 공간으로, 가로 쪽 끝에는 짐 선반과 캐리어 자리를 둡니다. 출입 명단을 두고 스태프가 짐을 관리하며, 귀중품은 따로 맡습니다. 경기 직전 대기는 2층 선수 대기존을 쓰고, 무대까지는 북쪽 내부 계단이나 승강기로 내려갑니다. 옆 A룸은 인터뷰룸으로 쓰고, 서쪽 두 칸은 대관 제외 공간입니다.'],
  interview:['인터뷰룸','3층 A룸 · 선수 인터뷰·촬영',
    '3층 컨테이너 A룸을 인터뷰룸으로 씁니다. 홀 쪽 벽이 유리인 방으로, 폭 2.44 m, 길이 약 12 m입니다. 가로 쪽 끝에 배경 가림막을 세우고 그 앞에 의자 2개, 카메라 1대와 조명 2대를 둡니다. 문 쪽에는 다음 차례가 기다리는 의자 3개와 촬영본을 확인하는 테이블을 둡니다. 경기 직후 선수 인터뷰와 매체 촬영에 씁니다. 무대 진행 중에도 녹음하려면 문을 닫고 써야 하며, 홀 소리가 유리로 얼마나 들어오는지는 현장에서 확인해야 합니다. 선수는 옆 B룸 대기실이나 2층 선수 대기존에서 건너옵니다.'],
  gallery:['홀덤 게임존','3층 갤러리 · 테이블 2대 · 18석',
    '무대 위쪽 3층 갤러리(약 7.2 × 14.3 m)를 홀덤 게임존으로 씁니다. 카지노형 홀덤 테이블(타원형, 약 2,800 × 1,400 mm) 2대를 한 줄로 놓고, 테이블마다 9석과 딜러 1명을 둡니다. 테이블 둘레로 관전할 공간이 넉넉하게 남습니다. 다리에서 들어오는 북쪽 입구 쪽은 비워 칩 지급·참가 등록 데스크를 둡니다. 3층 갤러리는 기본 대관에 들어 있지 않아 별도 협의 후 대관해야 합니다. 현금이나 코인 베팅, 칩 환전 없이 무료 칩으로만 진행하고, 순위 경품 지급 방식은 사전에 법률 검토를 받습니다. 홀 쪽 유리는 간단한 문자를 띄우는 흑백 LED 글라스라 게임존 순위를 띄울 수 있습니다.'],
  facility:['화장실 · 승강기 · 계단','1층 남 · 2층 여 · 3층 2칸',
    '화장실은 층마다 북쪽에 있습니다. 1층은 남자 화장실로, 주방 옆 컨테이너의 동쪽 끝 문으로 들어갑니다. 2층은 여자 화장실로, 북쪽 전시실 동쪽 끝 문을 지나야 합니다. 3층은 북서쪽 모서리에 2칸이 있습니다. 승강기는 남쪽 가로변 가운데에 있습니다. 북쪽 내부 계단이 1–3층을 잇고, 서쪽 계단은 1층 홀에서 2층 발코니로 올라갑니다.'],
  vip:[t('VIP room & player waiting','VIP룸 · 선수 대기존'),t('2F south-west room','2층 남서 전시실 · 약 7.3 × 6.1 m'),
    t('VIP room and player waiting zone.','2층 남서 전시실을 낮은 칸막이로 나눠, 서쪽은 소파와 낮은 테이블을 둔 VIP룸, 동쪽은 테이블 1개와 의자 8개를 둔 선수 대기존으로 씁니다. 1층 무대와 가깝고 북쪽 계단으로 바로 내려갈 수 있어 선수 호출이 쉽습니다. 소파는 대관처 팔걸이 의자(20개 보유)로 대신할 수 있습니다. 짐 보관과 휴식은 3층 B룸을, 인터뷰는 3층 A룸을 씁니다.')],
  cast:['중계 해설석','2층 남쪽 통로 · 해설 3석',
    '출입구 위 2층 남쪽 통로의 난간 앞에 중계 해설석을 둡니다. 홀과 스크린이 한눈에 보이는 자리로, 캐스터와 해설 3석, 모니터 3대, 뒤쪽 배경 가림막을 가정합니다. 통로 깊이가 약 2.4 m라 데스크를 난간 쪽에 붙이고, 의자 뒤로 승강기까지 가는 길을 비워 둡니다. 해설 음성은 복도의 방송·조명 컨트롤로 보내 중계와 장내 음향에 섞습니다.'],
  control:['방송·조명 컨트롤','2층 복도 · 무대 정면 · 3석',
    '무대를 정면으로 내려다보는 2층 복도 난간 앞에 방송·조명 컨트롤을 둡니다. 스크린 송출, 중계 화면 전환, 음향 믹서, 조명 조작을 이곳에서 하며 모니터 3대와 3석을 가정합니다. 위층에 두면 1층 전체를 관객에게 쓸 수 있고 관객 동선과 겹치지 않습니다. 의자 뒤로 약 1.1 m 통로가 남아 VIP룸·선수 대기존 문으로 드나들 수 있습니다. 1층 무대·스크린까지 영상·음향 케이블 경로와 전원은 대관처와 확인합니다.'],
  rail:[t('Balcony & standing rail','발코니·스탠딩 관람'),t('2F · balcony camera','2층 · 발코니 카메라'),
    t('Standing guests can watch from the west balcony and the walkway railings on the 2nd floor. A camera on the balcony covers the stage and the audience. Confirm with the venue how many people the balcony may hold.','서서 보는 관객은 2층 서쪽 발코니와 통로 난간에서 관람할 수 있습니다. 발코니의 카메라가 무대와 객석을 잡습니다. 발코니 허용 인원은 대관처와 확인합니다.')]
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
 // Title strip: title and floor switch on the left, view tools on the right.
 const head=element('div','striphead');head.append(element('h2','',view.title));strip.append(head);
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
   link.target='_blank';link.rel='noopener';const note=element('small');note.append(link);aside.append(switcher,note);head.append(aside);
 }
 const instructions=t('Drag to rotate · Select a numbered zone','드래그로 회전 · 번호로 구역 선택');
 model.setAttribute('aria-label',view.title+' · '+instructions);
 const tip=element('div','cost-tip'),tipTitle=element('span'),tipSpec=element('small'),tipValue=element('strong','','-'),tipAction=element('div','tip-action');
 tip.append(tipTitle,tipSpec,tipValue,tipAction);scene.append(model,pins,tip);
 const tools=element('div','tools');strip.append(tools);plate.append(strip,scene);
 document.querySelector('#plans').append(plate);
 const list=element('div','list'), detail=element('section','detail'), sideHead=element('div','sidehead');
 detail.setAttribute('aria-live','polite');sideHead.append(element('h2','',view.areaTitle));side.append(sideHead,list,detail);
 document.querySelector('#areas').append(side);
 const renderer=makeVenueRenderer(model);
 let anchors,floor=1,dropping=0;
 if(inside)renderer.setExtent(interiorExtent());
 if(inside){
   renderer.setScene(m=>{anchors=buildInterior(m,floor)});
   // The main LED screen cycles through its four pictures, unless the viewer prefers no motion.
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(()=>{
     if(document.hidden)return;
     SCREEN_MODE=(SCREEN_MODE+1)%SCREENS.length;renderer.setScene(m=>{anchors=buildInterior(m,floor)});queueDraw();
   },2500);
 }
 else{
   renderer.setScene(m=>{anchors=buildExterior(m)});
   // The LED face cycles through its three content types, unless the viewer prefers no motion.
   if(!matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(()=>{
     if(document.hidden)return;
     LED_MODE=(LED_MODE+1)%3;renderer.setScene(m=>{anchors=buildExterior(m)});queueDraw();
   },1750);
 }
 let angle=view.angle,elevation=view.elevation,zoom=1,selected=null,pending=0;   // nothing is selected until the viewer picks a zone
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function place(){
   for(const pin of pins.children){
     pin.hidden=!anchors[pin.dataset.id];
     if(pin.hidden)continue;
     const {x,y}=renderer.project(anchors[pin.dataset.id]);
     pin.style.left=x+'px';pin.style.top=y+'px';
   }
   tip.hidden=!selected||!anchors[selected];
   if(tip.hidden)return;
   const {x,y}=renderer.project(anchors[selected]),w=tip.offsetWidth,h=tip.offsetHeight;
   tip.style.left=clamp(x-w/2,3,scene.clientWidth-w-3)+'px';
   tip.style.top=clamp(y-h-18>3?y-h-18:y+18,3,scene.clientHeight-h-3)+'px';
 }
 function draw(){renderer.setCamera(angle,elevation,zoom);place();}
 function queueDraw(){if(!pending)pending=requestAnimationFrame(()=>{pending=0;draw()})}
 // Floor change. Going up, the floors already on show stay put and the new floor lowers onto them.
 // Going down, the floor above lifts away.
 const still=matchMedia('(prefers-reduced-motion: reduce)');
 function snapshot(){
   if(still.matches||!model.animate)return null;
   const ghost=element('canvas','ghost');ghost.width=model.width;ghost.height=model.height;
   ghost.getContext('2d').drawImage(model,0,0);return ghost;
 }
 function settle(){if(dropping){cancelAnimationFrame(dropping);dropping=0;renderer.setLift(0);}}
 function lift(ghost,up){
   if(!ghost)return;
   for(const old of scene.querySelectorAll('.ghost'))old.remove();
   scene.append(ghost);
   if(!up){
     ghost.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-10%)',opacity:0}],{duration:380,easing:'ease-in'}).onfinish=()=>ghost.remove();
     return;
   }
   ghost.animate([{opacity:1},{opacity:0}],{duration:240,easing:'ease-out'}).onfinish=()=>ghost.remove();
   pins.animate([{opacity:0},{opacity:0,offset:.6},{opacity:1}],{duration:560});
   const start=performance.now(),height=2.6,duration=560;
   const step=now=>{
     const k=Math.min(1,Math.max(0,(now-start)/duration));
     renderer.setLift(height*Math.pow(1-k,3));
     dropping=k<1?requestAnimationFrame(step):0;
   };
   step(start);
 }
 // Redraws the interior for one floor. A selected zone that is not on that floor is deselected.
 function showFloor(level,reselect){
   if(level!==floor){settle();const ghost=snapshot(),up=level>floor;floor=level;renderer.setScene(m=>{anchors=buildInterior(m,floor)});lift(ghost,up);}
   for(const b of floorButtons)b.setAttribute('aria-pressed',String(+b.dataset.floor===floor));
   if(reselect){if(selected&&!anchors[selected])clear();else place();}
 }
 function clear(){
   selected=null;
   for(const el of [...list.children,...pins.children]){el.classList.remove('sel');el.setAttribute('aria-pressed','false');}
   detail.hidden=true;detail.replaceChildren();place();
 }
 function choose(id){
   if(!view.zones.includes(id))return;
   if(inside&&zoneFloors[id]&&!zoneFloors[id].includes(floor))showFloor(zoneFloors[id][0],false);
   selected=id;detail.hidden=false;const [name,info,desc]=zones[id];
   for(const el of [...list.children,...pins.children]){
     const active=el.dataset.id===id;el.classList.toggle('sel',active);el.setAttribute('aria-pressed',String(active));
   }
   tipTitle.textContent=name;tipSpec.textContent=specs[id]||'';tipSpec.hidden=!specs[id];
   const cost=costs[id];tipValue.textContent=cost?cost[0]:'-';tipValue.hidden=!SHOW_ZONE_COSTS;
   const tipButton=actionButton(id,'tabpill');tipAction.replaceChildren(...(tipButton?[tipButton]:[]));tipAction.hidden=!tipButton;
   const data=element('div','data');data.append(element('b','',info));
   if(SHOW_ZONE_COSTS)data.append(element('span','',t('Budget','예산')+'  '+(cost?cost[0]+' ('+cost[1]+')':'-')));
   if(specs[id])data.prepend(element('b','spec',specs[id]));
   detail.replaceChildren(element('h3','',name),data,element('p','',desc));
   const detailButton=actionButton(id,'tabpill');if(detailButton)detail.append(detailButton);
   place();
 }
 let count=0;
 view.zones.forEach(id=>{
   // Building services get an icon instead of a number.
   const name=zones[id][0],icon=ICONS[id],number=icon?'':String(++count).padStart(2,'0');
   const row=element('button','area'),label=element('span'),num=element('i','num',number);
   if(icon){num.classList.add('icon');num.innerHTML=icon;}
   label.append(num,document.createTextNode(name));row.append(label);if(SHOW_ZONE_COSTS)row.append(element('small','',costs[id]?costs[id][0]:'-'));
   const pin=element('button','pin',number);pin.title=name;
   if(icon){pin.classList.add('icon');pin.innerHTML=icon;}
   for(const btn of [row,pin]){btn.type='button';btn.dataset.id=id;btn.setAttribute('aria-label',(number?number+' · ':'')+name);btn.onclick=()=>choose(id);}
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
   // A tap on a zone opens it; a tap on empty space closes the open bubble and detail.
   if(drag&&drag.id===e.pointerId&&!drag.moved){const id=renderer.hit(e.clientX,e.clientY);if(anchors[id]&&view.zones.includes(id))choose(id);else if(selected)clear();}
   drag=null;
 };
 model.onpointercancel=()=>{drag=null};
 showFloor(floor,false);clear();draw();new ResizeObserver(queueDraw).observe(model);
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
 if(opener){
   e.preventDefault();const layer=document.getElementById(opener.dataset.open);layer.showModal();
   // Plans wider than a phone scroll sideways; start them centred so both sides of the stage show.
   for(const p of layer.querySelectorAll('.plan'))p.scrollLeft=(p.scrollWidth-p.clientWidth)/2;
   return;
 }
 const layer=e.target.closest('dialog.layer');
 if(layer&&(e.target===layer||e.target.closest('[data-close]')))layer.close();
});
// Screen design pop-up: the main LED screen's pictures at full size.
const SCREEN_NAMES=['① 타이틀','② 실시간 순위 · 8명 · 프로필 사진','③ 선수 캠 · 데스크 웹캠 8대','④ 순위 경쟁 비교 · 프로필 사진','⑤ 세션 투표'];
const gallery=document.getElementById('screen-gallery');
if(gallery)SCREENS.forEach((paint,i)=>{
 const figure=element('figure'),canvas=element('canvas');
 canvas.width=SCREEN_SIZE[0];canvas.height=SCREEN_SIZE[1];paint(canvas.getContext('2d'),canvas.width,canvas.height);
 canvas.setAttribute('role','img');canvas.setAttribute('aria-label',SCREEN_NAMES[i]);
 figure.append(element('figcaption','',SCREEN_NAMES[i]),canvas);gallery.append(figure);
});
