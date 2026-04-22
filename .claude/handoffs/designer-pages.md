# Designer — Page Specs

각 페이지는 `(main)` 그룹 안에 위치. 제목·서브카피는 모두 한국어.

## `/` 대시보드 (`app/(main)/page.tsx`)
```
.page-head
  h1 "홈" + .sub "오늘의 할 일" (mono)
  row: btn ghost "새로고침", btn primary "새 프로젝트"(admin)
.grid grid-4  (모바일 2열)
  StatCard 진행 프로젝트 count={counts.active}
  StatCard 이번주 일정    count={counts.weekEvents}
  StatCard 대기중 지원    count={counts.pending}
  StatCard 미정산 금액    value={fmtKRW(unpaidAmount)}
.grid grid-2
  ├ .card "다가오는 일정" → SchedulePreview(5개, 일정 없으면 EmptyState)
  └ .card "오늘의 공지" → AnnouncementList(3개, pinned 먼저)
.card flush
  card-head "모집중 프로젝트"
  ProjectList 미니 3개 (card-row)
```
Admin 이면 `최근 지원` 카드 추가.

## `/projects` 프로젝트 목록
```
.page-head
  h1 "프로젝트"
  row: Seg filter {all|recruiting|ongoing|completed}, btn primary "새 프로젝트"(admin)
.grid grid-3 (모바일 1열)
  ProjectCard
    .poster thumb (OR 업로드 이미지)
    .badge(type) + StatusBadge
    h3 title
    muted row: Calendar ico + fmtDate + MapPin ico + venue
    row between: .av-stack members(max 5) + count, .btn sm "자세히" 링크
```

## `/projects/[id]` 프로젝트 상세
```
.page-head
  row: back btn "← 프로젝트" + crumb "PROJECT"
  h1 title + row{StatusBadge, Badge type}
  sub: 설명(clamp 2 lines)
.grid grid-2 (모바일 1열)
  ├ col-left
  │  .card "일시/장소" KVList(date,time,venue,address,fee)
  │  .card "크루원" + members avatar-stack + roleMap
  │  .card "지원 현황" mini stats(지원자/합격/대기) + "지원자 관리" 링크(admin)
  │  .card "메모" textarea(admin editable)
  └ col-right
     .poster 21/9 hero
     UnderlineTabs [개요|일정|지원자|정산]
     - 개요: 상세 description + 참고 링크
     - 일정: SchedulePreview read-only(내 투표 표시)
     - 지원자: ApplicationsTable(admin)
     - 정산: PayoutTable(admin)
```

## `/projects/[id]/apply` 지원
```
.page-head h1 "{title} 지원" + sub "아래 항목을 작성해 주세요"
.card
  .field 이름(자동입력, readonly)
  .field 연락처
  .field 자기 소개 (textarea)
  .field 지원 동기 (textarea)
  .field 출연료 동의 (seg: 예/아니오)
  .field 일정 가능 여부 (ScheduleVote 요약) — 해당 프로젝트의 schedule_dates 전부 리스트업, 투표값 선택
  row: btn ghost "취소", btn primary "지원서 제출"
```
제출 성공 → toast "지원이 접수되었습니다" + router.push(`/projects/${id}`).

## `/manage/projects/new` + `/manage/projects/[id]/edit`
```
.page-head h1 "새 프로젝트" / "프로젝트 편집"
.grid grid-2
  ├ col-left (기본 정보)
  │  .field 제목 *
  │  .field 종류 Seg {paid_gig|practice|audition|workshop}
  │  .field 상태 Select
  │  .field 설명 textarea
  │  .field 출연료 input.num (paid_gig 만 노출)
  │  .field 장소 + 주소
  │  .field 포스터 업로드
  └ col-right (일정)
     .card
       제목 + btn sm "+ 날짜 추가"
       ScheduleDateEditor (rows: date/kind/slots)
.row justify-end gap
  btn ghost 취소
  btn primary 저장
```

## `/manage/projects/[id]` 관리 콘솔 (URL `?tab=`)
탭: `overview | applications | schedule | settlement | announcements | settings`
- **overview**: 개요 수정, status 변경, 포스터 바꾸기
- **applications**: ApplicationsTable
  - thead: checkbox / 이름 / 지원일 / 동의 / 점수 / 메모 / 상태 / 액션
  - row hover: 액션 버튼 영역(승인/거절/메모)
  - row click → Modal 상세 + 점수 슬라이더
  - 하단 bulk-action bar: 선택 n명 · [일괄 승인|일괄 거절]
- **schedule**: HeatmapGrid (크루 투표 현황) + SchedulePreview
- **settlement**: PayoutTable (row: 멤버 / 역할 / 금액 / 상태 / 지급일 / 메모) + 합계 카드 + CSV export btn
- **announcements**: 프로젝트 전용 공지 리스트 + "+ 공지 작성" modal
- **settings**: 위험영역(삭제, 아카이브), 참여 멤버 편집

## `/manage/members` 멤버 관리 (admin)
```
.page-head h1 "멤버 관리" + row{ btn "초대링크", btn primary "+ 멤버 추가" }
.tabs {전체|계약직|비계약직|게스트}
table.tbl
  thead: 멤버 / 역할 / 계약 / 포지션 / 가입일 / 액션
  row: avatar+name (clickable → 상세), Badge role, Badge contract, position chips, date, [⋮]
모바일: 카드 리스트
```
신규 멤버 모달: 이름, 이메일, 역할(owner/admin/member), 계약유형, 포지션(multiselect).

## `/manage/settlements` 정산 리포트 (admin)
```
.page-head h1 "정산 리포트" + row{Seg period, btn "CSV 다운로드"}
.grid grid-3: StatCard {총지급 / 대기중 / 완료}
.card flush
  thead: 멤버 / 프로젝트 / 금액 / 상태 / 지급일 / 비고
  row: link name, project badge, fmtKRW amount, Badge status, date
```
월 필터(`?month=2026-04`), 상태 필터, 상태 전환 모달(pending→scheduled→paid).

## `/calendar` 내 캘린더
```
.page-head h1 "캘린더" + row{Seg month|week, btn 이전/오늘/다음}
.card flush
  CalendarGrid monthMatrix
  하단 dock: 범례(event/practice/off)
모바일: 상단 조작 한 줄, week-strip + agenda list로 대체해도 OK
클릭 → day-detail drawer: 오늘 일정 리스트 + 내 투표 상태
```

## `/members` 멤버 목록 (모든 role)
```
.page-head h1 "멤버" + search input
.grid grid-3
  MemberCard: avatar lg + name / position / contract badge / 최근 활동
```

## `/announcements` 공지
```
.page-head h1 "공지" + btn primary "작성"(admin)
.tabs {팀|프로젝트|내가쓴}
list:
  .card + pin ico (pinned) + title + meta(작성자·일시·대상)
  row expand → body (markdown)
읽음 처리: 스크롤 진입 시 POST /api/announcements/[id]/read
```

## `/mypage` 마이페이지 (URL `?tab=`)
탭: `profile | applications | schedules | payouts`
- **profile**: 이름/연락처/포지션 편집, 프로필 이미지
- **applications**: 내 지원 리스트 + 상태 Badge
- **schedules**: 기본 가능 시간(AvailabilityPreset) 편집 + 이번 달 투표 요약
- **payouts**: 내 정산 내역 + 합계

## `/apply` 빠른 지원 엔트리
서버 라우트: 첫 status='recruiting' 프로젝트 조회 → `/projects/[id]/apply` 로 301 리다이렉트.
없으면 `.empty` + "지금 모집 중인 프로젝트가 없어요" + link `/projects`.

## Auth (`(auth)`)
### `/login`
```
.page 단독 화면 (no chrome)
brand + "로그인"
.field 이메일 + 비밀번호
btn primary w-full "로그인"
row between small: "비밀번호 찾기" · "계정이 없으신가요? 가입"
```
### `/signup`
기본 정보 + 승인 대기 안내 배너.
