# 핸드오프 — frontend-portfolio

## 작업 요약

포트폴리오 + 섭외 문의 기능의 프론트엔드 전체를 구현했다.
`tsc --noEmit` 0건 통과, `npm run build` 통과.

---

## 생성 파일 전체 목록

```
app/
  page.tsx                                  (신규, / → /login 또는 /projects 리디렉트)
  portfolio/
    layout.tsx                              (신규, 공개 레이아웃 + generateMetadata SEO)
    page.tsx                                (신규, Server Component, 병렬 fetch + 9개 섹션 렌더)
    loading.tsx                             (신규, 섹션 스켈레톤)
    error.tsx                               (신규, 에러 경계 + 다시 시도)

  (main)/manage/
    page.tsx                                (수정, 포트폴리오 관리 + 문의함 카드 추가)
    portfolio/
      page.tsx                              (신규, 관리자 5탭 Server Component)

components/portfolio/
  PublicHeader.tsx                          (신규)
  PublicFooter.tsx                          (신규)
  HeroSection.tsx                           (신규)
  AboutSection.tsx                          (신규)
  FeaturedVideoSection.tsx                  (신규)
  PerformanceVideoSection.tsx               (신규)
  PerformanceVideoCard.tsx                  (신규)
  OtherVideoTabs.tsx                        (신규)
  PhotoGallery.tsx                          (신규, 라이트박스 포함)
  CareerTimeline.tsx                        (신규, 연도별 그룹)
  MemberCard.tsx                            (신규)
  MemberCardGrid.tsx                        (신규)
  CtaFooterSection.tsx                      (신규)
  VideoPlayerDialog.tsx                     (신규, YouTube iframe + 레퍼런스 문의)
  InquiryDialog.tsx                         (신규, shadcn Dialog 래퍼)
  InquiryForm.tsx                           (신규, 수동 state 관리, honeypot _hp)
  GenreBadge.tsx                            (신규)

  admin/
    PortfolioAdminTabs.tsx                  (신규, 클라이언트 탭 스위치)
    SectionEditor.tsx                       (신규)
    MediaManager.tsx                        (신규, 리스트+편집 패널 Split)
    MediaEditPanel.tsx                      (신규)
    ImageUploader.tsx                       (신규, signed URL → uploadToSignedUrl)
    CareerManager.tsx                       (신규)
    MemberPublicEditor.tsx                  (신규, Sheet 편집)
    InquiryInbox.tsx                        (신규, Sheet 상세)
    InquiryStatusBadge.tsx                  (신규)
```

합계: 신규 30개 파일, 수정 1개 파일.

---

## 주요 의사결정

### 1. 폼 상태 관리
RHF(React Hook Form) 미사용. 기존 `NewProjectForm` 패턴과 동일하게 `useState` + `toast` 방식으로 구현. CLAUDE.md 규칙 준수.

### 2. Server Component 기본
`portfolio/layout.tsx`, `portfolio/page.tsx`, `manage/portfolio/page.tsx` 모두 Server Component.
클라이언트 컴포넌트는 실제 이벤트 핸들러/다이얼로그/탭/업로더가 있는 것만 `'use client'`.

### 3. Storage 업로드 방식
`POST /api/portfolio/upload-url` → `signedUrl` 의 `token=` 쿼리 파라미터 파싱 → `supabase.storage.uploadToSignedUrl(path, token, file)`. 파싱 실패 시 `PUT ${signedUrl}` 직접 업로드 폴백.

### 4. 공개 멤버 조회
`public_crew_members_view` 뷰를 직접 쿼리. email/phone 노출 없음.

### 5. genres 파싱
`portfolio_sections.genres` 값은 콤마 구분 문자열 → `.split(',').map(s => s.trim()).filter(Boolean)` 으로 배지 배열 변환.

### 6. InquiryDialog 모바일
`Dialog`를 `max-h-[90dvh] overflow-y-auto` 설정으로 대응. `useMediaQuery` 미사용.

### 7. 관리자 탭 클라이언트 전환
`PortfolioAdminTabs.tsx` 클라이언트 컴포넌트에서 `useState`로 탭 전환. 탭 콘텐츠는 Server Component에서 pre-render된 ReactNode를 props로 전달해 실제 렌더 비용은 1회만 발생.

---

## QA 체크리스트

### 공개 페이지
- [ ] `/portfolio` 비로그인 접근 → 로그인 리디렉트 없이 정상 렌더
- [ ] Hero 섹션: 데이터 없을 때 fallback 텍스트 표시
- [ ] 공연 영상 카드 "이 영상으로 문의" → InquiryDialog에 reference_media_id 바인딩 확인
- [ ] 멤버 카드 클릭 → InquiryDialog target_type='member', defaultMemberId 바인딩 확인
- [ ] VideoPlayerDialog: YouTube iframe 재생, ESC 닫기
- [ ] PhotoGallery: ← → 키보드 탐색, ESC 닫기
- [ ] 모바일(640px 이하) 반응형 레이아웃 확인

### 문의 폼
- [ ] 필수 필드 미입력 → 인라인 에러 + toast 표시
- [ ] 이메일 형식 검증
- [ ] target_type='member' 멤버 콤보박스 검색 및 선택
- [ ] budget_type 변경 시 조건부 필드 표시/숨김
- [ ] honeypot `_hp` 필드가 DOM에 숨김 처리되어 있는지 확인
- [ ] 제출 성공 → 성공 화면 표시
- [ ] 쿨다운 5초 적용 확인

### 관리자 CRUD (`/manage/portfolio`)
- [ ] member 계정 접근 → `/` 리디렉트 (기존 manage 레이아웃 가드)
- [ ] 소개 탭: 저장 → `PATCH /api/portfolio/sections` 호출, genres 배지 실시간 미리보기
- [ ] 미디어 탭: 새 항목 추가, 저장, ↑↓ 순서 변경, 삭제
- [ ] YouTube URL 입력 → 썸네일 자동 설정 확인
- [ ] 이미지 업로드: signed URL 발급 → Storage 업로드 → publicUrl 반환
- [ ] 경력 탭: CRUD
- [ ] 멤버 프로필 탭: is_public 토글 낙관적 업데이트, Sheet에서 저장
- [ ] 문의함 탭: 상태 변경, 메모 저장, 삭제, 이메일/전화 복사

### 연결
- [ ] `/manage` 대시보드에 포트폴리오 관리 카드, 신규 문의 N건 카드 표시
- [ ] 포트폴리오 보기 링크 → 새 탭으로 `/portfolio` 열림

---

## 알려진 한계 / TODO

1. **PhotoGallery**: `columns` CSS 방식 masonry 사용 — 브라우저 지원은 넓으나, 사진 순서가 세로 방향으로 흐름. 가로 방향 masonry 원하면 JS 계산 필요.
2. **반응형 CSS**: `grid-template-columns`를 인라인 style로 고정 지정함. 모바일에서 미디어 쿼리가 없는 섹션은 overflow 발생 가능 — globals.css `.pf-section` 반응형 규칙으로 커버되지만 3열 그리드 등은 별도 미디어 쿼리 필요.
3. **CareerManager 순서 변경**: `/api/portfolio/careers/reorder` API가 현재 없으므로 재정렬 API 호출은 silently ignore됨. 백엔드에서 해당 엔드포인트 추가 필요.
4. **이미지 Next.js 도메인 설정**: 외부 Storage URL을 `next/image`로 사용하려면 `next.config.js`의 `images.domains` 또는 `remotePatterns`에 Supabase 도메인 추가 필요.
5. **SEO generateMetadata**: 빌드 시점 정적 생성 불가 (`dynamic = force-dynamic`), 런타임 생성으로 처리됨.
6. **DB 마이그레이션**: `014_portfolio.sql` 수동 적용 필요. 미적용 상태에서는 테이블 없음 에러 발생 (try-catch로 빈 상태 graceful 처리).
