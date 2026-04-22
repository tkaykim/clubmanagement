# Designer — Accessibility & Motion

## Contrast
- 배경 `#FAFAFA` / 본문 `#0A0A0B` → 명암비 ≥ 18:1 (WCAG AAA).
- 보조 텍스트 `--mf #71717A` on `#FAFAFA` ≈ 4.8:1 (AA normal). 11px 이하에서는 `--fg-soft` 로 상향.
- 상태 색은 `{color, bg}` 페어 사용 — 단독 색으로 의미 전달 금지 (아이콘·텍스트 병기).

## Focus
- 전역: `:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px }`
- 입력: focus 시 border-color:fg + box-shadow ring 3px rgba(fg,0.07)
- 바텀탭 포커스: `tab.on` 상단 인디케이터 외에 outline 유지

## Keyboard
- 모달: open 시 첫 포커서블(보통 close 또는 첫 input) autofocus, Tab cycle 내부로 제한, ESC 닫힘
- 드로어: ESC 닫힘, 열림 시 focus trap
- 탭 내비게이션: ArrowLeft/Right 로 UnderlineTabs 이동, Home/End 로 첫/마지막
- Dropdown: Enter/Space 열고, Arrow 로 이동, Escape 닫기

## ARIA
- Switch: `role="switch" aria-checked={on} aria-label={...}`
- Checkbox: `role="checkbox" aria-checked`
- Tabs: `<nav role="tablist">` + `button role="tab" aria-selected aria-controls`, 콘텐츠 `role="tabpanel"`
- Modal: `role="dialog" aria-modal="true" aria-labelledby` (title id)
- Toast 컨테이너: `aria-live="polite"`; error toast 는 `aria-live="assertive"`
- 아이콘 전용 버튼: `aria-label="메뉴 열기"` 등 명시
- nav-item 활성 시 `aria-current="page"`

## Touch Targets
- 최소 36×36. 바텀 탭은 세로 62, 내부 가로 ≥ 44. FAB 56×56. 카드 내부 작은 버튼은 sm(28×28) 쓰되 주변에 패딩 확보.

## Forms
- `<label for="id">` 필수. `aria-describedby` 로 hint/error 연결
- 필수: `<span className="req" aria-hidden>*</span>` + `aria-required="true"`
- 제출 실패 시 첫 오류 필드로 focus 이동 + 필드 위로 스크롤

## Motion
- `prefers-reduced-motion: reduce` 감지 시 `slideUp/slideL/pulse` 지속시간 0 + transform 제거
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; scroll-behavior: auto !important; }
}
```

## Color theme
- 다크모드는 v1 범위에서 제외. `.dark` 클래스는 shadcn 기본만 남기고 실제 페이지에서는 적용하지 않음.

## Images
- `<img alt="...">` 필수, 장식용은 `alt=""`
- 포스터: alt="{title} 포스터"

## Screen reader only
- 시각적으로 숨긴 텍스트용 유틸 `.sr-only` 추가 필요 시:
```css
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
```

## Language
- `<html lang="ko">` 필수
- 에러 메시지, 툴팁 모두 한국어

## Mobile Web Viewport
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — safe-area-inset 적용 위해 `viewport-fit=cover` 필수
- iOS 텍스트 확대 방지: input 최소 16px 권장 (현재 13.5px → focus 시 확대됨. 수용 가능. 중요하면 `font-size: 16px; transform: scale(0.84)` 같은 꼼수는 배제.)
