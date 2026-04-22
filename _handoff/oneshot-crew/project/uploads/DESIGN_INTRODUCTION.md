# 원샷크루(OneShot Crew) 관리 툴 — 디자인 브리프

> **이 문서의 목적**: Claude(또는 어떤 디자인 에이전트)에게 **한 번에** 충분한 컨텍스트를 전달해 페이지별 시안을 일관성 있게 만들도록 하기 위한 단일 소스 오브 트루스.
> **읽는 순서**: 1장 → 2장 → 4장(브랜드) → 8장(페이지별 요청) 순으로 보면 충분합니다. 3·5·6장은 참조용.

---

## 1. 제품 한 줄 소개

**원샷크루 관리 툴**은 국내 댄스팀 원샷크루의 **내부 전용** 운영 플랫폼이다. 프로젝트 공지·지원·가용성 수집·선별·확정·정산까지 한 곳에서 끝낸다. 단일 팀(single-tenant) 전용이고, 외부에는 오픈콜 지원 링크와 공개 포트폴리오 정도만 노출한다.

---

## 2. 타겟 사용자 (페르소나)

### A. 운영진 (owner / admin) — **5명 이하, 사용 빈도 高**
- 주 업무: 행사 섭외 수락·공지 등록·지원자 리뷰·최종 확정·페이 정산
- 디바이스: 데스크탑/노트북 주 사용, 이동 중엔 모바일
- Pain point: 멤버별 가용성 조율이 반복됨, 정산 누락·실수 공포, 지원자 대량 처리
- **필요**: 고밀도 정보, 일괄 처리 UI, 표/필터, 상태 한눈에

### B. 계약멤버 (contract) — **10~20명, 일상 사용**
- 주 업무: 공지 확인·프로젝트 지원·가용성 제출·내 정산 확인
- 디바이스: **모바일 우세** (연습실·이동 중)
- Pain point: 일정 제출이 귀찮음, 확정 여부가 늦게 알려지는 답답함
- **필요**: 빠른 탭 이동, 지원·가용성 제출 최소 클릭, 알림 배지

### C. 비계약멤버·게스트 (non_contract / guest) — **프로젝트별 유동**
- 주 업무: 개별 프로젝트에 지원 → 확정되면 기본 정보만 공유
- 디바이스: 대부분 모바일, 첫 방문
- Pain point: 복잡한 폼에 대한 거부감, 무슨 팀인지 파악 필요
- **필요**: 공개 링크(`/apply/{slug}`)로 로그인 없이 접근, 가벼운 폼, 팀 소개 배치

---

## 3. 핵심 사용 시나리오 Top 5

> 디자이너가 디자인 판단에서 막히면 이 5개 시나리오의 **클릭 수·시선 흐름**을 기준으로 결정하세요.

1. **운영진 — 새 공지·프로젝트 등록 (주 1~3회)**
   `/admin/projects/new` 폼 → 저장 → `/admin/projects/[id]/manage` 로 바로 진입 → 지원 링크·QR 복사
2. **멤버 — 공지 확인 → 지원 → 가용성 제출 (월 4~8회)**
   홈 핀 공지 → 프로젝트 카드 → 지원+가용성 통합 폼 → "최근 내 가용성 불러오기" 클릭 → 제출
3. **운영진 — 지원자 선별·확정 (프로젝트당 1회, 15~30명 처리)**
   `/admin/projects/[id]/manage?tab=applicants` → 점수·메모 → 상태 토글 → 확정 버튼
4. **운영진 — 월말 정산 (월 1회)**
   `/admin/settlements` → 월 선택 → 상태별 요약 확인 → CSV 내보내기 → 이체 후 `paid` 전환
5. **멤버 — 내 일정 확인·충돌 체크 (수시)**
   `/calendar` → 이번달 그리드 → 확정(녹)·지원(노랑) 도트 → 날짜 탭

---

## 4. 브랜드 · 로고 · 톤 · 무드

### 4-0. 공식 로고

**파일**: `/public/oneshot_logo.png` (worktree 내 이미 배치됨)
**원본**: `C:/Users/그리고/Desktop/기타/udong/oneshot_logo.png`

**로고 설명**: "ONE SHOT"의 각 글자를 수직·수평으로 겹쳐 엮은 **모노크롬 세리프 타이포그래피 모노그램/엠블럼**. 블랙 라인 + 흰 배경의 정사각 구성. 장식적 커브(ligature)가 포함된 클래식한 인상.

**디자인 함의**
- 로고 자체가 **블랙 & 화이트 모노크롬**이므로, 제품 UI도 같은 톤을 중심축으로 잡아야 충돌하지 않는다.
- 로고의 세리프·장식성은 그대로 로고에만 두고, **본문/UI 타이포는 대비되는 산세리프(Pretendard)** 로 모던하게 간다 — 이 대비가 브랜드의 "클래식 엠블럼 × 현대적 도구" 인상을 만든다.
- 채도 높은 Accent(형광 라임 등)는 로고의 격(格)과 충돌할 수 있어 **기본 제외**. Accent는 상태 시그널(승인·지급완료·긴급)에만 **매우 제한적**으로 사용.

**로고 사용 가이드**
| 상황 | 가이드 |
|---|---|
| 최소 크기 | 24×24px (모바일 헤더), 32×32px (데스크탑 사이드바), 64×64px (로그인 상단) |
| 여백 (clear space) | 로고 바깥으로 로고 높이의 **25%** 확보 |
| 배경 | 흰색·크림·옅은 그레이(`#FAFAFA~#F4F4F5`) 위에 **그대로**. 다크 모드에서는 **반전 버전** 필요 — 디자이너가 `oneshot_logo_dark.png` (흰 라인+투명/블랙 배경) 제작 |
| 금지 | 회전·기울임·컬러 필터·그림자·스트로크 추가·배경 그라데이션 위 배치 |
| 파비콘 | `app/layout.tsx` metadata.icons 와 `public/manifest.json` 에 이미 연결됨. 매우 작은 크기(16×16)에서도 식별 가능하도록 디자이너가 **단순화된 아이콘 버전**(예: "OS" 모노그램만) 별도 제작 권장 |

**워드마크 병기**
- 사이드바·로그인 헤더에서 로고 이미지 + 우측에 `원샷크루` 텍스트(`font-bold tracking-tight`)를 병기
- 로고와 텍스트 사이 간격 `gap-2`
- 텍스트 대신 로고만 배치하는 케이스: 모바일 헤더 중앙, BottomNav 상단(있다면), 파비콘

### 4-1. 키워드
`클래식 엠블럼` × `모던 그리드` · `모노크롬 + 최소 Accent` · `정보 밀도 높지만 여백 충분` · `한국어 타이포 우선`

### 4-2. 무드보드 레퍼런스
- **Linear · Notion · Vercel 대시보드** — 정보 밀도와 여백 균형
- **A24 영화사 웹사이트** — 모노크롬 + 세리프 로고 + 산세리프 본문 대비
- **Kinfolk Magazine · COS** — 클래식 타이포그래피와 현대적 레이아웃의 만남
- **피해야 할 것**: 알록달록한 SaaS 풍, 네온·그라데이션 과용, 유치한 일러스트, 아이돌 팬사이트 톤, 과장된 microinteraction

### 4-3. 컬러 팔레트 (shadcn 기본 위에 커스터마이즈)

| 역할 | 라이트 | 다크 | 비고 |
|---|---|---|---|
| Background | `#FAFAFA` (오프화이트) / 순백 `#FFFFFF` | `#0A0A0B` | 오프화이트 추천 — 순백은 로고의 라인과 경계가 흐려짐 |
| Foreground | `#0A0A0B` | `#FAFAFA` | |
| **Primary (브랜드)** | **`#0A0A0B`** | **`#FAFAFA`** | 블랙 필 버튼 = 로고 블랙과 동일 톤 |
| Muted / Card | `#F4F4F5` | `#18181B` | |
| Border | `#E4E4E7` | `#27272A` | |
| Muted Foreground | `#71717A` | `#A1A1AA` | |
| **Accent (최소 사용)** | **`#1F1F24`** (거의 블랙, 미묘한 톤 대비) — 기본 | — | 과감한 포인트는 로고와 충돌. 뱃지·CTA 기본은 블랙/화이트로 충분 |
| Success (지급완료·확정) | `#059669` (emerald-600) | `#10B981` | |
| Warning (예정·대기) | `#D97706` (amber-600) | `#FBBF24` | |
| Danger (거절·취소) | `#DC2626` (red-600) | `#F87171` | |
| Info (알림) | `#2563EB` (blue-600) | `#60A5FA` | 필요 시만 |

**Accent 사용 원칙 (재조정됨)**
- 기본 원칙: **블랙/화이트 모노크롬으로 99% 커버**
- "강조"가 필요한 경우 → **볼드 + 크기 + 위치**로 해결 (컬러 추가 ❌)
- 상태 시그널(Success/Warning/Danger)만 색 사용 허용
- **팔러 코드를 넣고 싶다면 선택 가능한 액세서리 컬러 (optional, 1% 사용)**:
  - `#B8860B` (다크 골드) — 로고 세리프 톤과 가장 조화
  - `#1E3A8A` (딥 인디고) — 모노크롬에 깊이 추가
  - **라임·네온·오렌지는 금지** (앞선 제안 철회)

> **결정 지점**: Accent를 쓸지 말지 디자이너 판단. **기본은 "Accent 없음"** 으로 진행하고, 유저 테스트에서 단조롭다는 피드백 시 다크 골드만 극소량 도입.

### 4-4. 타이포그래피
- 한글: **Pretendard Variable** (가변 폰트) — `Regular 400 / Medium 500 / SemiBold 600 / Bold 700`
- 영문·숫자: **Inter** 또는 Pretendard 자체 영문 글리프
- **로고 주변의 본문에서는 산세리프만** (세리프 본문 사용 금지 — 로고와 중복)
- 제목: `font-bold tracking-tight`
- 본문: `font-normal leading-relaxed`
- 숫자: `tabular-nums` 필수 (정산·카운트·날짜)
- 사이즈 스케일 (Tailwind 기본 유지): `text-xs/sm/base/lg/xl/2xl/3xl`

### 4-5. 아이콘
`lucide-react` 그대로 사용. stroke-width 1.5~2, 크기 `size-4 | size-5 | size-6`. 다른 아이콘 세트 **도입 금지**. 로고와 충돌하지 않는 간결한 선.

### 4-6. 일러스트·이미지
- **일러스트 없음**. 빈 상태는 lucide 아이콘 + 회색 텍스트로 충분.
- 포스터·인물 사진은 **실제 업로드물**. 시안에서는 `bg-muted`에 placeholder.
- 로고 외 브랜드 그래픽 요소 **추가 금지**.

### 타이포그래피
- 한글: **Pretendard Variable** (가변 폰트)
- 영문·숫자: **Inter** 또는 Pretendard의 영문 글리프
- 사이즈 스케일 (Tailwind 기준 유지): `text-xs/sm/base/lg/xl/2xl/3xl`
- **숫자는 tabular-nums** (정산·금액·카운트에 반드시 적용)
- 제목은 `font-bold tracking-tight`, 본문은 `font-normal leading-relaxed`

### 아이콘
`lucide-react` 그대로 사용. stroke-width 1.5~2, 크기 `size-4 | size-5 | size-6`. 다른 아이콘 세트 **도입 금지**.

### 일러스트·이미지
- **일러스트 없음**. 빈 상태는 아이콘 + 회색 텍스트로 충분.
- 포스터·인물 사진은 **실제 업로드물**. 시안에서는 `bg-muted`에 placeholder로.

---

## 5. 기술 · 디자인 스택 제약 (필수 준수)

디자인은 기술 스택에 맞춰야 그대로 구현 가능합니다.

- **Next.js 16 App Router + React 19 + TypeScript strict**
- **Tailwind v4** (유틸리티 클래스만, CSS 모듈·styled-components 사용 금지)
- **shadcn/ui** 컴포넌트 우선 사용 (이미 설치: `Button, Card, Badge, Dialog, Tabs, Table, Select, Input, Textarea, Switch, Calendar, Sheet, Dropdown, Skeleton, Tooltip, Popover, Avatar, Label, Form, Sonner`)
- **lucide-react** 아이콘
- **react-hook-form + zod** 폼
- **react-day-picker** 달력
- 커스텀 라이브러리 추가 **금지**(승인 필요)

### 레이아웃 그리드
- **AppShell**: 데스크탑(≥768px) = 좌측 `w-60 lg:w-64` 사이드바 + 메인 `max-w-5xl` 중앙. 모바일(<768px) = 전체 폭 + 하단 `h-14` BottomNav.
- 공통 패딩: 메인은 `px-4 md:px-8`, 카드는 `p-4`
- 카드 스타일 통일: `border-0 shadow-sm rounded-xl bg-card` (shadcn Card 기본 유지)

---

## 6. 디자인 원칙 (디자인 결정 시 tie-breaker)

1. **운영 효율 > 비주얼 화려함.** 한 눈에 상태 파악이 최우선.
2. **모바일·데스크탑 동등.** 같은 기능이 두 폭에서 모두 제대로 작동해야 한다. 모바일에서 축약만 허용, **기능 제거는 금지**.
3. **비어있는 상태(empty state)를 설계의 1급 요소로.** 앱 첫 사용 시 빈 화면이 많다. 아이콘 + 설명 + 첫 액션 CTA 3요소를 항상 갖춘다.
4. **상태는 뱃지로, 액션은 버튼으로.** 링크(`text-primary hover:underline`)와 버튼을 혼용하지 않는다.
5. **한 화면에 CTA 하나.** 여러 개라도 주(primary) 하나 + 보조(ghost/outline). 3개 이상 같은 무게 금지.
6. **숫자·날짜·금액은 정렬 고정.** 우측 정렬 + tabular-nums.
7. **한국어 문장은 줄바꿈 여유.** `leading-relaxed` + 폭 제한(`max-w-prose`).
8. **다크 모드 필수.** 모든 시안은 라이트·다크 쌍으로 제공. 단순히 invert하지 말고 실제 색 대비 조정.

---

## 7. 화면 우선순위 티어

> 디자이너는 티어 1부터 순차 작업합니다. 티어 1 완료 전까지 다른 티어로 넘어가지 않습니다.

### Tier 1 — 매일 쓰는 화면 (필수)
1. **홈 대시보드** `/`
2. **프로젝트 상세** `/projects/[id]`
3. **지원+가용성 통합 폼** `/projects/[id]/apply`
4. **운영 프로젝트 관리** `/admin/projects/[id]/manage` (6탭)
5. **공지 목록·상세** `/announcements`, `/announcements/[id]`
6. **프로젝트 목록** `/projects`
7. **로그인** `/login`

### Tier 2 — 주 1~수 회
8. **팀 캘린더** `/calendar`
9. **마이페이지** `/mypage`, `/mypage/applications`, `/mypage/payouts`, `/mypage/availability`
10. **멤버 디렉토리·상세** `/members`, `/members/[id]`
11. **프로젝트 생성·편집 폼** `/admin/projects/new`, `/admin/projects/[id]/edit`
12. **운영 대시보드** `/admin`

### Tier 3 — 월 1회·관리 용도
13. **정산 리포트** `/admin/settlements`
14. **멤버 관리** `/admin/members`
15. **공지 관리·작성** `/admin/announcements`, `/admin/announcements/new`
16. **감사 로그** `/admin/audit`
17. **승인 대기** `/pending-approval`
18. **회원가입** `/signup`

### Tier 4 — 후속(2차 도입 이후, 지금은 시안 생략 가능)
19. 오픈콜 공개 지원 `/apply/{slug}`
20. 공개 포트폴리오 `/portfolio`
21. 섭외 문의함 `/admin/inquiries`
22. 분석 `/admin/analytics`

---

## 8. 페이지별 디자인 요청

> 각 페이지에 대해 **① 핵심 사용 목표 ② 화면 구성 요소 ③ 상태 변형 ④ 모바일/데스크탑 차이**를 명시. 디자이너는 프레임별 이 순서대로 시안을 만듭니다.

### 8-1. 홈 대시보드 `/`

**목표**: 로그인 직후 "오늘 내가 알아야 할 3가지"를 5초 안에 전달.

**구성 요소**
- 상단: 페이지 제목 + 오늘 날짜
- 섹션 1: **내 상태 요약 카드 3개** (가로 스크롤/그리드): 내 지원 대기 N건 · 다가오는 확정 N건 · 미확인 공지 N건. 클릭 시 해당 페이지로 이동.
- 섹션 2: **고정 공지** (최대 3개) — 라임/오렌지 배경 배너 스타일
- 섹션 3: **진행 중 프로젝트** 카드 그리드 (데스크탑 2열·모바일 1열). 포스터·제목·상태뱃지·유형뱃지·페이/참가비·날짜·장소
- 섹션 4: **지난 프로젝트** 간략 리스트 (최대 3개, `opacity-75`)

**상태 변형**: 빈 상태(프로젝트 0건) · 로딩(Skeleton) · 에러

**반응형**: 모바일 1열 세로 스크롤, 데스크탑 2열 그리드

---

### 8-2. 프로젝트 상세 `/projects/[id]`

**목표**: 멤버가 "이 프로젝트가 뭔지·내가 뭘 해야 하는지"를 한 화면에서 판단.

**구성 요소**
- **히어로**: 포스터 이미지 (21:9, 없으면 회색 배경) + 오버레이에 제목·상태뱃지·유형뱃지 (`practice`/`paid_gig`)
- **핵심 메타 박스** (정보 밀도 높은 2~4열 그리드): 일시(event_start_at~end_at) · 장소(이름+주소 링크) · 참가비 · 페이(인당/팀풀) · 지원 마감일 · 확정 인원
- **설명 블록** (마크다운·개행 존중, `max-w-prose`)
- **첨부** 섹션: 파일 카드 (아이콘 + 파일명 + 종류 뱃지 + 다운로드 아이콘)
- **액션 영역** (상태·역할별 분기):
  - 비로그인(게스트) + 게스트허용: "지원하기" primary
  - 활성 멤버 + 지원 전 + 모집중: "지원하기" primary + "내 가용성만 제출" 보조
  - 이미 지원함: 상태 뱃지 + "지원 수정" 링크
  - 확정됨: 라임 배경 배너 "확정되었습니다" + 캘린더 추가 버튼
  - 운영진: 우상단에 "관리" 버튼 (/admin/projects/[id]/manage 이동)
- **프로젝트 공지** 섹션 (announcements where project_id): 최근 3개

**모바일 차이**: 히어로 이미지가 세로 스크롤 최상단, 메타 박스는 세로 스택. 액션 버튼은 sticky bottom.

---

### 8-3. 지원 + 가용성 통합 폼 `/projects/[id]/apply`

**목표**: **가장 많이 쓰이는 고통 지점.** 최소 클릭으로 끝나야 함.

**구성 요소** (스테퍼 또는 긴 단일 폼 중 선택 — **단일 폼 권장**)
1. 프로젝트 요약 띠 (제목·날짜·상태)
2. **Step 1. 지원 정보**
   - 게스트인 경우: 이름·전화 입력
   - 동적 `form_fields` 렌더 (short_text / long_text / radio / checkbox / select)
3. **Step 2. 가용성 제출** — **이 섹션에 집중**
   - 상단 **"최근 내 가용성 불러오기"** 큰 버튼 + **"프리셋에서 불러오기"** 드롭다운
   - 날짜별 카드 리스트 (프로젝트의 `schedule_dates` 기준):
     - 날짜 타이틀 + 가능/부분/불가 **세그먼트 토글**
     - 가능·부분 선택 시 시간 슬롯 추가 버튼 (start~end) 여러 개
     - 메모 한 줄
4. 하단: **"제출하기"** sticky 버튼

**상태 변형**
- 제출 성공: 토스트 + 프로젝트 상세로 리다이렉트
- 이미 지원함: 안내 배너 + "수정" 버튼
- 모집 마감: 배너 + 버튼 비활성
- 로딩·검증 에러(인라인)

**모바일 차이**: 섹션 간 큰 여백, 날짜 카드는 세로 스택, "최근 불러오기" 버튼은 가용성 섹션 최상단에 sticky

---

### 8-4. 운영 프로젝트 관리 `/admin/projects/[id]/manage`

**목표**: 운영진의 메인 워크벤치. 6개 탭이 한 레이아웃 안에 거주.

**구성 요소**
- 상단: 프로젝트 요약 헤더 (제목·상태 변경 드롭다운·"멤버용 보기" 링크)
- 탭 바: `지원자 · 로스터 · 가용성 · 정산 · 공지 · 설정` (shadcn Tabs)
- 각 탭별 콘텐츠:
  - **지원자**: 테이블 (이름·지원일·상태 뱃지·결정 메모·액션). 헤더에 상태 필터·검색·일괄 작업(confirm/reject) 바. 모바일은 카드 리스트.
  - **로스터**: 확정된 멤버 카드 (아바타·예명·포지션·pay_override). "멤버 추가" 버튼, 각 카드에 "제거"·"역할 변경". **같은 날짜 타 프로젝트 확정 시 ⚠ 충돌 배지**.
  - **가용성**: 히트맵(날짜×멤버 매트릭스, 색 진하기로 가능/불가) + 날짜별 집계 바 차트
  - **정산**: payout 테이블 (멤버·금액·상태·예정일·지급일·이체증빙). 상태 전진 버튼(pending→scheduled→paid). 일괄 생성 버튼
  - **공지**: 프로젝트 공지 작성 폼 + 작성된 공지 리스트(고정·삭제)
  - **설정**: `ProjectForm` 편집 모드 + 첨부 패널

**모바일 차이**: 탭 바는 가로 스크롤 허용. 테이블은 카드 리스트로 치환. 일괄 작업은 하단 시트(Sheet)로.

---

### 8-5. 공지 목록 / 상세

**목록** `/announcements`
- 고정 공지 그룹(상단) + 일반 공지 그룹(하단)
- 각 항목: 스코프 뱃지(팀/프로젝트) · 제목 · 작성일 · 읽음 여부 점
- 필터: 팀/프로젝트 토글

**상세** `/announcements/[id]`
- 제목·스코프 뱃지·고정 표시·작성일·작성자
- 본문 `whitespace-pre-wrap` (추후 마크다운)
- 프로젝트 공지면 연결 프로젝트 카드 링크

---

### 8-6. 프로젝트 목록 `/projects`

- 탭: `진행중 · 지난 · 임시`
- 그리드 카드 (홈과 동일 카드 컴포넌트 재사용)
- 필터: 유형(practice/paid_gig), 정렬(일자 가까운 순)

---

### 8-7. 로그인 `/login` / 회원가입 `/signup` / 승인 대기 `/pending-approval`

- 가운데 정렬, 폭 `max-w-sm`
- 최상단 **원샷크루** 워드마크 (로고 없으면 bold 블랙 텍스트 + Accent 언더바)
- 로그인: 이메일·비번 → 로그인 / 하단 "회원가입" 링크
- 가입: 이름·이메일·비번·전화 → 제출 후 승인 대기 화면으로
- 승인 대기: 큰 아이콘(Clock) + 안내 + 로그아웃 버튼 (이미 구현된 형태 유지)

---

### 8-8. 캘린더 `/calendar`

- 월 그리드 (react-day-picker)
- 각 날짜 셀 하단에 **색 도트 3종** (확정=emerald, 지원=amber, 핀 공지=orange)
- 범례 상단 고정
- 날짜 클릭 → 하단 패널(데스크탑은 우측 고정 열, 모바일은 그리드 아래 시트)에 해당 날짜 일정 리스트
- 월 이동 좌우 버튼, "오늘" 버튼

---

### 8-9. 마이페이지 `/mypage/*`

- 탭 또는 사이드 링크: 프로필 · 지원 이력 · 정산 · 가용성
- 각 서브페이지는 표/리스트 중심
- 정산: 월 접기·펼치기 + 개별 payout 상태 뱃지, 본인용 CSV 다운로드
- 가용성: 과거 제출 타임라인 + 프리셋 관리 카드 그리드

---

### 8-10. 멤버 디렉토리·상세 `/members`, `/members/[id]`

**디렉토리**
- 그리드 카드 (아바타 이니셜·이름·예명·역할 뱃지·계약 뱃지)
- 필터: 역할·계약·장르(2차 도입 시)

**상세**
- 상단 프로필 카드 (큰 아바타·이름·예명·역할·계약 상태)
- 탭: 기본 정보 · 참여 이력(최근순 프로젝트 리스트) · 정산 요약(본인·운영진만)

---

### 8-11. 정산 리포트 `/admin/settlements`

- 상단 필터 바 (월 Select · 상태 Select · 멤버 Input · CSV 내보내기 2종)
- 요약 카드 4종 (pending/scheduled/paid/cancelled — 각 금액·건수)
- 멤버별 요약 테이블 (우측 정렬 숫자, tabular-nums)
- 상세 내역 테이블 (멤버·프로젝트·상태·금액·예정/지급일)

**주의**: 숫자 칼럼은 반드시 **우측 정렬 + tabular-nums + 굵기 차별화(총액 > 세부)**

---

### 8-12. 멤버 관리 `/admin/members`

- 전체 멤버 테이블 (열: 아바타·이름·예명·역할·계약·계약기간·활성·수정)
- 인라인 편집 가능 셀은 edit 아이콘 보이게
- 상단 "멤버 추가" primary 버튼 (AddMemberDialog 트리거)

---

### 8-13. 공지 관리 `/admin/announcements` / 공지 작성 `/admin/announcements/new`

**관리**: 단순 테이블 (고정·스코프·제목·작성일·작성자·액션)
**작성 폼**: 스코프 선택 → 프로젝트인 경우 프로젝트 Select → 대상(audience_filter) 라디오 → 고정 토글 → 제목 → 본문 Textarea(큰 높이) → 미리보기 패널(데스크탑 우측, 모바일 하단)

---

### 8-14. 감사 로그 `/admin/audit`

- 타임라인 스타일 (날짜 그룹핑) 또는 테이블
- 필터: 엔티티·작성자
- 각 로그 카드: 시간·actor·action·entity·entity_id + "diff 보기" 접기/펼치기 (JSON 프리티 뷰)

---

## 9. 로고 통합 · 산출물 요구

디자이너는 다음 **로고 파생 자산** 을 먼저 제작하고 시안 전체에 적용합니다.

### 9-0. 필수 로고 파생 자산 (시안 첫 산출물)
| 자산 | 사양 | 용도 |
|---|---|---|
| `oneshot_logo.png` (원본) | 기존 파일 유지, 512×512 이상, 투명 배경 버전 필요 시 디자이너가 변환 | 전체 앱 기본 |
| `oneshot_logo_dark.png` (**신규**) | 흰색 라인 + 투명 배경, 원본과 동일 레이아웃 | 다크 모드 헤더·사이드바 |
| `oneshot_mark_16.png` (**신규**) | 16×16 단순화 모노그램 (예: "O" 또는 "OS" 약자) | 매우 작은 파비콘·브라우저 탭 |
| `oneshot_mark_32.png` (**신규**) | 32×32 동일 단순화 버전 | 사이드바 헤더·BottomNav 작은 영역 |
| `oneshot_wordmark.svg` (**권장**) | 로고 + "원샷크루" 텍스트 수평 조합 (라이트·다크 2종) | 로그인·공지 헤더 |
| `favicon.ico` (멀티 사이즈) | 16·32·48 내장 | 브라우저 기본 |
| `apple-touch-icon.png` | 180×180, 여백 포함 | iOS 홈 화면 |
| `og-image.png` | 1200×630, 로고 + "원샷크루 관리" 텍스트 | 링크 공유 미리보기 |

### 9-1. 로고 배치 가이드 (화면별)

| 화면 | 로고 사용 | 크기 | 위치 |
|---|---|---|---|
| `/login`, `/signup` | 로고(정사각) + 워드마크 | 로고 64×64 + 텍스트 `text-xl` | 폼 상단 중앙, `mb-8` |
| `/pending-approval` | 로고만 | 80×80 | 중앙 상단 |
| AppShell SideNav (데스크탑) | 로고 + 워드마크 | 로고 28×28 + 텍스트 `text-lg font-bold` | 사이드바 최상단 `px-5 py-6` |
| AppShell 모바일 헤더(신규 고려) | 로고만 또는 워드마크만 | 로고 24×24 | 상단 고정 헤더 좌측 |
| BottomNav | 로고 사용 안 함 | — | 아이콘·텍스트로 충분 |
| 공개 `/portfolio` (Tier 4) | 로고 크게 | 128×128 이상 | 히어로 섹션 중앙 |
| 파비콘/앱 아이콘 | 단순화 마크 버전 | 16~512 다해상도 | brower tab·PWA 홈 |

**현재 코드와의 연결**
- 이미 `app/layout.tsx` metadata.icons 및 `public/manifest.json`이 `/oneshot_logo.png` 를 가리키도록 설정됨
- 디자이너가 단순화 버전(`oneshot_mark_*.png`)을 만들면 다음 커밋에서 metadata를 교체할 예정 — 파일명을 위 표 기준으로 **정확히 지켜** 전달
- SideNav 워드마크(`components/layout/SideNav.tsx` 23번째 줄 근처)는 현재 텍스트만 표시 → 디자이너 시안 완료 후 `<Image src="/oneshot_logo.png" />` + 텍스트 조합으로 교체

### 9-2. 공통 UI 컴포넌트 디자인 요청

디자이너가 **로고 자산 다음으로** 잡아야 할 기본 컴포넌트들. 이 컴포넌트가 일관되면 모든 페이지가 자동으로 정돈된다.

| 컴포넌트 | 상세 |
|---|---|
| **Button** | primary=블랙 필 / secondary=회색 필 / outline=테두리 / ghost / destructive. 크기 sm/default/lg. 아이콘+텍스트 간격 `gap-1.5` |
| **Card** | `border-0 shadow-sm rounded-xl`, 헤더 optional, 내부 `p-4` |
| **Badge** | default=블랙 / secondary=회색 / outline=테두리 / destructive / **Accent=라임** (신규). 상태에 대응(표 4 참조) |
| **Tabs** | 밑줄 스타일 (Linear 풍). active 밑줄 2px Accent |
| **Table** | 헤더 `text-xs uppercase tracking-wide text-muted-foreground`, 바디 `text-sm`, 행 hover `bg-muted/40` |
| **Input / Textarea / Select** | 높이 `h-9`, 둥글기 `rounded-md`, 포커스 링 Accent |
| **Dialog / Sheet** | 모바일은 Sheet(bottom), 데스크탑은 Dialog |
| **Empty State** | 회색 아이콘 `size-10` + `text-sm text-muted-foreground` + 옵션 CTA |
| **Skeleton Loader** | 각 주요 카드·테이블 행 형태에 맞춰 |
| **Status Badge 매핑** | draft→outline, open→default(블랙), selecting→secondary, confirmed→Accent(라임), in_progress→secondary, completed→outline, cancelled→destructive |
| **Payout Badge 매핑** | pending→outline, scheduled→secondary(amber), paid→Accent(emerald), cancelled→destructive |

---

## 10. 반응형·접근성 요구

### 브레이크포인트
- `sm` 640px — 거의 미사용 (모바일과 같게)
- `md` 768px — **모바일↔데스크탑 전환점**
- `lg` 1024px — 사이드바 확장, 3열 그리드 시작
- `xl` 1280px — 컨테이너 `max-w-7xl` 여유

### 각 페이지 3뷰포트 시안 필수
- 375×812 (iPhone 12 mini)
- 768×1024 (iPad)
- 1440×900 (데스크탑 일반)

### 접근성
- 컬러 콘트라스트: **AA 이상** (본문 4.5:1, 큰 텍스트 3:1)
- 포커스 링 **반드시 보이게** (`ring-2 ring-ring ring-offset-2`)
- 폼 라벨은 시각적으로 항상 보이게 (placeholder-only 금지)
- 아이콘 버튼은 `aria-label` 전제
- 모든 상태 변화(지원 확정·정산 지급 등)는 **색 + 텍스트 + 아이콘** 3중 신호

### 애니메이션
- 기본 `transition-colors duration-150`
- 페이지 전환 애니메이션 **추가 금지** (Next.js 기본)
- 스켈레톤 `animate-pulse`만 허용

---

## 11. 산출물 형식 (디자이너 → 개발 핸드오프)

### 각 페이지 시안에 포함
1. **라이트·다크 모드 쌍**
2. **모바일·데스크탑 2뷰포트** (태블릿은 Tier 1만)
3. **주요 상태 3종**: 기본 / 로딩(Skeleton) / 빈 상태 / 에러 중 **최소 2종**
4. **주석 레이어**: 간격·색·폰트 사이즈 Tailwind 토큰으로 표기 (`p-4` / `text-sm` / `text-muted-foreground`)
5. **인터랙션 노트**: hover·active·disabled·focus 각 1줄 설명

### 금지
- Figma auto-layout 깨진 상태로 전달
- 실제 데이터 아닌 lorem ipsum (한국어 더미 사용: "원샷크루 5월 정기 공연", "홍길동", "강남 연습실 3호", "2026-05-12 18:00")
- 커스텀 SVG 아이콘 (lucide만)
- 기획에 없는 신규 페이지 추가

---

## 12. 체크리스트 (디자인 시작 전·PR 제출 시)

### 시작 전
- [ ] 3장(시나리오) 읽음
- [ ] **4장(브랜드·로고) 숙지** — 로고 이미지(`/public/oneshot_logo.png`)를 실제로 열어 봤는가?
- [ ] 브랜드 컬러 **모노크롬(블랙/화이트)** 방향으로 진행. Accent 추가 여부 결정 (기본: 없음)
- [ ] 5장(스택 제약) 숙지
- [ ] Tier 1 페이지 7개 리스트 확인
- [ ] **로고 파생 자산 8종(9-0 표) 제작 계획 수립**

### 각 페이지 시안 PR 시
- [ ] 라이트·다크 2모드 모두 있음
- [ ] 모바일·데스크탑 모두 있음
- [ ] 빈 상태 또는 에러 상태 최소 1개 포함
- [ ] CTA 버튼은 **한 화면에 primary 하나**
- [ ] 상태 뱃지 매핑 표 준수
- [ ] lucide-react 아이콘만 사용
- [ ] 한국어 더미 데이터 사용

### 전체 완료 시
- [ ] 7장 Tier 1 전부 시안 완료
- [ ] **9-0 로고 파생 자산 8종** 제작·전달 완료 (특히 `oneshot_logo_dark.png`, `oneshot_mark_16.png`)
- [ ] 9-2 공통 컴포넌트 13종 정리본 있음
- [ ] 다크 모드 실제 색 대비 조정 (단순 invert 아님)
- [ ] 로고가 실제로 UI에 배치된 주요 화면(`/login`, SideNav) 시안 포함
- [ ] 접근성 체크(포커스·대비·라벨) 통과
- [ ] 개발에 넘길 디자인 토큰 파일(JSON 또는 Figma Variables) 포함

---

## 13. 빠른 레퍼런스

### 현재 라우트(실제 구현됨)
```
/                           홈
/projects, /projects/[id], /projects/[id]/apply
/announcements, /announcements/[id]
/calendar
/members, /members/[id]
/mypage, /mypage/{applications,availability,payouts}
/admin                      운영 대시보드
/admin/projects/new, /admin/projects/[id]/{edit,manage}
/admin/members
/admin/announcements, /admin/announcements/{new,[id]/edit}
/admin/audit
/admin/settlements
/login, /signup, /pending-approval
```

### 참고 문서
- `docs/IMPLEMENTATION_PLAN.md` — 전체 구현 계획
- `C:/Users/그리고/.claude/plans/crispy-finding-leaf.md` — 승인된 재설계 플랜
- `.claude/handoffs/01~05-*.md` — Phase별 구현 기록
- `lib/types.ts`, `lib/project-labels.ts` — 도메인 타입·레이블
- `supabase/migrations/002_oneshot_redesign.sql` — 실제 데이터 모델

### 시작 프롬프트 템플릿 (디자인 AI에게)

> 다음 문서를 숙지하고 **Tier 1 페이지 7개**의 라이트·다크 × 모바일·데스크탑 시안을 만드세요. 4장(브랜드·로고)·9장(로고 통합·공통 컴포넌트)·12장(체크리스트)를 **반드시** 준수합니다.
>
> **브랜드**: 공식 로고는 `/public/oneshot_logo.png` (블랙 세리프 모노그램). 제품은 **모노크롬(블랙/화이트) 중심**으로 가며, 형광·네온 Accent는 사용하지 않습니다. 본문 타이포는 Pretendard 산세리프로 로고와 대비.
>
> **순서**:
> 1. **9-0 로고 파생 자산 8종** (다크 버전·파비콘용 단순 마크·OG 이미지 등) 먼저 설계
> 2. **9-2 공통 컴포넌트 세트** (Button, Card, Badge, Table, Input, Tabs, Empty State, Skeleton)
> 3. **로그인 `/login`** — 로고 실제 배치 첫 화면
> 4. **홈 `/`** → **프로젝트 상세 `/projects/[id]`** → **지원+가용성 폼 `/projects/[id]/apply`** → **운영 관리 6탭 `/admin/projects/[id]/manage`**
> 5. 나머지 Tier 1 페이지
>
> 각 시안은 라이트·다크 페어, 모바일(375)·데스크탑(1440) 페어를 함께 제출하세요.
