# Designer — Design Tokens

모노크롬 B/W + 상태 색(green/amber/red/blue). Pretendard + IBM Plex Mono + Instrument Serif italic.

## CSS 변수 (globals.css :root)

```css
:root {
  --bg:        #FAFAFA;
  --bg-elev:   #FFFFFF;
  --fg:        #0A0A0B;
  --fg-soft:   #1F1F24;
  --muted:     #F4F4F5;
  --muted-2:   #EEEEF0;
  --border:    #E4E4E7;
  --border-2:  #D4D4D8;
  --mf:        #71717A;
  --mf-2:      #A1A1AA;
  --ok:        #059669;
  --warn:      #D97706;
  --danger:    #DC2626;
  --info:      #2563EB;
  --ok-bg:     #ECFDF5;
  --warn-bg:   #FFFBEB;
  --danger-bg: #FEF2F2;
  --info-bg:   #EFF6FF;
  --radius-os:    12px;
  --radius-os-sm:  8px;
  --radius-os-lg: 16px;
  --shadow-sm: 0 1px 0 rgba(10,10,11,0.04), 0 1px 2px rgba(10,10,11,0.04);
  --shadow-md: 0 2px 8px rgba(10,10,11,0.06), 0 1px 2px rgba(10,10,11,0.04);
  --font-sans:  'Pretendard Variable', Pretendard, -apple-system, 'Inter', system-ui, sans-serif;
  --font-mono:  'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-serif: 'Instrument Serif', 'Times New Roman', serif;

  /* shadcn 호환 — 값 동일 */
  --background:#FAFAFA; --foreground:#0A0A0B;
  --card:#FFFFFF; --card-foreground:#0A0A0B;
  --popover:#FFFFFF; --popover-foreground:#0A0A0B;
  --primary:#0A0A0B; --primary-foreground:#FFFFFF;
  --secondary:#F4F4F5; --secondary-foreground:#1F1F24;
  --muted-foreground:#71717A;
  --accent:#F4F4F5; --accent-foreground:#1F1F24;
  --destructive:#DC2626;
  --input:#E4E4E7; --ring:#0A0A0B;
  --radius: 0.5rem;
}

@theme inline {
  --color-os-bg: var(--bg);
  --color-os-bg-elev: var(--bg-elev);
  --color-os-fg: var(--fg);
  --color-os-fg-soft: var(--fg-soft);
  --color-os-muted: var(--muted);
  --color-os-muted-2: var(--muted-2);
  --color-os-border: var(--border);
  --color-os-border-2: var(--border-2);
  --color-os-mf: var(--mf);
  --color-os-mf-2: var(--mf-2);
  --color-os-ok: var(--ok);
  --color-os-warn: var(--warn);
  --color-os-danger: var(--danger);
  --color-os-info: var(--info);
  --color-os-ok-bg: var(--ok-bg);
  --color-os-warn-bg: var(--warn-bg);
  --color-os-danger-bg: var(--danger-bg);
  --color-os-info-bg: var(--info-bg);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-border: var(--border);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
}
```

## 폰트 로드
- `app/layout.tsx`: `IBM_Plex_Mono({subsets:['latin'], weight:['400','500'], variable:'--font-ibm-mono'})`, `Instrument_Serif({subsets:['latin'], weight:'400', style:['normal','italic'], variable:'--font-instrument'})`
- `<head>`: Pretendard CDN `<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" rel="stylesheet"/>`
- Inter 제거.

## 타이포 스케일
| 클래스 | size |
|---|---|
| .text-xs | 11.5px |
| .text-sm | 13px |
| default | 13.5px |
| .text-lg | 15px |
| .text-xl | 17px |
| .text-2xl | 20px |
| h1 (page-head) | 30px (모바일 24px) |

## 유틸
```css
.tabnum { font-variant-numeric: tabular-nums; }
.mono   { font-family: var(--font-mono); }
.serif  { font-family: var(--font-serif); font-style: italic; }
.pc-only  { display: none !important; }
.mob-only { display: flex !important; }
@media (min-width: 901px) {
  .pc-only  { display: flex !important; }
  .mob-only { display: none !important; }
}
:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
```

## 버튼 크기
| 변형 | height | padding | font |
|---|---|---|---|
| sm | 28px | 0 10px | 12px |
| default | 34px | 0 14px | 13px |
| lg | 42px | 0 18px | 14px |
| icon-only | 34×34 | 0 | — |
| icon-only sm | 28×28 | 0 | — |

## Heatmap 레벨 → 색
| lvl | bg | color | 의미 |
|---|---|---|---|
| 0 | #EEEEF0 | #A1A1AA | 미제출 |
| 1 | #dcdcdf | #1F1F24 | — |
| 2 | #9a9aa1 | #fff | maybe |
| 3 | #55555b | #fff | — |
| 4 | #0a0a0b | #fff | available |
| .ok | #059669 | #fff | 확정 |
| .no | #FCA5A5 | #7F1D1D | 불가 |

원본 styles.css의 `.btn/.card/.badge/.seg/.switch/.cbx/.tabs/.kv/.stat/.poster/.sched/.heatmap/.cal/.banner/.modal-root/.tweaks/.toast/.pwa-banner/.m-header/.m-bottom/.m-drawer/.m-fab/.sidebar/.topbar/.nav-item/.page/.page-head/.field/.input/.textarea/.select` 전부 globals.css에 이식 (프론트엔드 참조).
