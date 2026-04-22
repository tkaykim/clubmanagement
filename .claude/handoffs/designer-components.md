# Designer — Component Specs

모든 컴포넌트는 `globals.css` 의 유틸 클래스를 사용. shadcn/ui 의 Button, Input 등은 쓰지 않고 **네이티브 `.btn/.input` 등을 그대로 사용**. 오직 Dialog(Modal), Toast 정도만 shadcn의 접근성 동작이 필요하면 래핑.

## Atoms

### Avatar
- 사이즈: default 28, `.sm` 22, `.lg` 42
- src 있으면 `<img>` 출력, 없으면 initials(이름 첫 글자 대문자) + 배경 `--fg`
- 변형: `.outline` 흰 배경 + 테두리
- 스택: 부모 `.av-stack` 로 감싸 margin-left:-8 오버랩

```tsx
<div className="av lg">{initials(name)}</div>
<div className="av-stack">{members.map(m => <div key={m.id} className="av sm">{initials(m.name)}</div>)}</div>
```

### Badge
- 기본 `.badge` + 변형 `.solid/.outline/.ok/.warn/.danger/.info`
- `.dot` 자식요소로 6×6 원형 인디케이터
- StatusBadge(status: string) 래퍼:
  - `recruiting|open` → `.info` + "모집중"
  - `selecting|casting` → `.warn` + "선정중"  
  - `ongoing|confirmed` → `.ok` + "진행중"
  - `completed` → `.badge` + "완료"
  - `paid_gig` → `.solid` + "유료"
  - `practice` → `.badge` + "연습"
  - `audition` → `.info` + "오디션"

### Switch / Checkbox
- `<button className={cn('switch', on && 'on')} onClick={toggle} role="switch" aria-checked={on}/>` 
- `<button className={cn('cbx', on && 'on')} onClick={toggle} role="checkbox" aria-checked={on}/>`

### Seg (segmented)
```tsx
<div className="seg">
  {options.map(o => (
    <button key={o.val} className={cn(value===o.val && 'on')} onClick={()=>onChange(o.val)}>{o.label}</button>
  ))}
</div>
```
- `.seg.full` → flex:1 분배

### Button
- `<button className="btn primary">저장</button>` / `.ghost/.danger/.sm/.lg/.icon-only`

### Icons
- `lucide-react` 에서 가져옴. 크기 `size={14}` or `size={16}`, `strokeWidth={2}`.
- 메인 아이콘 셋: Home, Folder, Calendar, User, Users, Sparkles, Bell, Plus, Menu, X, Search, Check, ChevronRight, ChevronLeft, Download, Upload, MoreHorizontal, Edit, Trash, DollarSign, FileText, Send, Settings, Clock, MapPin, Megaphone

## Molecules

### StatCard
```tsx
<div className="card stat">
  <div className="lab">현재 진행 프로젝트</div>
  <div className="num tabnum">{value}</div>
  <div className="delta">{delta}</div>
</div>
```

### KVList
```tsx
<dl className="kv">
  <dt>일시</dt><dd>{date}</dd>
  <dt>장소</dt><dd>{venue}</dd>
</dl>
```

### EmptyState
```tsx
<div className="empty">
  <Inbox className="ico"/>
  <div>{message}</div>
  {action && <button className="btn sm mt-12" onClick={action.onClick}>{action.label}</button>}
</div>
```

### UnderlineTabs
```tsx
<nav className="tabs">
  {tabs.map(t => (
    <button key={t.key} className={cn('tab', active===t.key && 'on')} onClick={()=>onChange(t.key)}>
      {t.label}{t.count != null && <span className="count">{t.count}</span>}
    </button>
  ))}
</nav>
```

### Modal
```tsx
<div className="modal-root" onClick={onClose} role="dialog" aria-modal="true">
  <div className="modal" onClick={e=>e.stopPropagation()}>
    <div className="modal-head"><h3>{title}</h3><div style={{flex:1}}/><button className="btn ghost icon-only sm" onClick={onClose}><X size={14}/></button></div>
    <div className="modal-body">{children}</div>
    <div className="modal-foot">{footer}</div>
  </div>
</div>
```
- ESC 로 닫기, 포커스 트랩, 최초 autofocus 첫 input/btn.

### Toast
- 상단 앱에서 `<Toaster/>` 1개. Helper `toast(msg, {type})` 사용.
- 표시 2.5s 후 페이드아웃. 최대 3개 스택.

### PosterPlaceholder
```tsx
<div className={cn('poster', aspect==='square' && 'square', aspect==='thumb' && 'thumb')}>NO POSTER</div>
```

## Organisms

### SidebarNav (PC)
```tsx
<aside className="sidebar pc-only">
  <div className="brand"><img src="/logo.svg"/><div className="wordmark"><b>원샷크루</b><span>ONESHOT CREW</span></div></div>
  {/* Main */}
  <div className="nav-group-title">MAIN</div>
  <NavItem href="/" icon={Home}>홈</NavItem>
  <NavItem href="/projects" icon={Folder} count={counts.projects}>프로젝트</NavItem>
  <NavItem href="/calendar" icon={Calendar}>내 캘린더</NavItem>
  <NavItem href="/members" icon={Users}>멤버</NavItem>
  <NavItem href="/announcements" icon={Megaphone} count={counts.unreadAnn}>공지</NavItem>
  {/* Personal */}
  <div className="nav-group-title">PERSONAL</div>
  <NavItem href="/mypage" icon={User} count={counts.myPending}>마이페이지</NavItem>
  <NavItem href="/apply" icon={Sparkles}>빠른 지원</NavItem>
  {/* Admin only */}
  {isAdmin && <>
    <div className="nav-group-title">ADMIN</div>
    <NavItem href="/manage/projects" icon={FileText}>프로젝트 관리</NavItem>
    <NavItem href="/manage/settlements" icon={DollarSign}>정산 리포트</NavItem>
    <NavItem href="/manage/members" icon={Users}>멤버 관리</NavItem>
  </>}
  <div style={{flex:1}}/>
  <div className="me">
    <div className="avatar">{initials(me.name)}</div>
    <div><b>{me.name}</b><small>{ROLE_LABELS[me.role]}</small></div>
  </div>
</aside>
```

### NavItem
```tsx
function NavItem({href, icon:Icon, count, children}) {
  const path = usePathname();
  const active = path === href || (href !== '/' && path.startsWith(href));
  return (
    <Link href={href} className={cn('nav-item', active && 'active')}>
      <Icon size={16}/><span>{children}</span>
      {count != null && count > 0 && <span className="count">{count}</span>}
    </Link>
  );
}
```

### TopBar (PC)
```tsx
<header className="topbar pc-only">
  <span className="crumb">{crumb}</span>
  <div className="spacer"/>
  <input className="search" placeholder="검색..." value={q} onChange={...}/>
  <button className="btn icon-only"><Bell size={14}/></button>
  {isAdmin && <Link href="/manage/projects/new" className="btn primary"><Plus size={14}/>새 프로젝트</Link>}
</header>
```

### MobileHeader
```tsx
<header className="m-header mob-only">
  <button className="icon-btn" onClick={()=>setDrawerOpen(true)}><Menu size={18}/></button>
  <img src="/logo.svg"/>
  <div className="title">{pageTitle}</div>
  <button className="icon-btn"><Bell size={18}/>{unread>0 && <span className="dot"/>}</button>
</header>
```

### MobileBottomNav
5탭 고정(모든 역할). `/apply` 는 서버가 첫 모집중 프로젝트를 찾아 `/projects/[id]/apply` 로 리다이렉트(또는 클라에서 react-query 캐시).
```tsx
<nav className="m-bottom mob-only">
  {BOTTOM_NAV_TABS.map(t => (
    <Link key={t.key} href={t.href} className={cn('tab', isActive(t) && 'on')}>
      <t.Icon size={18}/>
      <span>{t.label}</span>
      {t.count>0 && <span className="cnt">{t.count}</span>}
    </Link>
  ))}
</nav>
```

### MobileDrawer
- 배경(`.m-drawer-bg`) 클릭 시 close
- 내부는 Sidebar 와 동일한 네비게이션 구조(brand, group-title, nav-item)
- route change 시 자동 close (usePathname effect)

### Fab (모바일 + admin)
```tsx
{isAdmin && <Link href="/manage/projects/new" className="m-fab mob-only"><Plus size={22}/></Link>}
```

### PWABanner
- 로직: `beforeinstallprompt` 이벤트 캐치, `localStorage.getItem('oc.pwa-dismissed')!=='1'` 일 때 표시
- 설치버튼 → deferredPrompt.prompt(); close → localStorage set + hide

### ScheduleRow (투표용)
```tsx
<div className="sched">
  {dates.map(d => (
    <div key={d.id} className="sched-row">
      <div className="date-col"><div className="d">{pad2(day(d.date))}</div><div className="dow">{DOW_SHORT[dow(d.date)]}</div></div>
      <div className="body">
        <div className="timeslots">
          {d.slots.map(s => <span key={s} className="slot">{s} <X size={10} className="x" onClick={()=>remove(s)}/></span>)}
          <button className="slot add" onClick={addSlot}><Plus size={10}/>시간 추가</button>
        </div>
        <div className="row gap-8">
          <Seg options={[{val:'available',label:'가능'},{val:'maybe',label:'조정가능'},{val:'unavailable',label:'불가'}]} value={vote} onChange={setVote}/>
        </div>
      </div>
    </div>
  ))}
</div>
```

### HeatmapGrid (관리자용 투표 현황)
```tsx
<div className="heatmap" style={{gridTemplateColumns:`140px repeat(${dates.length}, 1fr)`}}>
  <div/>{dates.map(d => <div key={d.id} className="heat-head">{pad2(day(d.date))}</div>)}
  {members.map(m => (
    <>
      <div className="heat-name">{m.name}</div>
      {dates.map(d => {
        const v = voteFor(m.id, d.id);
        const lvl = v==='available'?4 : v==='maybe'?2 : v==='unavailable'?0 : 1;
        return <div key={d.id} className="heat-cell" data-lvl={lvl}>{v==='unavailable'?'×':lvl>=4?'✓':'·'}</div>;
      })}
    </>
  ))}
</div>
```

### CalendarGrid
```tsx
<div className="cal">
  {DOW_FULL.map(d => <div key={d} className="cal-dow">{d}</div>)}
  {monthMatrix(ym).flat().map(day => (
    <div key={day.key} className={cn('cal-cell', !day.cur && 'other', day.isToday && 'today')} onClick={()=>openDay(day.date)}>
      <span className="d">{day.d}</span>
      {(events[day.key]||[]).slice(0,3).map(e => (
        <div key={e.id} className={cn('evt', e.kind==='event' && 'ok', e.kind==='practice' && 'warn')}>{e.title}</div>
      ))}
    </div>
  ))}
</div>
```

## Form primitives
`.field > label > .req/.hint` + `.input/.textarea/.select`. Zod 에러는 label 밑 `<small className="danger">` 로 표시:
```tsx
<div className="field">
  <label>제목 <span className="req">*</span></label>
  <input className="input" {...register('title')}/>
  {errors.title && <small style={{color:'var(--danger)',fontSize:11}}>{errors.title.message}</small>}
</div>
```
