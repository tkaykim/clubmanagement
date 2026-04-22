/* Shared data, icons, and small components for OneShot Crew app */

/* ============ ICONS (lucide-style) ============ */
const Ico = ({ d, size=16, stroke=2, fill='none', style }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
       viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       style={{display:'inline-block', verticalAlign:'middle', ...style}}
       dangerouslySetInnerHTML={{__html: d}}
  />
);

const I = {
  home:     (p)=> <Ico d='<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' {...p}/>,
  folder:   (p)=> <Ico d='<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>' {...p}/>,
  calendar: (p)=> <Ico d='<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' {...p}/>,
  users:    (p)=> <Ico d='<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' {...p}/>,
  user:     (p)=> <Ico d='<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' {...p}/>,
  settings: (p)=> <Ico d='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1"/>' {...p}/>,
  plus:     (p)=> <Ico d='<path d="M5 12h14M12 5v14"/>' {...p}/>,
  close:    (p)=> <Ico d='<path d="M18 6 6 18M6 6l12 12"/>' {...p}/>,
  check:    (p)=> <Ico d='<path d="M20 6 9 17l-5-5"/>' {...p}/>,
  x:        (p)=> <Ico d='<path d="M18 6 6 18M6 6l12 12"/>' {...p}/>,
  chevL:    (p)=> <Ico d='<path d="m15 18-6-6 6-6"/>' {...p}/>,
  chevR:    (p)=> <Ico d='<path d="m9 18 6-6-6-6"/>' {...p}/>,
  chevD:    (p)=> <Ico d='<path d="m6 9 6 6 6-6"/>' {...p}/>,
  chevU:    (p)=> <Ico d='<path d="m18 15-6-6-6 6"/>' {...p}/>,
  clock:    (p)=> <Ico d='<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' {...p}/>,
  pin:      (p)=> <Ico d='<path d="M12 17v5"/><path d="M9 10.76V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v5.76a2 2 0 0 0 .59 1.42l3.12 3.12A1 1 0 0 1 18 17H6a1 1 0 0 1-.71-1.7l3.12-3.12A2 2 0 0 0 9 10.76Z"/>' {...p}/>,
  map:      (p)=> <Ico d='<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>' {...p}/>,
  copy:     (p)=> <Ico d='<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>' {...p}/>,
  edit:     (p)=> <Ico d='<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/>' {...p}/>,
  trash:    (p)=> <Ico d='<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' {...p}/>,
  filter:   (p)=> <Ico d='<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' {...p}/>,
  download: (p)=> <Ico d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>' {...p}/>,
  bell:     (p)=> <Ico d='<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>' {...p}/>,
  send:     (p)=> <Ico d='<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>' {...p}/>,
  search:   (p)=> <Ico d='<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>' {...p}/>,
  money:    (p)=> <Ico d='<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' {...p}/>,
  more:     (p)=> <Ico d='<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>' {...p}/>,
  arrowR:   (p)=> <Ico d='<path d="M5 12h14M12 5l7 7-7 7"/>' {...p}/>,
  arrowU:   (p)=> <Ico d='<path d="M12 19V5M5 12l7-7 7 7"/>' {...p}/>,
  warn:     (p)=> <Ico d='<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>' {...p}/>,
  sparkles: (p)=> <Ico d='<path d="M12 3v6m0 6v6M3 12h6m6 0h6M5.64 5.64l4.24 4.24m4.24 4.24 4.24 4.24M5.64 18.36l4.24-4.24m4.24-4.24 4.24-4.24"/>' {...p}/>,
  tag:      (p)=> <Ico d='<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/>' {...p}/>,
  ext:      (p)=> <Ico d='<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>' {...p}/>,
  logo:     (p)=> <Ico d='<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>' {...p}/>,
};

/* ============ UTILITIES ============ */
const cn = (...a) => a.filter(Boolean).join(' ');
const fmtKRW = (n) => new Intl.NumberFormat('ko-KR').format(n);
const pad2 = (n) => String(n).padStart(2,'0');
const DOW_SHORT = ['일','월','화','수','목','금','토'];
const DOW_FULL  = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function initials(name='') {
  const s = name.trim();
  if (!s) return '—';
  if (/[가-힣]/.test(s)) return s.slice(-2);
  const parts = s.split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

function dateKey(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
}

function addDays(d, n) { const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function monthMatrix(year, month /* 0-indexed */) {
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const cells = [];
  for (let i=0;i<42;i++) cells.push(addDays(start,i));
  return cells;
}

/* ============ SMALL COMPONENTS ============ */
const Avatar = ({ name, className='', size }) => (
  <div className={cn('av', size && 'av-'+size, className)}>{initials(name)}</div>
);

const Badge = ({ children, kind='', variant='', icon }) => (
  <span className={cn('badge', kind, variant)}>
    {icon && React.cloneElement(icon, { size: 11 })}
    {children}
  </span>
);

const StatusBadge = ({ status }) => {
  const map = {
    recruiting:   { label: '모집중',   kind: 'solid' },
    selecting:    { label: '선별중',   kind: '' },
    in_progress:  { label: '진행중',   kind: 'outline' },
    completed:    { label: '완료',     kind: 'outline' },
    cancelled:    { label: '취소',     kind: 'danger' },
    pending:      { label: '대기',     kind: 'warn'  },
    approved:     { label: '확정',     kind: 'ok'    },
    rejected:     { label: '탈락',     kind: 'danger'},
    available:    { label: '가능',     kind: 'ok'    },
    unavailable:  { label: '불가',     kind: 'danger'},
    maybe:        { label: '부분',     kind: 'warn'  },
    paid_gig:     { label: '유료행사', kind: 'solid' },
    practice:     { label: '연습',     kind: 'outline' },
    audition:     { label: '오디션',   kind: 'outline' },
    workshop:     { label: '워크숍',   kind: 'outline' },
  };
  const m = map[status] || { label: status, kind: '' };
  return <Badge kind={m.kind}>{m.label}</Badge>;
};

const Switch = ({ on, onChange }) => (
  <div className={cn('switch', on && 'on')} onClick={() => onChange(!on)} role="switch" aria-checked={on}/>
);
const Checkbox = ({ on, onChange }) => (
  <div className={cn('cbx', on && 'on')} onClick={() => onChange(!on)} role="checkbox" aria-checked={on}/>
);

const Seg = ({ value, onChange, options, full }) => (
  <div className={cn('seg', full && 'full')}>
    {options.map(o => (
      <button key={o.value} className={cn(value===o.value && 'on')}
              onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

const Modal = ({ title, children, onClose, foot, wide }) => (
  <div className="modal-root" onClick={onClose}>
    <div className="modal" style={wide?{maxWidth:720}:null} onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <h3 style={{flex:1}}>{title}</h3>
        <button className="btn ghost icon-only sm" onClick={onClose}><I.close size={14}/></button>
      </div>
      <div className="modal-body">{children}</div>
      {foot && <div className="modal-foot">{foot}</div>}
    </div>
  </div>
);

/* ============ SEED DATA ============ */
const TODAY = new Date(2026, 3, 22); // April 22, 2026

const MEMBERS = [
  { id:'m1', name:'김도윤', stage:'DOYOON',  role:'owner',  contract:'contract',    pos:'리더', active:true, join:'2022-01' },
  { id:'m2', name:'이서연', stage:'SEO',     role:'admin',  contract:'contract',    pos:'안무', active:true, join:'2022-03' },
  { id:'m3', name:'박지우', stage:'JIWOO',   role:'member', contract:'contract',    pos:'퍼포머', active:true, join:'2023-05' },
  { id:'m4', name:'최하늘', stage:'HANEUL',  role:'member', contract:'contract',    pos:'퍼포머', active:true, join:'2023-05' },
  { id:'m5', name:'정유진', stage:'YU-JIN',  role:'member', contract:'contract',    pos:'퍼포머', active:true, join:'2024-02' },
  { id:'m6', name:'한소희', stage:'SOHEE',   role:'member', contract:'non_contract',pos:'퍼포머', active:true, join:'2024-08' },
  { id:'m7', name:'강민재', stage:'MINJAE',  role:'member', contract:'non_contract',pos:'퍼포머', active:true, join:'2024-08' },
  { id:'m8', name:'조예린', stage:'YERIN',   role:'member', contract:'guest',       pos:'게스트', active:true, join:'2025-11' },
  { id:'m9', name:'윤시우', stage:'SIWOO',   role:'member', contract:'contract',    pos:'퍼포머', active:false, join:'2023-01' },
];

const ME_ID = 'm3'; // 박지우 (계약멤버)

const PROJECTS = [
  {
    id:'p1', title:'원샷크루 5월 정기공연 〈FRAME〉',
    type:'paid_gig', status:'recruiting',
    poster:null,
    fee: 350000, // per person
    venue:'서울 성수 S팩토리 B홀',
    address:'서울 성동구 성수이로 123',
    dates:[
      { date:'2026-05-15', label:'리허설' },
      { date:'2026-05-16', label:'본공연 1회차' },
      { date:'2026-05-17', label:'본공연 2회차' },
    ],
    practiceDates:[
      { date:'2026-04-24' }, { date:'2026-04-26' },
      { date:'2026-05-01' }, { date:'2026-05-03' },
      { date:'2026-05-08' }, { date:'2026-05-10' },
      { date:'2026-05-13' },
    ],
    recruit_end:'2026-04-28',
    max:12,
    desc:'원샷크루가 올해 처음 선보이는 정기공연. 총 3일 공연 + 2주 집중 연습 스케줄. 확정 멤버는 안무·무대·영상 연출에 모두 참여하게 됩니다.',
    applicants:[
      { memberId:'m3', status:'approved', at:'2026-04-12', score:9.2, memo:'리허설 경험 다수' },
      { memberId:'m4', status:'approved', at:'2026-04-12', score:8.8, memo:'안무 숙련도 높음' },
      { memberId:'m5', status:'pending',  at:'2026-04-18', score:8.1, memo:'' },
      { memberId:'m6', status:'pending',  at:'2026-04-19', score:7.9, memo:'5/16 오후 불가' },
      { memberId:'m7', status:'pending',  at:'2026-04-20', score:7.4, memo:'' },
      { memberId:'m8', status:'rejected', at:'2026-04-20', score:6.1, memo:'일정 대부분 불가' },
    ],
  },
  {
    id:'p2', title:'브랜드 X 런칭 파티 퍼포먼스',
    type:'paid_gig', status:'in_progress',
    poster:null, fee: 500000,
    venue:'강남 L호텔 그랜드볼룸',
    address:'서울 강남구 테헤란로 450',
    dates:[
      { date:'2026-04-29', label:'본행사' },
    ],
    practiceDates:[
      { date:'2026-04-23' }, { date:'2026-04-25' }, { date:'2026-04-27' },
    ],
    recruit_end:'2026-04-14',
    max:6,
    desc:'브랜드 런칭 이벤트 오프닝 퍼포먼스. 6명 고정.',
    applicants:[
      { memberId:'m1', status:'approved', at:'2026-04-02', score:9.5, memo:'디렉터' },
      { memberId:'m2', status:'approved', at:'2026-04-02', score:9.0, memo:'안무 총괄' },
      { memberId:'m3', status:'approved', at:'2026-04-03', score:8.9, memo:'' },
      { memberId:'m4', status:'approved', at:'2026-04-03', score:8.7, memo:'' },
      { memberId:'m5', status:'approved', at:'2026-04-04', score:8.2, memo:'' },
      { memberId:'m7', status:'approved', at:'2026-04-05', score:8.0, memo:'' },
    ],
  },
  {
    id:'p3', title:'4월 팀 정기연습',
    type:'practice', status:'in_progress',
    poster:null, fee: -20000, // cost (fee negative = participation cost)
    venue:'연남동 큐브 연습실 2호',
    address:'서울 마포구 연남로 30',
    dates:[],
    practiceDates:[
      { date:'2026-04-23' }, { date:'2026-04-30' },
    ],
    recruit_end:'2026-04-22',
    max:null,
    desc:'주간 팀 연습. 계약멤버 필수 참여, 비계약 선택.',
    applicants:[
      { memberId:'m1', status:'approved', at:'2026-04-01', score:0, memo:'' },
      { memberId:'m2', status:'approved', at:'2026-04-01', score:0, memo:'' },
      { memberId:'m3', status:'approved', at:'2026-04-02', score:0, memo:'' },
      { memberId:'m4', status:'approved', at:'2026-04-02', score:0, memo:'' },
      { memberId:'m5', status:'approved', at:'2026-04-02', score:0, memo:'' },
      { memberId:'m9', status:'rejected', at:'2026-04-02', score:0, memo:'장기 휴식' },
    ],
  },
  {
    id:'p4', title:'유니버시티 페스티벌 오픈콜',
    type:'audition', status:'recruiting',
    poster:null, fee: 200000,
    venue:'경기 일산 킨텍스 제2전시장',
    address:'경기 고양시 일산서구 킨텍스로 217',
    dates:[
      { date:'2026-06-06', label:'본무대' },
    ],
    practiceDates:[
      { date:'2026-05-25' }, { date:'2026-05-28' },
      { date:'2026-06-01' }, { date:'2026-06-04' },
    ],
    recruit_end:'2026-05-10',
    max:8,
    desc:'대학 축제 투어. 오픈콜 방식으로 진행, 게스트 2명 영입 예정.',
    applicants:[],
  },
];

const ANNOUNCEMENTS = [
  { id:'a1', title:'5월 정기공연 〈FRAME〉 — 지원 & 가용성 제출 요청', at:'2026-04-20',
    pinned:true, scope:'team', author:'김도윤',
    body:'5월 정기공연 지원 마감은 4/28입니다. 가용성도 함께 제출해주세요. 연습 스케줄은 4/24부터 시작됩니다.' },
  { id:'a2', title:'[긴급] 4/23 연습실 변경 안내', at:'2026-04-21',
    pinned:true, scope:'team', author:'이서연',
    body:'4/23 연습은 큐브 연습실 2호 → 3호로 변경되었습니다. 시간 동일 (20:00~23:00).' },
  { id:'a3', title:'4월 정산 프로세스 시작', at:'2026-04-18',
    pinned:false, scope:'team', author:'김도윤',
    body:'4월 정산 검토가 시작되었습니다. 멤버별 확인 부탁드립니다.' },
  { id:'a4', title:'브랜드 X 공연 — 최종 드레스 코드', at:'2026-04-15',
    pinned:false, scope:'project', project:'p2', author:'이서연',
    body:'올블랙 + 실버 액세서리. 신발은 지급 예정.' },
];

/* Availability votes: schedule_date_id is `${projectId}:${date}` */
/* Seed: heavy coverage for p1 */
const VOTES_SEED = (() => {
  const v = {};
  const randStatus = (seed) => {
    const r = Math.abs(Math.sin(seed*9301.19)) ;
    if (r > 0.7) return 'unavailable';
    if (r > 0.45) return 'maybe';
    return 'available';
  };
  PROJECTS.forEach((p, pi) => {
    const allDates = [...p.dates.map(d=>d.date), ...p.practiceDates.map(d=>d.date)];
    MEMBERS.forEach((m, mi) => {
      allDates.forEach((d, di) => {
        const key = `${p.id}:${d}:${m.id}`;
        v[key] = { status: randStatus(pi*100 + mi*10 + di), slots:[] };
      });
    });
  });
  // Me: make specific
  v['p1:2026-04-24:m3'] = { status:'available', slots:[{start:'20:00', end:'23:00'}] };
  v['p1:2026-04-26:m3'] = { status:'available', slots:[{start:'19:00', end:'22:00'}] };
  v['p1:2026-05-01:m3'] = { status:'maybe',     slots:[{start:'21:00', end:'23:00'}] };
  v['p1:2026-05-03:m3'] = { status:'available', slots:[{start:'14:00', end:'18:00'}] };
  v['p1:2026-05-15:m3'] = { status:'available', slots:[] };
  v['p1:2026-05-16:m3'] = { status:'available', slots:[] };
  v['p1:2026-05-17:m3'] = { status:'available', slots:[] };
  return v;
})();

Object.assign(window, { I, Ico, cn, fmtKRW, pad2, DOW_SHORT, DOW_FULL, initials, dateKey, addDays, monthMatrix,
  Avatar, Badge, StatusBadge, Switch, Checkbox, Seg, Modal,
  TODAY, MEMBERS, ME_ID, PROJECTS, ANNOUNCEMENTS, VOTES_SEED });
