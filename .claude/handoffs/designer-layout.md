# Designer — App Shell Layout

## PC (≥901px)
```
.app: display:grid; grid-template-columns: 248px 1fr; min-height:100vh
  ├── .sidebar (sticky, 100vh, border-right, background:bg-elev, padding:20px 14px, flex col, overflow-y:auto)
  │    ├── .brand (padding:6px 8px 20px, border-bottom, mb:14px)
  │    │    img 34×34 logo + wordmark(b:15px 700 "원샷크루", span:11px mono uppercase muted "ONESHOT CREW")
  │    ├── .nav-group-title (10.5px mono uppercase letter-spacing:0.08em, mf, padding:14px 10px 6px)
  │    ├── .nav-item (padding:8px 10px, radius:8, 13.5px, user-select:none, border:1px transparent)
  │    │    :hover → bg:muted; .active → bg:fg, color:#fff, font:600
  │    │    .count 뱃지 (margin-left:auto, 11px, padding:1px 7px, radius:999, bg:muted-2, mono)
  │    │    .active .count → bg:rgba(#fff,.15), color:#fff
  │    └── .me (margin-top:auto, padding:10, border, radius:12)
  │         avatar 34px bg:fg color:#fff + b(13px)/small(11px mono uppercase mf)
  └── .main
       ├── .topbar (sticky top:0, z:5, bg:rgba(bg,.85) blur(8px), border-bottom, padding:14px 28px, flex gap:16)
       │    crumb(12px mono uppercase mf) + spacer + search(260×34, radius:8, SVG bg) + icon-btn bell + btn.primary "새 프로젝트"(admin만)
       └── .page (padding:28, max-width:1240, margin:0 auto)
```

## Mobile (≤900px)
```
.app: grid-template-columns: 1fr
  ├── .m-header (sticky top:0, z:20, height:54, bg:rgba(bg,.94) blur(10), border-bottom, padding:10px 14px, flex gap:10)
  │    icon-btn(36×36 border radius:8) 메뉴 + img(30×30 logo) + title(flex:1, 15px 700, ellipsis) + icon-btn bell(.dot 7×7 absolute top:7 right:7)
  ├── .page (padding:16px 14px 32px, pb:80)
  ├── .m-bottom (fixed bottom:0, z:30, height:calc(62+env(safe-area-inset-bottom)), bg:rgba(#fff,.96) blur(10), border-top, grid 5등분)
  │    .tab (flex col, align/justify center, gap:3, mf, 10px mono letter-spacing:0.04em, padding-top:6, position:relative)
  │    .tab.on → color:fg, 600; .tab.on::before (top:0, width:24, height:2, bg:fg)
  │    .tab .cnt (absolute top:6 right:calc(50%-22px), min-w:15 h:15, padding:0 4, bg:fg color:#fff radius:999, mono 9px, border:1.5px #fff)
  ├── .m-drawer-bg (fixed inset:0, bg:rgba(fg,.4), z:40)
  └── .m-drawer (fixed top:0 bottom:0 left:0, width:86%, max-w:320, z:50, bg:#fff, padding:20px 14px, flex col, animate slideL 180ms)
```

## BottomNav 5탭 (모든 역할 공통)
| # | 아이콘 | 레이블 | 경로 |
|---|---|---|---|
| 1 | home | 홈 | `/` |
| 2 | folder | 프로젝트 | `/projects` |
| 3 | sparkles | 지원 | `/apply` (첫 모집중 프로젝트로 이동) |
| 4 | calendar | 캘린더 | `/calendar` |
| 5 | user | 마이 | `/mypage` |

## Sidebar 메뉴 (역할별)
**Main:** 홈, 프로젝트(count), 내 캘린더, 멤버, 공지(count)  
**Personal:** 마이페이지(count 내 지원 대기), 빠른 지원  
**Admin (admin/owner만):** 프로젝트 관리(새 프로젝트), 정산 리포트, 멤버 관리

## FAB (모바일, admin/owner)
`fixed right:18 bottom:82, z:28, 56×56, radius:50%, bg:fg color:#fff, shadow:0 14px 30px rgba(fg,.3)` — `/manage/projects/new` 로 이동. :active → scale(0.95).

## PWABanner 위치
- 모바일: `fixed left:14 right:14 bottom:82, z:25`
- 데스크톱 (≥901): `right:24 bottom:24 left:auto max-width:360`
- 내부: bg:fg, color:#fff, radius:14, padding:14 16, img 38×38 + body(t:13.5 600, s:11.5 mono .7 opacity) + btn.primary(흰 배경 fg 글자) + close(28×28)
- 상태: `localStorage.getItem('oc.pwa-dismissed')` 로 제어.

## 레이아웃 분기 전략 (Next.js App Router)
**단일 layout.tsx**에서 모바일/PC 컴포넌트를 모두 렌더. CSS `.pc-only`/`.mob-only` 로 가시성 제어 (hydration-safe).

```tsx
// app/(main)/layout.tsx
export default function MainLayout({children}) {
  return (
    <div className="app">
      <Sidebar className="pc-only"/>
      <MobileHeader className="mob-only"/>
      <MobileDrawer/>  {/* state: open */}
      <main className="main">
        <TopBar className="pc-only"/>
        <PWABanner/>
        {children}
        <div style={{height:84}} className="mob-only"/>
      </main>
      <MobileBottomNav className="mob-only"/>
      <Fab className="mob-only"/> {/* admin 조건부 */}
      <Toaster/>
    </div>
  );
}
```

**주의**: `useMediaQuery` 분기 금지 (hydration mismatch 위험). CSS로만 처리.
