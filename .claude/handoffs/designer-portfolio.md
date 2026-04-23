# Designer Handoff — Portfolio & Inquiry

## 개요

ONESHOT 댄스 크루 공개 포트폴리오 페이지(`/portfolio`)와 관리자 편집 화면(`/manage/portfolio`)의 UI/UX 명세.
기존 디자인 시스템(모노크롬 B/W, Pretendard, globals.css 토큰)을 그대로 계승하되, 공개 페이지는 내부 앱과 달리 **넓은 여백·큰 타이포그래피·어두운 히어로 배경**을 사용해 외부 방문자용 랜딩 분위기를 낸다.

---

## 1. 신규 생성 파일 트리

```
app/
  portfolio/
    layout.tsx                    # 공개 레이아웃 (헤더 최소화 + 푸터)
    page.tsx                      # Server Component, 병렬 데이터 fetch
    loading.tsx                   # 섹션 스켈레톤

  (main)/manage/portfolio/
    page.tsx                      # 관리자 탭 전환 페이지

components/
  portfolio/
    PublicHeader.tsx               # 로고 + 연락처 이메일 + 문의하기 CTA
    PublicFooter.tsx               # 연락처 재노출
    HeroSection.tsx
    AboutSection.tsx
    FeaturedMediaSection.tsx       # is_featured 영상 1~2개
    PerformanceVideoSection.tsx    # kind='performance' 그리드
    CoverVideoSection.tsx          # kind='cover'|'other_video' 탭 분기
    PhotoGallery.tsx               # kind='photo' 라이트박스 그리드
    CareerTimeline.tsx
    MemberCardGrid.tsx
    CtaFooterSection.tsx           # 큰 "섭외 문의하기" 버튼

    PerformanceVideoCard.tsx       # 개별 카드
    MemberCard.tsx                 # 멤버 카드
    VideoPlayerDialog.tsx          # YouTube iframe 다이얼로그
    InquiryDialog.tsx              # 공용 섭외 문의 다이얼로그
    InquiryForm.tsx                # Dialog 내부 실제 폼
    GenreBadge.tsx                 # 장르 배지

    admin/
      SectionEditor.tsx            # 소개 탭 — key/value 텍스트 편집
      MediaManager.tsx             # 미디어 탭 — kind 탭 + 리스트 + 편집 패널
      MediaEditPanel.tsx           # MediaManager 우측 편집 패널
      ImageUploader.tsx            # 드롭존 → 프로그레스 → 완료 썸네일
      CareerManager.tsx            # 경력 탭 — 리스트 + 편집 폼
      MemberPublicEditor.tsx       # 멤버 프로필 탭
      InquiryInbox.tsx             # 문의함 탭 — 리스트 + Sheet 상세
      InquiryStatusBadge.tsx       # new/in_review/contacted/closed 뱃지
```

---

## 2. 디자인 토큰 확장

`app/globals.css` `:root` 에 아래 변수를 추가한다.

```css
/* ── Portfolio 전용 토큰 ── */

/* 공개 페이지 히어로 배경 */
--pf-hero-bg:       #0A0A0B;       /* == --fg, 풀블랙 */
--pf-hero-fg:       #FFFFFF;
--pf-hero-muted:    rgba(255,255,255,0.55);

/* 섹션 간격 */
--pf-section-gap:   96px;          /* 데스크톱 섹션 상하 padding */
--pf-section-gap-md: 64px;         /* 태블릿 */
--pf-section-gap-sm: 48px;         /* 모바일 */

/* 섹션 최대폭 */
--pf-max-w:         1200px;
--pf-max-w-narrow:   840px;        /* 텍스트 위주 섹션 */

/* 경력 카테고리 배지 색 */
--career-performance-bg:  #EFF6FF;   /* info-bg */
--career-performance-fg:  #2563EB;
--career-broadcast-bg:    #FFFBEB;   /* warn-bg */
--career-broadcast-fg:    #D97706;
--career-commercial-bg:   #ECFDF5;   /* ok-bg */
--career-commercial-fg:   #059669;
--career-competition-bg:  #FEF2F2;   /* danger-bg */
--career-competition-fg:  #DC2626;
--career-workshop-bg:     #F4F4F5;   /* muted */
--career-workshop-fg:     #1F1F24;

/* 문의 status 배지 */
--inq-new-bg:          #EFF6FF;
--inq-new-fg:          #2563EB;
--inq-in_review-bg:    #FFFBEB;
--inq-in_review-fg:    #D97706;
--inq-contacted-bg:    #ECFDF5;
--inq-contacted-fg:    #059669;
--inq-closed-bg:       #F4F4F5;
--inq-closed-fg:       #71717A;
```

---

## 3. 공개 레이아웃 (`app/portfolio/layout.tsx`)

### 구조 개요

```
<body>
  <PublicHeader/>        # sticky top, z-50, bg blur
  <main>
    {children}           # page.tsx 섹션들
  </main>
  <PublicFooter/>
</body>
```

- `(main)` 레이아웃(사이드바, 바텀탭)과 **완전히 분리**된 독립 레이아웃
- 헤더 높이: 64px (데스크톱) / 54px (모바일)
- 배경: 공개 페이지 전체 `--bg` (#FAFAFA), 히어로 섹션만 `--pf-hero-bg`

### PublicHeader 구조

```
[로고 + "ONESHOT CREW"] — flex-1 — [이메일 텍스트 링크] — [버튼 "섭외 문의하기"]
```

- 로고: `img` 28px + bold 15px "원샷크루"
- 이메일: `a[href="mailto:…"]` 12px mono `--mf` (모바일에서 숨김, ≤640)
- 버튼: `.btn primary` "섭외 문의하기" → InquiryDialog(defaultTargetType='team') 트리거
- sticky 스크롤 시: `bg: rgba(255,255,255, 0.92) backdrop-filter: blur(10px)` + border-bottom

### PublicFooter 구조

```
────────────────────────────────────
  ONESHOT 크루 로고 + 이름
  연락처 이메일 (클릭 가능)
  연락처 전화 (있을 경우)
  ─ "섭외 문의하기" 링크 버튼 ─
  © 2024 ONESHOT CREW  (mono 10px mf)
────────────────────────────────────
```

- 배경: `--fg` (#0A0A0B), 텍스트: `#fff`, 패딩 64px 상하

---

## 4. 공개 페이지 섹션 레이아웃

### 공통 규칙

| 구분 | 모바일 (≤640) | 태블릿 (641–1023) | 데스크톱 (≥1024) |
|------|------------|---------------|--------------|
| 섹션 좌우 패딩 | 16px | 32px | max-width `--pf-max-w` + auto margin |
| 섹션 상하 padding | `--pf-section-gap-sm` (48px) | `--pf-section-gap-md` (64px) | `--pf-section-gap` (96px) |
| 섹션 제목 | 22px bold | 26px bold | 32px bold |

---

### 섹션 1 — Hero

**목적**: 첫인상 + 팀 소개 + 섭외 문의 CTA

```
[배경: --pf-hero-bg, min-height: 100svh]
  padding: 120px 16px 80px (모바일) / 140px 32px 100px (데스크톱)

  [상단 텍스트 블록, max-width: --pf-max-w-narrow]
    <span class="pf-eyebrow">ONESHOT CREW</span>   -- 11px mono uppercase muted
    <h1 class="pf-hero-title">                      -- serif italic, 48/64px
      {hero_title}
    </h1>
    <p class="pf-hero-sub">                         -- 16px, --pf-hero-muted
      {hero_subtitle}
    </p>
    <div class="pf-hero-cta-row">
      <button class="btn lg primary">섭외 문의하기</button>
      <a class="btn lg ghost pf-ghost">공연 영상 보기 ↓</a>  -- 페이지 내 앵커
    </div>

  [히어로 미디어 영역]
    is_featured hero_video → YouTube 썸네일 (aspect 16:9, overlay play 버튼)
                             클릭 시 VideoPlayerDialog
    hero_image (fallback) → next/image priority fill, object-cover
    둘 다 없음 → 텍스트 레이아웃만 (미디어 영역 숨김)
```

**반응형**:
- 모바일: 텍스트 상단 / 미디어 하단 (세로 스택)
- 데스크톱: 좌우 2열 (텍스트 60% / 미디어 40%) → CSS Grid `1fr 0.7fr` gap 48px

**접근성**:
- `<h1>` 은 페이지당 1개, hero_title 내용
- 히어로 이미지: `alt="{hero_title} 팀 사진"`
- CTA 버튼: `aria-haspopup="dialog"`
- 영상 썸네일 오버레이 버튼: `aria-label="대표 영상 재생"`

---

### 섹션 2 — About

**목적**: 팀 소개 텍스트 + 장르 배지

```
[배경: --bg, 섹션 ID: "about"]
  <h2>팀 소개</h2>

  [2열 그리드 (모바일: 1열)]
    col-1: 텍스트 블록
      <p>{about_team}</p>          -- 16px line-height:1.8

    col-2: 장르 배지 클러스터
      <div class="genre-badges">
        {genres.split(',').map(g => <GenreBadge genre={g}/>)}
      </div>
```

**GenreBadge**: `badge outline` + 장르 아이콘(Music2, Waves 등 lucide). 크기 `.lg` variant.

---

### 섹션 3 — 대표 영상

**목적**: is_featured 영상 1~2개 크게 임베드

```
[배경: --muted, 섹션 ID: "featured-video"]
  <h2>대표 영상</h2>

  [1~2개 그리드]
    1개: 가운데 정렬, max-width: 900px, aspect-ratio: 16/9
    2개: 2열 그리드, 각 aspect 16/9

  <iframe src={youtubeEmbed(id)} … loading="lazy" allow="autoplay; …"
    style="width:100%; aspect-ratio:16/9; border-radius: --radius-os-lg; border:0"/>

  데이터 없음: <EmptyState icon=Film message="대표 영상이 없습니다"/> (admin 로그인 시에만 표시)
```

---

### 섹션 4 — 공연 영상

**목적**: kind='performance' 카드 그리드, 각 카드에 "이 레퍼런스로 문의하기"

```
[배경: --bg, 섹션 ID: "performance"]
  <h2>공연 영상</h2>

  [그리드: 모바일 1열 / 태블릿 2열 / 데스크톱 3열]
    PerformanceVideoCard * n

  데이터 없음: EmptyState icon=Video message="공연 영상이 없습니다"
```

**PerformanceVideoCard 와이어프레임**:
```
┌─────────────────────────────┐
│  [썸네일 16:9]               │
│  ▶ 오버레이 버튼 (hover시 표시) │
├─────────────────────────────┤
│  제목 (14px bold, 2줄 clamp)  │
│  날짜  장소 (12px mf)         │
│  [멤버 아바타 스택 max:4+N더보기]│
├─────────────────────────────┤
│ [재생] [이 영상으로 문의하기→]   │
└─────────────────────────────┘
```

- 썸네일: `next/image` lazy, `sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"`
- hover 상태: 썸네일 위 반투명 overlay(rgba(0,0,0,0.4)) + ▶ Play icon(흰색 48px)
- "이 영상으로 문의하기": `.btn sm ghost` → `InquiryDialog(defaultReferenceMediaId=id, defaultTargetType='team')`

---

### 섹션 5 — 커버·기타 영상

**목적**: kind='cover' / 'other_video' 탭 분기 그리드

```
[배경: --muted, 섹션 ID: "cover-video"]
  <h2>영상</h2>

  <Tabs defaultValue="cover">
    <TabsList>
      <TabsTrigger value="cover">커버 영상 ({count})</TabsTrigger>
      <TabsTrigger value="other">기타 영상 ({count})</TabsTrigger>
    </TabsList>
    <TabsContent value="cover">
      [그리드 3열: VideoCard (썸네일 + 제목)]
    </TabsContent>
    <TabsContent value="other">
      [그리드 3열: VideoCard]
    </TabsContent>
  </Tabs>
```

- shadcn `Tabs` 컴포넌트(`components/ui/tabs.tsx`) 재사용
- 각 VideoCard: 썸네일 hover→play 아이콘, 클릭→VideoPlayerDialog

---

### 섹션 6 — 포토 갤러리

**목적**: kind='photo' 이미지 그리드, 클릭 시 라이트박스

```
[배경: --bg, 섹션 ID: "gallery"]
  <h2>포토 갤러리</h2>

  [Masonry-like 그리드]
    모바일:  columns 2, gap 8px
    태블릿: columns 3, gap 10px
    데스크톱: columns 4, gap 12px

  PhotoThumbnail (aspect-square, object-cover, radius 8)
    hover: scale(1.03) + overlay, cursor:zoom-in
    클릭 → LightboxDialog

  LightboxDialog:
    <Dialog fullscreen(max-w: 90vw, max-h: 90vh)>
      <img 현재 사진 object-contain/>
      prev / next 화살표 버튼 (absolute left/right)
      닫기 X (absolute top-right)
      번호 표시 (3/12)
    </Dialog>

  데이터 없음: EmptyState icon=Image message="사진이 없습니다"
```

- `next/image` 모두 lazy (`loading="lazy"`, `priority` 없음)
- LightboxDialog: 키보드 ← → 화살표 탐색, ESC 닫기

---

### 섹션 7 — 경력

**목적**: portfolio_careers 타임라인

```
[배경: --muted, 섹션 ID: "career"]
  <h2>주요 경력</h2>

  연도별 그룹핑:
    <div class="pf-year-group">
      <div class="pf-year-label">2024</div>  -- 20px bold, sticky on scroll (data attr)

      <div class="pf-timeline">
        CareerItem * n
          ┌─ 왼쪽: 날짜 col (mono 12px mf, min-w:80px)
          │  YYYY.MM.DD
          │
          ├─ 세로선 (2px, --border-2)
          │
          └─ 오른쪽: 콘텐츠
             CategoryBadge (경력 카테고리 색상)
             제목 (14px bold)
             location (12px mf, MapPin 아이콘)
             description (12px, 클램프 2줄)
             [관련 영상 링크] (있을 경우, 12px info)
      </div>
    </div>

  데이터 없음: EmptyState icon=Trophy message="경력이 없습니다"
```

**CategoryBadge 색상 맵**:
| category | bg | fg |
|----------|----|----|
| performance | `--career-performance-bg` | `--career-performance-fg` |
| broadcast | `--career-broadcast-bg` | `--career-broadcast-fg` |
| commercial | `--career-commercial-bg` | `--career-commercial-fg` |
| competition | `--career-competition-bg` | `--career-competition-fg` |
| workshop | `--career-workshop-bg` | `--career-workshop-fg` |

**한국어 레이블 맵**:
| value | 표시 |
|-------|------|
| performance | 공연 |
| broadcast | 방송 |
| commercial | CF·광고 |
| competition | 대회 |
| workshop | 워크숍 |

---

### 섹션 8 — 멤버

**목적**: is_public 멤버 카드 그리드, 카드 클릭→개인 섭외 문의

```
[배경: --bg, 섹션 ID: "members"]
  <h2>멤버 소개</h2>

  [그리드: 모바일 2열 / 태블릿 3열 / 데스크톱 4열]

  MemberCard:
    ┌──────────────────┐
    │ [프로필 사진]      │  aspect 4:5, object-cover
    │  또는 Av 이니셜    │  배경 --fg, 색 #fff, 글자 20px
    │                  │
    │  stage_name bold │  14px
    │  position        │  12px mf
    │  public_bio      │  11px mf, 2줄 clamp
    │  specialties 칩  │  badge xs, max 3개
    │ [섭외 문의하기→]  │  btn sm ghost
    └──────────────────┘

  hover: 카드 전체 translateY(-2px) + shadow-md

  데이터 없음: EmptyState icon=Users message="공개된 멤버가 없습니다"
```

- 클릭(카드 전체 or 버튼): `InquiryDialog(defaultTargetType='member', defaultMemberId=id)`

---

### 섹션 9 — CTA 푸터

```
[배경: --pf-hero-bg, 섹션 ID: "cta", padding: 80px 16px]
  가운데 정렬:
    <p class="pf-cta-eyebrow">ONESHOT CREW와 함께하세요</p>  -- 11px mono uppercase
    <h2 class="pf-cta-title">                                -- 36/28px serif italic
      특별한 순간을 만들어 드립니다
    </h2>
    <button class="btn lg primary pf-cta-btn">              -- 흰 배경 + --fg 텍스트
      섭외 문의하기
    </button>
    <p class="pf-cta-sub">{contact_email}</p>               -- 14px --pf-hero-muted
```

---

## 5. InquiryDialog / InquiryForm 와이어프레임

### InquiryDialog 트리거 매핑

| 트리거 위치 | defaultTargetType | defaultMemberId | defaultReferenceMediaId |
|-----------|-----------------|----------------|------------------------|
| Hero/Footer/CTA 버튼 | 'team' | undefined | undefined |
| 공연 영상 카드 "이 영상으로 문의" | 'team' | undefined | media.id |
| 멤버 카드 "섭외 문의하기" | 'member' | member.id | undefined |

### InquiryDialog 구조

```
<Dialog> (shadcn Dialog, max-w: 600px, 모바일: bottom sheet)
  <DialogHeader>
    <DialogTitle>섭외 문의하기</DialogTitle>
    <DialogDescription>문의 내용을 작성해 주세요.</DialogDescription>
  </DialogHeader>

  <InquiryForm ...props/>

  <!-- 닫기 버튼: absolute top-4 right-4, X 아이콘 -->
```

모바일(≤640)에서는 shadcn `Sheet` 컴포넌트의 side="bottom" 방식으로 전환.
구현 방법: `useMediaQuery` 금지 → CSS로 `.pf-inquiry-dialog` `.pf-inquiry-sheet` 각각 `display:none` 분기.
대안: `Dialog`를 유지하되 `className="sm:max-w-[600px] max-h-[90dvh] overflow-y-auto"`.

### InquiryForm 필드 순서

```
SECTION 1: 문의 대상
  [라디오: 팀 전체 / 개인 멤버]
    target_type='member' 선택 시 아래 Combobox 표시:
    <Command> 멤버 검색 Combobox (stage_name + position 표시)
    role="combobox", aria-label="멤버 선택"

SECTION 2: 기본 정보
  [Select] 섭외 종류 *
    options: 공연 / 방송 / CF·광고 / 워크숍 / 기타

  [Input] 이름 * (requester_name)
  [Input] 소속 기관 (requester_organization)
  [Input type=email] 이메일 * (requester_email)
  [Input type=tel] 연락처 (requester_phone)

SECTION 3: 행사 정보
  [Input] 지역 (region, placeholder: "서울 강남구")
  [Input type=date] 희망 날짜 (시작) (event_date_start)
  [Input type=date] 희망 날짜 (끝, 선택) (event_date_end)
  [Input] 희망 시간 (event_time, placeholder: "예: 19:00~21:00")

SECTION 4: 예산
  [라디오: 고정 예산 / 범위 예산 / 미정]
    budget_type='fixed' → [Input type=number] 금액 (원)
    budget_type='range' → [Input number] 최소 + "~" + [Input number] 최대 (원)
    budget_type='tbd'   → (필드 없음)

SECTION 5: 레퍼런스 (reference_media_id가 있을 때만)
  [read-only 카드]
    썸네일(40px) + 제목 + "이 영상을 레퍼런스로 문의합니다"
    X 버튼 → reference_media_id 초기화

SECTION 6: 상세 메시지
  [Textarea] 상세 메시지 * (min 10자, max 4000자, rows=5)
  글자수 표시: "0/4000" (tabnum mono 11px, 우하단)

HONEYPOT (hidden):
  <input type="text" name="_hp" tabIndex={-1} aria-hidden="true"
    style={{position:'absolute', left:'-9999px', width:'1px', height:'1px'}}/>

SUBMIT:
  [btn primary lg w-full] "문의 전송"
    - 제출 중: Loader2 아이콘 + "전송 중..." + disabled
    - 5초 쿨다운 후 재활성화
```

### 에러/성공 처리

- **필드 에러**: `<small style={{color:'var(--danger)', fontSize:11}}>` — 해당 필드 바로 아래
- **제출 에러 (API)**: `sonner toast.error("문의 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.")` — 상단 고정 토스트
- **성공**: Dialog 닫기 + `toast.success("문의가 접수되었습니다. 빠른 시일 내에 연락 드리겠습니다.")` 4초 표시

### 제출 성공 모달 (선택적 대체)

성공 후 Dialog 내용을 교체하는 방식:
```
DialogContent 교체:
  [Check 아이콘 원형 48px, bg: --ok-bg, color: --ok]
  "문의가 접수되었습니다"  (16px bold)
  "담당자 확인 후 이메일로 연락 드리겠습니다."  (14px mf)
  [btn primary "확인"] → Dialog 닫기
```

---

## 6. 관리자 `/manage/portfolio` 탭 구성

### 탭 바 (shadcn Tabs 재사용)

```
<Tabs defaultValue="intro">
  <TabsList>
    <TabsTrigger value="intro">소개</TabsTrigger>
    <TabsTrigger value="media">미디어</TabsTrigger>
    <TabsTrigger value="career">경력</TabsTrigger>
    <TabsTrigger value="members">멤버 프로필</TabsTrigger>
    <TabsTrigger value="inquiries">
      문의함
      {newCount > 0 && <span class="count">{newCount}</span>}
    </TabsTrigger>
  </TabsList>
  ...
```

---

### 탭 1 — 소개 (SectionEditor)

```
page-head: h1 "포트폴리오" + crumb "소개"

.card
  [SectionEditor]
    각 key 순서대로:
    ┌─────────────────────────────────┐
    │ hero_title *                    │
    │ [Input]                         │
    │                                 │
    │ hero_subtitle                   │
    │ [Input]                         │
    │                                 │
    │ about_team (팀 소개)            │
    │ [Textarea rows=6]               │
    │                                 │
    │ genres (장르, 쉼표 구분)         │
    │ [Input placeholder="K-pop, 한국무용"]│
    │ 미리보기: [배지][배지][배지]      │
    │                                 │
    │ contact_email *                 │
    │ [Input type=email]              │
    │                                 │
    │ contact_phone                   │
    │ [Input type=tel]                │
    └─────────────────────────────────┘
  [btn primary "저장"] (우하단, sticky footer or inline)
  저장 중: disabled + spinner
  저장 성공: toast "저장되었습니다"
```

---

### 탭 2 — 미디어 (MediaManager) — Split 레이아웃

```
데스크톱 (≥900px): 좌 280px 리스트 + 우 flex-1 편집 패널 (border-left)
모바일: 리스트 전체폭, 항목 클릭 시 편집 패널이 Sheet(side=right)로 열림

[MediaManager 전체 구조]
  kind 필터 탭 (언더라인 스타일):
    [대표(hero)] [공연] [커버] [사진] [기타]

  좌측 리스트:
    ┌─ 항목 ────────────────────────────┐
    │ ⠿ (drag handle or ↑↓ 버튼)       │
    │ [썸네일 40px] 제목 / 날짜          │
    │ is_featured 시 ★ 아이콘          │
    │ 선택된 항목: bg--muted, border-l-2 fg │
    └───────────────────────────────────┘
    하단: [+ 새 항목 추가] btn ghost sm

  우측 편집 패널 (MediaEditPanel):
    [항목 선택 전] → "항목을 선택하거나 새 항목을 추가하세요" EmptyState

    [항목 선택 후]
    .field 종류 (kind Badge, read-only, 변경 시 리스트에서 이동)
    .field 제목
    .field 설명 (Textarea)
    .field YouTube URL (영상 kind만 표시)
      → 입력 후 blur: URL 검증, 유효하면 썸네일 자동 미리보기
    .field 이미지 업로드 (사진/hero_image kind만)
      → ImageUploader
    .field 썸네일 업로드 (영상 kind — 유튜브 자동썸네일 or 직접 업로드)
    .field 공연 날짜 (performance kind만)
    .field 장소 (performance kind만)
    .field 대표 여부 [Switch] is_featured
    .field 참여 멤버 (영상 kind만, multi-select Command combobox)
    [btn primary "저장"] [btn ghost danger "삭제"]
```

#### ImageUploader 상태 흐름

```
[초기]
  ┌─────────────────────────────┐
  │  ⬆ 이미지를 드래그하거나      │
  │    클릭하여 업로드하세요       │
  │  JPG, PNG, WebP, GIF (최대 5MB) │
  └─────────────────────────────┘

[드래그 오버]
  border: 2px dashed --info, bg: --info-bg

[업로드 중]
  ProgressBar (0–100%) + 파일명 + "취소" btn

[완료]
  썸네일 이미지 (80px × 80px, radius 8) + "변경" btn + "삭제" btn

[에러]
  icon=AlertCircle + 에러 메시지 (danger 색)
```

---

### 탭 3 — 경력 (CareerManager)

```
[상단 카테고리 필터 Seg]
  전체 | 공연 | 방송 | CF·광고 | 대회 | 워크숍

[리스트 + 편집 패널] (미디어 탭과 동일한 Split 패턴)

  좌측 리스트:
    ┌─ 경력 항목 ──────────────────────┐
    │ [카테고리 배지] 제목               │
    │ 날짜 (YYYY.MM.DD) · 장소           │
    └───────────────────────────────────┘
    sort_order ↑↓ 버튼
    [+ 새 경력 추가] btn ghost sm

  우측 편집 패널:
    .field 제목 *
    .field 카테고리 (Select)
    .field 날짜 (date input)
    .field 장소
    .field 설명 (Textarea)
    .field 관련 링크 URL
    .field 연관 미디어 (영상 ID select, 선택)
    [btn primary "저장"] [btn ghost danger "삭제"]
```

---

### 탭 4 — 멤버 프로필 (MemberPublicEditor)

```
[검색 Input] "멤버 검색..."

[Table 형식] (모바일: 카드 리스트)
  thead: 멤버 / 공개 여부 / 사진 / 소개 / 특기 / 액션
  tbody:
    row:
      [Av 28] name + stage_name
      [Switch] is_public
      [사진 40px or 없음 icon] + "변경" 버튼
      public_bio 50자 clamp
      specialties 배지 최대 3개
      [편집 ✏] → 인라인 expand row or Sheet

  편집 Sheet (side=right):
    .field 공개 여부 [Switch]
    .field 공개 소개 (Textarea max 500자)
    .field 특기 (multi-select Command, 옵션: K-pop, 한국무용, 현대무용, 댄스스포츠, 창작안무)
    .field 프로필 사진 [ImageUploader]
    [btn primary "저장"]
```

---

### 탭 5 — 문의함 (InquiryInbox)

```
[상태 필터 탭]
  전체({total}) | 신규({new}) | 검토중 | 연락완료 | 종료

[페이지당 20개, 목록 + 페이지네이션]

  문의 리스트:
    ┌─ Row ──────────────────────────────────────────┐
    │ InquiryStatusBadge  제목(대상+종류)  날짜(mono) │
    │ requester_name · requester_organization         │
    └─────────────────────────────────────────────────┘
    제목 예: "팀 전체 · 공연" / "홍길동 · 방송"

  행 클릭 → Sheet (side=right, max-w: 480px)

  상세 Sheet:
    [상단] InquiryStatusBadge + 접수 일시 (mono)
    [상태 변경] Select (new→in_review→contacted→closed)
    ─────────
    [문의 정보 KVList]
      대상:        팀 전체 / {member stage_name}
      섭외 종류:   공연 / 방송 / CF·광고 / 워크숍 / 기타
      이름:        {requester_name}
      소속:        {requester_organization}
      이메일:      {requester_email} [복사 아이콘]
      연락처:      {requester_phone} [복사 아이콘]
      지역:        {region}
      희망 날짜:   {event_date_start} ~ {event_date_end}
      희망 시간:   {event_time}
      예산:        고정 {N}만원 / {min}~{max}만원 / 미정
    ─────────
    [레퍼런스 영상] (있을 때) 썸네일 40px + 제목 + 재생 링크
    ─────────
    [상세 메시지]
      <blockquote style={{borderLeft: '3px solid --border-2', pl:12}}>
        {message}
      </blockquote>
    ─────────
    [관리자 메모]
      <Textarea> admin_memo (rows=3)
    ─────────
    [btn danger ghost sm "삭제"]
    [btn primary "저장"]
```

**InquiryStatusBadge 색상**:
| status | 표시 텍스트 | bg | fg |
|--------|------------|----|----|
| new | 신규 | `--inq-new-bg` | `--inq-new-fg` |
| in_review | 검토중 | `--inq-in_review-bg` | `--inq-in_review-fg` |
| contacted | 연락완료 | `--inq-contacted-bg` | `--inq-contacted-fg` |
| closed | 종료 | `--inq-closed-bg` | `--inq-closed-fg` |

---

## 7. 컴포넌트 Props 인터페이스 (TypeScript)

### 공개 페이지 컴포넌트

```typescript
// components/portfolio/HeroSection.tsx
interface HeroSectionProps {
  title: string;
  subtitle: string;
  heroMedia?: PortfolioMediaWithMembers | null;  // is_featured hero_video or hero_image
  onInquire: () => void;
}

// components/portfolio/AboutSection.tsx
interface AboutSectionProps {
  aboutText: string;
  genres: string[];  // parsed from comma-separated DB value
}

// components/portfolio/FeaturedMediaSection.tsx
interface FeaturedMediaSectionProps {
  items: PortfolioMediaWithMembers[];  // is_featured=true 영상 1~2개
}

// components/portfolio/PerformanceVideoSection.tsx
interface PerformanceVideoSectionProps {
  items: PortfolioMediaWithMembers[];
  onInquireWithRef: (mediaId: string) => void;
}

// components/portfolio/PerformanceVideoCard.tsx
interface PerformanceVideoCardProps {
  media: PortfolioMediaWithMembers;
  onPlay: (mediaId: string) => void;
  onInquire: (mediaId: string) => void;
}

// components/portfolio/CoverVideoSection.tsx
interface CoverVideoSectionProps {
  coverItems: PortfolioMediaWithMembers[];
  otherItems: PortfolioMediaWithMembers[];
}

// components/portfolio/PhotoGallery.tsx
interface PhotoGalleryProps {
  photos: PortfolioMediaWithMembers[];
}

// components/portfolio/CareerTimeline.tsx
interface CareerTimelineProps {
  careers: PortfolioCareerWithMedia[];
}

// components/portfolio/MemberCardGrid.tsx
interface MemberCardGridProps {
  members: PublicCrewMember[];
  onInquire: (memberId: string) => void;
}

// components/portfolio/MemberCard.tsx
interface MemberCardProps {
  member: PublicCrewMember;
  onInquire: (memberId: string) => void;
}

// components/portfolio/CtaFooterSection.tsx
interface CtaFooterSectionProps {
  contactEmail: string;
  onInquire: () => void;
}

// components/portfolio/VideoPlayerDialog.tsx
interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: PortfolioMediaWithMembers | null;
}

// components/portfolio/InquiryDialog.tsx
interface InquiryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTargetType?: 'team' | 'member';
  defaultMemberId?: string;
  defaultReferenceMediaId?: string;
  defaultInquiryType?: 'performance' | 'broadcast' | 'commercial' | 'workshop' | 'other';
  members: PublicCrewMember[];              // Combobox 옵션용
  referenceMediaMap?: Record<string, PortfolioMediaWithMembers>;  // reference 미리보기용
}

// components/portfolio/InquiryForm.tsx
interface InquiryFormProps {
  defaultTargetType: 'team' | 'member';
  defaultMemberId?: string;
  defaultReferenceMediaId?: string;
  defaultInquiryType?: string;
  members: PublicCrewMember[];
  referenceMediaMap: Record<string, PortfolioMediaWithMembers>;
  onSuccess: () => void;
}

// components/portfolio/GenreBadge.tsx
interface GenreBadgeProps {
  genre: string;  // raw value from DB: e.g. "K-pop", "한국무용"
  size?: 'default' | 'lg';
}
```

### 관리자 컴포넌트

```typescript
// components/portfolio/admin/SectionEditor.tsx
interface SectionEditorProps {
  sections: Record<PortfolioSectionKey, string>;  // 초기값
}

// components/portfolio/admin/MediaManager.tsx
interface MediaManagerProps {
  initialItems: PortfolioMediaWithMembers[];
  members: PublicCrewMember[];  // 멤버 태깅용
}

// components/portfolio/admin/MediaEditPanel.tsx
interface MediaEditPanelProps {
  item: PortfolioMediaWithMembers | null;  // null = 새 항목 모드
  kind: PortfolioMediaKind;
  members: PublicCrewMember[];
  onSave: (data: PortfolioMediaInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

// components/portfolio/admin/ImageUploader.tsx
interface ImageUploaderProps {
  value?: string;           // 현재 URL (기존 이미지)
  kind: 'hero' | 'photos' | 'thumbnails' | 'members';  // storage path prefix
  onChange: (publicUrl: string) => void;
  onClear?: () => void;
  accept?: string;          // default: "image/jpeg,image/png,image/webp,image/gif,image/avif"
  maxSizeMb?: number;       // default: 5
}

// components/portfolio/admin/CareerManager.tsx
interface CareerManagerProps {
  initialCareers: PortfolioCareerWithMedia[];
  mediaOptions: PortfolioMediaWithMembers[];  // 연관 영상 선택용
}

// components/portfolio/admin/MemberPublicEditor.tsx
interface MemberPublicEditorProps {
  members: CrewMemberWithPublicFields[];   // is_active=true 멤버 전체
}

// components/portfolio/admin/InquiryInbox.tsx
interface InquiryInboxProps {
  initialInquiries: PortfolioInquiry[];
  initialTotal: number;
}

// components/portfolio/admin/InquiryStatusBadge.tsx
interface InquiryStatusBadgeProps {
  status: 'new' | 'in_review' | 'contacted' | 'closed';
  size?: 'default' | 'sm';
}
```

---

## 8. 상태 명세 (loading / empty / error / success)

### 공개 페이지 전체 로딩 (`app/portfolio/loading.tsx`)

```
PublicHeader (실제 렌더, sticky)
HeroSection 스켈레톤:
  배경 --pf-hero-bg
  [sk h=40 w=200]  제목 스켈레톤
  [sk h=20 w=320]  서브제목 스켈레톤
  [sk h=42 w=140]  CTA 버튼 스켈레톤

AboutSection 스켈레톤:
  [sk h=24 w=120]  섹션 제목
  [sk h=80 w=full] 텍스트 블록
  [sk h=32 w=200]  배지 줄

MediaGrid 스켈레톤:
  [sk h=200 aspect=16/9 × 3열]  썸네일

CareerTimeline 스켈레톤:
  [sk h=20 × 4행]  타임라인 항목

MemberGrid 스켈레톤:
  [sk h=280 × 4열]  멤버 카드
```

Skeleton 클래스: 기존 `.sk + pulse animation` 재사용.

### 섹션별 Empty 상태

| 섹션 | 아이콘 | 메시지 | 표시 조건 |
|------|--------|--------|----------|
| 대표 영상 | Film | "대표 영상이 준비 중입니다" | 비로그인 방문자에게도 표시 |
| 공연 영상 | Video | "공연 영상이 없습니다" | data.length === 0 |
| 커버 영상 | Music | "커버 영상이 없습니다" | tab 내 count === 0 |
| 포토 갤러리 | Image | "사진이 없습니다" | photos.length === 0 |
| 경력 | Trophy | "경력이 없습니다" | careers.length === 0 |
| 멤버 | Users | "공개된 멤버가 없습니다" | members.length === 0 |

### 관리자 탭 Empty 상태

| 탭 | 아이콘 | 메시지 | 액션 버튼 |
|----|--------|--------|----------|
| 미디어 (kind별) | Film/Image | "이 종류의 미디어가 없습니다" | "+ 새 항목 추가" |
| 경력 | Trophy | "경력이 없습니다" | "+ 새 경력 추가" |
| 멤버 프로필 | Users | "멤버가 없습니다" | — |
| 문의함 | Inbox | "문의가 없습니다" | — |

### 에러 상태

- **공개 페이지 전체 fetch 실패** (`error.tsx`): AlertTriangle + "포트폴리오를 불러올 수 없습니다" + "다시 시도" 버튼
- **섹션별 fetch 실패**: 섹션 내부에 `<div class="pf-section-error">` + AlertCircle + "이 섹션을 불러오지 못했습니다"
- **문의 제출 실패**: `toast.error(message)` - `sonner` 사용 (이미 설치: `components/ui/sonner.tsx`)
- **이미지 업로드 실패**: Uploader 컴포넌트 내부 인라인 에러 메시지
- **관리자 저장 실패**: `toast.error("저장에 실패했습니다. 다시 시도해 주세요.")`

---

## 9. 반응형 규칙

| 요소 | 모바일 (≤640) | 태블릿 (641–1023) | 데스크톱 (≥1024) |
|------|------------|---------------|--------------|
| Hero 레이아웃 | 세로 단일 컬럼 | 세로 단일 컬럼 | 가로 2열 (60/40) |
| Hero 타이포 | h1: 32px | h1: 42px | h1: 56px |
| 공연 영상 그리드 | 1열 | 2열 | 3열 |
| 커버 영상 그리드 | 1열 | 2열 | 3열 |
| 포토 갤러리 columns | 2 | 3 | 4 |
| 멤버 그리드 | 2열 | 3열 | 4열 |
| MediaManager 레이아웃 | Sheet 모달 | Sheet 모달 | Split (280+flex) |
| CareerManager 레이아웃 | Sheet 모달 | Sheet 모달 | Split (280+flex) |
| InquiryInbox Sheet 폭 | 100vw | 400px | 480px |
| PublicHeader 이메일 | 숨김 | 표시 | 표시 |
| 섹션 좌우 패딩 | 16px | 32px | auto (max-w) |

---

## 10. 접근성 요점

### 포커스 순서 (공개 페이지)

1. PublicHeader: 로고(링크) → 이메일 링크 → "섭외 문의하기" 버튼
2. Hero: 제목(h1) → 서브제목 → "섭외 문의하기" → "공연 영상 보기"
3. About: 섹션 제목 → 텍스트 → 배지들
4. 대표 영상: 섹션 제목 → iframe(title 속성 필수: "ONESHOT 크루 대표 영상")
5. 공연 영상: 섹션 제목 → 카드 루프(썸네일 버튼 → 문의 버튼)
6. … (섹션 순서)
7. CTA: h2 → "섭외 문의하기" 버튼

### aria 속성 필수 목록

```
PublicHeader 문의 버튼:
  aria-haspopup="dialog"

InquiryDialog:
  <Dialog> role="dialog" aria-modal="true" aria-labelledby="inquiry-title"
  <DialogTitle id="inquiry-title">섭외 문의하기</DialogTitle>
  닫기 버튼: aria-label="닫기"

멤버 Combobox:
  <button role="combobox" aria-expanded aria-haspopup="listbox"
    aria-label="섭외 대상 멤버 선택">
  <ul role="listbox" aria-label="멤버 목록">

YouTube iframe:
  title="[영상 제목] — YouTube 영상"

VideoPlayerDialog:
  role="dialog" aria-modal="true" aria-label="영상 재생"
  닫기: aria-label="영상 닫기"

LightboxDialog:
  이전 버튼: aria-label="이전 사진"
  다음 버튼: aria-label="다음 사진"
  닫기: aria-label="갤러리 닫기"
  현재 이미지: alt="갤러리 사진 {index+1}/{total}"

InquiryStatusBadge:
  role="status" aria-label="문의 상태: {statusText}"

ImageUploader 드롭존:
  role="button" tabIndex={0} aria-label="이미지 업로드 영역, 클릭하거나 파일을 드래그하세요"
  onKeyDown Enter/Space → input.click()

관리자 Switch (is_public):
  role="switch" aria-checked={isPublic} aria-label="{name} 공개 여부"
```

### 키보드 탐색

- LightboxDialog: ← → 이전/다음, ESC 닫기
- VideoPlayerDialog: ESC 닫기
- InquiryDialog: ESC 닫기, Tab 순환(포커스 트랩)
- 관리자 Sheet: ESC 닫기
- 멤버 Combobox: ↑↓ 탐색, Enter 선택, ESC 닫기 (shadcn Command 기본 동작)
- 이미지 Uploader: Enter/Space 클릭 트리거

### 색상 대비

- `--pf-hero-fg` (#fff) on `--pf-hero-bg` (#0A0A0B): 21:1 (AAA)
- `--pf-hero-muted` (rgba(255,255,255,0.55)) on `--pf-hero-bg`: ~8:1 (AA) — 최소 요구 충족
- 모든 배지 텍스트: AA 기준 4.5:1 이상 — 기존 토큰값 유지

---

## 11. 다크모드 고려

현재 프로젝트는 **다크모드 미지원** (globals.css에 `@media (prefers-color-scheme: dark)` 없음). 이번 포트폴리오 기능도 다크모드 지원 없이 라이트 단색으로 통일.

단, 히어로 섹션(`--pf-hero-bg: #0A0A0B`)과 CTA 섹션은 항상 어두운 배경이므로 `forced-colors: active` 미디어 쿼리 시 Windows 고대비 모드 대응:
```css
@media (forced-colors: active) {
  .pf-hero-section, .pf-cta-section {
    background: ButtonText;
    color: ButtonFace;
  }
}
```

---

## 12. 신규 필요 shadcn 컴포넌트

이미 설치된 컴포넌트 (`components/ui/`):
- `dialog.tsx`, `tabs.tsx`, `command.tsx`, `sheet.tsx`, `skeleton.tsx`, `select.tsx`, `textarea.tsx`, `input.tsx`, `badge.tsx`, `button.tsx`, `sonner.tsx`

추가 설치 불필요 — 위 목록으로 모든 UI 커버 가능. 단, `sheet.tsx`가 인콰이어리 모바일 대응과 관리자 편집 패널에 핵심적으로 사용된다.

---

## 13. 공개 헤더/푸터 CSS 클래스 명세

```css
/* PublicHeader */
.pf-header {
  position: sticky; top: 0; z-index: 50;
  height: 64px;
  display: flex; align-items: center;
  padding: 0 32px;
  gap: 16px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.pf-header-brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:15px; }
.pf-header-email { font-family:var(--font-mono); font-size:12px; color:var(--mf); }

/* Hero 전용 */
.pf-hero-section {
  background: var(--pf-hero-bg);
  color: var(--pf-hero-fg);
  min-height: 100svh;
  display: flex; align-items: center;
}
.pf-hero-title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 56px;
  line-height: 1.1;
  color: var(--pf-hero-fg);
}
@media (max-width: 1023px) { .pf-hero-title { font-size: 42px; } }
@media (max-width: 640px)  { .pf-hero-title { font-size: 32px; } }

.pf-eyebrow {
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--pf-hero-muted);
}

/* 섹션 공통 */
.pf-section {
  padding: var(--pf-section-gap) 0;
  max-width: var(--pf-max-w);
  margin: 0 auto;
  padding-inline: 32px;
}
@media (max-width: 1023px) { .pf-section { padding-block: var(--pf-section-gap-md); } }
@media (max-width: 640px)  { .pf-section { padding-block: var(--pf-section-gap-sm); padding-inline: 16px; } }

.pf-section-title {
  font-size: 32px; font-weight: 700;
  margin-bottom: 40px;
}
@media (max-width: 1023px) { .pf-section-title { font-size: 26px; margin-bottom: 28px; } }
@media (max-width: 640px)  { .pf-section-title { font-size: 22px; margin-bottom: 20px; } }

/* CTA 섹션 */
.pf-cta-section {
  background: var(--pf-hero-bg);
  color: var(--pf-hero-fg);
  text-align: center;
  padding: 80px 16px;
}
.pf-cta-title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 36px;
  color: var(--pf-hero-fg);
  margin-bottom: 32px;
}
@media (max-width: 640px) { .pf-cta-title { font-size: 28px; } }

/* PublicFooter */
.pf-footer {
  background: var(--pf-hero-bg);
  color: var(--pf-hero-fg);
  padding: 64px 32px;
  text-align: center;
}
```

---

## 14. globals.css 추가 위치

`app/globals.css`의 `/* ── Portfolio 전용 토큰 ── */` 블록은 `:root {}` 블록 내 맨 마지막에 삽입하고, `.pf-*` CSS 클래스들은 파일 맨 끝 `/* === PORTFOLIO === */` 주석 아래에 추가한다.
