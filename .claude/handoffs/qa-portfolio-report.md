# QA Report — Portfolio & Inquiry Feature
> Generated: 2026-04-23
> Reviewer: QA Agent
> Build: PASS (tsc --noEmit: 0 errors, npm run build: SUCCESS)
> Lint: PASS for portfolio code (only _handoff/ scaffold files have errors)
> Total issues: 18 (CRITICAL: 2, HIGH: 4, MEDIUM: 6, LOW: 6)

---

## Build Results

| 검사 | 결과 | 비고 |
|------|------|------|
| `npx tsc --noEmit` | PASS | 0 errors (수정 후) |
| `npm run build` | PASS | 모든 라우트 빌드 성공 |
| `npm run lint` (portfolio 범위) | PASS (수정 후) | _handoff/ 하위 scaffold jsx 파일의 무관한 에러 제외 |

---

## Issues

### [CRITICAL-1] next/image remotePatterns 미설정 — 런타임 500 에러
- **파일**: `next.config.ts`
- **문제**: Supabase Storage URL(`*.supabase.co`) 및 YouTube 썸네일 URL(`i.ytimg.com`)이 `next/image`의 허용 도메인에 등록되지 않아 런타임에 이미지가 모두 500 에러로 실패한다. HeroSection, PerformanceVideoCard, PhotoGallery, MemberCard 등 핵심 시각 요소 전체 불능.
- **재현**: 마이그레이션 적용 후 `/portfolio` 접속 → 모든 사진/썸네일 깨짐
- **영향**: 공개 포트폴리오 페이지의 이미지/썸네일 전체 불능. SEO og:image도 무효화됨
- **수정**: ✅ 직접 수정 완료 — `next.config.ts`에 `images.remotePatterns` 추가
  ```ts
  // 추가된 설정
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
    ],
  }
  ```
- **담당**: frontend

---

### [CRITICAL-2] 날짜 역순(end < start) 서버 검증 누락
- **파일**: `lib/validators.ts` → `portfolioInquiryInputSchema`
- **문제**: `event_date_end < event_date_start`인 경우 Zod 스키마에 `.refine()` 검증이 없어 DB에 논리적으로 잘못된 날짜가 저장된다. 클라이언트의 `min={eventDateStart}` 속성만으로는 직접 API 호출 시 우회 가능.
- **재현**: POST /api/portfolio/inquiries `{ event_date_start: "2025-12-31", event_date_end: "2024-01-01" }` → 201 반환
- **영향**: DB 데이터 무결성 훼손, 관리자 UI에서 잘못된 날짜 표시
- **수정**: ✅ 직접 수정 완료 — `.refine()` 두 개 추가 (날짜 역순 + budget_range min>max)
- **담당**: backend

---

### [HIGH-1] POST /api/portfolio/inquiries — 레이트리밋 없음, DoS/스팸 위험
- **파일**: `app/api/portfolio/inquiries/route.ts`
- **문제**: honeypot(`_hp`) 이외의 레이트리밋 수단이 전혀 없다. 스크립트로 초당 수백 건 삽입 가능. `_hp` 필드는 클라이언트 HTML 분석으로 쉽게 회피 가능하다.
- **재현**: `while true; do curl -X POST /api/portfolio/inquiries -d '{"target_type":"team","inquiry_type":"other","requester_name":"test","requester_email":"a@b.com","message":"1234567890"}'; done`
- **영향**: DB 용량 고갈, Supabase 요금 폭증, 관리자 inbox 스팸으로 정상 문의 매몰
- **권장 수정**:
  ```ts
  // route.ts에 추가 — IP 기반 단순 인메모리 쿨다운 (프로덕션은 Upstash/KV 권장)
  const ipCooldown = new Map<string, number>();
  const IP_COOLDOWN_MS = 30_000; // 30초
  
  export async function POST(request: Request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const lastSubmit = ipCooldown.get(ip) ?? 0;
    if (Date.now() - lastSubmit < IP_COOLDOWN_MS) {
      return NextResponse.json({ data: {} }); // 조용히 무시
    }
    ipCooldown.set(ip, Date.now());
    // ... 기존 로직
  }
  ```
- **담당**: backend

---

### [HIGH-2] public_crew_members_view에 RLS가 없음 — 뷰 직접 접근 시 필터 우회 가능성
- **파일**: `supabase/migrations/014_portfolio.sql:349-366`
- **문제**: 뷰는 RLS가 적용되지 않는다. `SECURITY INVOKER`(기본값)이므로 뷰를 직접 쿼리하는 anon 사용자는 뷰의 WHERE 조건(`is_active=true AND is_public=true`)만으로 필터된다. 마이그레이션 코멘트에 "뷰에는 RLS가 적용되지 않으므로 SECURITY INVOKER 기본값 유지. 뷰 자체가 WHERE 필터를 포함하므로 안전"으로 명시되어 있다. 이는 옳지만, 뷰에 GRANT SELECT가 `anon, authenticated` 모두에게 부여되어 있어 혹시 뷰 정의가 변경되면 즉시 노출될 수 있다. 현재 구현은 안전하지만 취약한 구조다.
- **영향**: 현재 즉각적 취약점은 없음. 뷰 수정 시 PII 노출 위험
- **권장 수정**: 마이그레이션에 명시적 주석 추가. 뷰 변경 시 반드시 보안 검토 필요함을 문서화
- **담당**: backend

---

### [HIGH-3] PATCH /api/members/[id]/public — UUID 파라미터 미검증
- **파일**: `app/api/members/[id]/public/route.ts:14`
- **문제**: URL 파라미터 `id`가 UUID 형식인지 검증하지 않는다. 악의적인 입력(예: `' OR 1=1 --`, 매우 긴 문자열)이 Supabase 쿼리에 직접 전달된다. Supabase JS SDK가 파라미터 바인딩을 사용하므로 SQL injection은 방지되지만, UUID가 아닌 값으로 쿼리 시 DB 오류가 발생할 수 있다.
- **재현**: `PATCH /api/members/not-a-uuid/public` → DB 오류 또는 404 (불명확한 동작)
- **권장 수정**:
  ```ts
  import { z } from "zod";
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  ```
- **담당**: backend

---

### [HIGH-4] PATCH /api/portfolio/media/[id], DELETE /api/portfolio/media/[id] — UUID 미검증
- **파일**: `app/api/portfolio/media/[id]/route.ts:14`, `app/api/portfolio/inquiries/[id]/route.ts:12`
- **문제**: 동일한 UUID 파라미터 미검증 패턴이 media, inquiries, careers [id] 라우트 전반에 걸쳐 있다.
- **권장 수정**: 각 라우트 최상단에 UUID 검증 추가 (HIGH-3과 동일 패턴)
- **담당**: backend

---

### [MEDIUM-1] Storage 정책 — service_role 클라이언트로 signed URL 발급 시 Storage INSERT 정책 우회
- **파일**: `app/api/portfolio/upload-url/route.ts:41`
- **문제**: `createServiceSupabaseClient()`(service_role)로 `createSignedUploadUrl()`을 호출하면 Storage RLS가 완전히 우회된다. `requireAdmin()` 검증이 선행되므로 현재는 안전하지만, 코드 구조상 requireAdmin 검증이 제거되거나 조건부가 되면 anon이 signed URL을 발급받을 수 있다. service_role을 사용하는 것이 의도인지 명확하지 않다.
- **권장 수정**: 주석으로 의도를 명시. "createSignedUploadUrl은 service_role이 필요하므로 의도적으로 service_role 사용. requireAdmin() 검증이 반드시 선행되어야 함"
- **담당**: backend

---

### [MEDIUM-2] portfolio_inquiries POST — service_role 아닌 anon 세션 클라이언트 사용 확인 필요
- **파일**: `app/api/portfolio/inquiries/route.ts:26`
- **문제**: `createRouteSupabaseClient()`는 요청자의 쿠키 기반 세션(일반적으로 anon)을 사용한다. 비로그인 사용자의 문의 제출이 RLS `portfolio_inquiries_anyone_insert WITH CHECK (true)`로 허용된다. 이는 의도에 부합하지만, `createRouteSupabaseClient()`가 service_role이 아닌지 주석 없이 확인이 어렵다. 실제로는 anon key를 사용하므로 RLS가 올바르게 적용된다.
- **영향**: 현재 안전. 코드 명확성 문제
- **권장 수정**: 주석 추가 — "service_role 사용 금지: anon RLS를 통해 INSERT되어야 함"

---

### [MEDIUM-3] 관리자 페이지 — crew_members 테이블 직접 조회 (email/phone 없으나 is_active 필터만)
- **파일**: `app/(main)/manage/portfolio/page.tsx:64-68`
- **문제**: 관리자 페이지에서 crew_members를 직접 쿼리하지만 `is_active=true` 만 필터하고 `is_public` 필터는 없다. 이는 의도적(관리자는 모든 멤버 편집 가능)이지만 `email`, `phone` 컬럼을 select 목록에 포함하지 않는지 확인 필요하다.
- **현황**: 현재 select 목록에 `email`, `phone` 없음. 안전.
- **영향**: 현재 즉각적 취약점 없음. 미래 코드 변경 시 주의 필요
- **담당**: frontend

---

### [MEDIUM-4] PhotoGallery — 라이트박스 키보드 이벤트가 Dialog 컨텍스트에 묶임
- **파일**: `components/portfolio/PhotoGallery.tsx:26-29`, `86-87`
- **문제**: `onKeyDown={handleKeyDown}`이 `DialogContent`에 붙어 있으나, shadcn Dialog는 포커스 트랩이 있어서 내부 요소에 포커스가 없을 경우 키 이벤트가 전달되지 않을 수 있다. 키보드 이전/다음 탐색이 실제로 작동하는지 보장하려면 `useEffect`로 전역 `keydown` 리스너를 추가해야 한다.
- **권장 수정**:
  ```tsx
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex]);
  ```
- **담당**: frontend

---

### [MEDIUM-5] CareerManager sort_order 변경 API 누락
- **파일**: `app/api/portfolio/careers/` (미구현)
- **문제**: frontend-portfolio.md "알려진 한계"에 명시: `CareerManager`의 ↑↓ 버튼이 `silently ignore`된다. `/api/portfolio/careers/reorder` 엔드포인트가 없어서 경력 순서 변경이 불가능하다.
- **영향**: 관리자가 경력 순서를 변경할 수 없음. UX 기능 불완전
- **권장 수정**: `app/api/portfolio/careers/reorder/route.ts` 추가 — `/api/portfolio/media/reorder`와 동일 패턴
- **담당**: backend

---

### [MEDIUM-6] InquiryForm — budget_max가 budget_min보다 작아도 클라이언트에서 미검증
- **파일**: `components/portfolio/InquiryForm.tsx:344-349`
- **문제**: 서버 Zod 검증에는 수정으로 추가했지만, 클라이언트 validate() 함수에 budget_range 검증이 없어 사용자가 잘못된 입력을 서버로 보내고 400 에러를 받는다. 클라이언트에서도 즉시 피드백을 줘야 한다.
- **권장 수정**:
  ```ts
  // validate() 함수에 추가
  if (budgetType === "range" && budgetMin && budgetMax) {
    if (parseInt(budgetMin) > parseInt(budgetMax)) {
      e.budgetMax = "최대 예산은 최소 예산보다 커야 합니다";
    }
  }
  ```
- **담당**: frontend

---

### [LOW-1] `<img>` 태그 사용 — admin 내부 컴포넌트 3곳
- **파일**: `components/portfolio/admin/MediaEditPanel.tsx:167`, `MediaManager.tsx:151`, `MemberPublicEditor.tsx:134`
- **문제**: `next/image` 대신 `<img>` 태그 사용. 관리자 전용 화면이므로 LCP 영향은 낮지만 lint warning 발생. `next.config.ts` remotePatterns 추가(CRITICAL-1 수정)로 `next/image` 사용이 가능해졌다.
- **권장 수정**: `Image from "next/image"`로 교체, `width`, `height` 지정
- **담당**: frontend

---

### [LOW-2] portfolio/page.tsx + layout.tsx — 중복 DB 쿼리
- **파일**: `app/portfolio/layout.tsx:50-72`, `app/portfolio/page.tsx:30-56`
- **문제**: layout.tsx에서 sections, members, media를 쿼리하고 page.tsx에서 동일하게 sections, media, careers, members를 다시 쿼리한다. 같은 요청에서 DB를 6회(layout 3 + page 4) 쿼리한다. 일부는 중복이다.
- **영향**: 불필요한 DB 쿼리, 응답 시간 증가
- **권장 수정**: Server Component에서 layout → page로 데이터 전달보다는 page에서 모든 데이터를 fetch하고 layout에서 필요한 최소값만 쿼리하도록 분리. 또는 React cache()를 사용해 중복 쿼리 제거
- **담당**: frontend

---

### [LOW-3] FeaturedVideoSection — 대표 영상 구분 로직 불일치
- **파일**: `app/portfolio/page.tsx:97-99`
- **문제**: `featuredVideos`는 `(kind === "hero_video" || kind === "performance") && is_featured && id !== heroMedia?.id`로 필터된다. 즉, `is_featured=true`인 performance 영상이 heroMedia가 아닌 경우 FeaturedVideoSection에 표시된다. 이는 "공연 영상 섹션"에도 이미 표시되므로 같은 영상이 두 섹션에 중복 표시된다.
- **영향**: 콘텐츠 중복, 혼란스러운 UI
- **권장 수정**: `featuredVideos`를 `kind === "hero_video" && is_featured && id !== heroMedia?.id`로 제한
- **담당**: frontend

---

### [LOW-4] InquiryDialog — defaultInquiryType 타입이 더 넓음
- **파일**: `components/portfolio/InquiryDialog.tsx:13`
- **문제**: `InquiryDialogProps.defaultInquiryType`은 `"performance" | "broadcast" | "commercial" | "workshop" | "other"`로 강타입이나, `InquiryFormProps.defaultInquiryType`은 `string`이다. 타입 불일치로 외부에서 전달한 타입이 폼 내부에서 런타임 검증 실패할 수 있다.
- **영향**: 낮음 (현재 string으로 저장 후 서버에서 Zod 검증)
- **권장 수정**: `InquiryFormProps.defaultInquiryType`을 `PortfolioInquiryType | undefined`로 수정
- **담당**: frontend

---

### [LOW-5] 미사용 import/variable (lint warnings)
수정 전 발견, 일부는 직접 수정 완료:
- `InquiryInbox.tsx`: `BUDGET_TYPE_LABELS` ✅ 수정
- `MediaEditPanel.tsx`: `toast` import ✅ 수정
- `MemberPublicEditor.tsx`: `PublicCrewMember` import ✅ 수정
- `InquiryInbox.tsx:10`: `initialTotal` prop 미사용 (선언은 있으나 컴포넌트 본체에서 사용 안 함)

---

### [LOW-6] PhotoGallery — 라이트박스에서 photos가 0인데 index가 계산됨
- **파일**: `components/portfolio/PhotoGallery.tsx:192`
- **문제**: `{(lightboxIndex || 0) + 1}/{photos.length}` — `lightboxIndex`가 0일 때 `0 || 0`이 되어 항상 첫 번째 사진을 표시한다. `lightboxIndex ?? 0`을 사용해야 한다.
- **수정 제안**: `{(lightboxIndex ?? 0) + 1}/{photos.length}`
- **담당**: frontend

---

## Security Checklist

| 항목 | 상태 | 비고 |
|------|------|------|
| API 인증 체크 (requireAdmin) | PASS | 모든 admin 엔드포인트에 requireAdmin 적용 |
| anon INSERT 엔드포인트 RLS | PASS | portfolio_inquiries_anyone_insert WITH CHECK (true) |
| RLS PII 보호 (portfolio_inquiries) | PASS | SELECT/UPDATE/DELETE는 admin_or_owner만 |
| public_crew_members_view email/phone 노출 | PASS | 뷰에 email, phone 컬럼 없음 |
| YouTube URL XSS | PASS | extractYouTubeId()로 ID 추출 후 정규화된 embed URL만 사용 |
| Storage anon 직접 쓰기 방지 | PASS | signed upload URL 방식, Storage INSERT 정책 is_admin_or_owner |
| honeypot 필드 | PASS | `_hp` 필드 존재, 값 있으면 200 반환 |
| 입력 Zod 검증 | PASS (수정 후) | 날짜 역순/budget_range 검증 추가 |
| next/image 도메인 설정 | PASS (수정 후) | next.config.ts remotePatterns 추가 |
| PATCH /api/members/[id]/public 권한 | PASS | 본인 또는 admin/owner만 허용 |
| URL 파라미터 UUID 검증 | FAIL | 모든 [id] 라우트에 UUID 형식 검증 없음 (HIGH-3,4) |
| 레이트리밋 | FAIL | POST inquiries에 IP 기반 쿨다운 없음 (HIGH-1) |

---

## 기능 구현 체크리스트 (플랜 대비)

| 기능 | 구현 | 비고 |
|------|------|------|
| 공개 페이지 `/portfolio` | ✅ | 9개 섹션 모두 렌더 |
| Hero 섹션 (타이틀+미디어+CTA) | ✅ | |
| About 섹션 (텍스트+장르 배지) | ✅ | |
| 대표 영상 섹션 (is_featured) | ✅ | |
| 공연 영상 섹션 (kind=performance) | ✅ | |
| 커버/기타 영상 탭 | ✅ | |
| 포토 갤러리 + 라이트박스 | ✅ | |
| 경력 타임라인 (연도별) | ✅ | |
| 멤버 카드 그리드 | ✅ | |
| CTA 푸터 섹션 | ✅ | |
| "이 레퍼런스로 문의하기" 바인딩 | ✅ | VideoPlayerDialog에서 reference_media_id 전달 |
| 멤버 카드 → 개인 섭외 문의 | ✅ | defaultTargetType='member', defaultMemberId 바인딩 |
| InquiryDialog honeypot | ✅ | `_hp` 필드 + 서버 체크 |
| 5초 쿨다운 | ✅ | 클라이언트 setCooldown(5) |
| 관리자 /manage/portfolio 5탭 | ✅ | 소개/미디어/경력/멤버/문의함 |
| SectionEditor (소개글 편집) | ✅ | |
| MediaManager (미디어 CRUD + 순서) | ✅ | |
| ImageUploader (signed URL 업로드) | ✅ | |
| CareerManager (경력 CRUD) | ✅ | |
| CareerManager 순서 변경 | ❌ | API 없음, silently ignore (MEDIUM-5) |
| MemberPublicEditor (공개 프로필) | ✅ | |
| InquiryInbox (문의 관리) | ✅ | |
| SEO generateMetadata | ✅ | og:image 포함 |
| public_crew_members_view PII 보호 | ✅ | |
| Storage bucket 정책 | ✅ | |
| DB 마이그레이션 (수동 적용 필요) | ⚠ | 수동 적용 미완료 |

---

## 직접 수정한 파일 목록

| 파일 | 수정 내용 | 이유 |
|------|----------|------|
| `next.config.ts` | `images.remotePatterns` 추가 (Supabase Storage + YouTube) | CRITICAL: 런타임 이미지 500 에러 방지 |
| `lib/validators.ts` | `portfolioInquiryInputSchema`에 날짜 역순 + budget_range refine 추가 | CRITICAL: 서버 데이터 무결성 보장 |
| `components/portfolio/InquiryForm.tsx` | combobox `aria-controls="member-listbox"` + listbox `id` 추가 | a11y lint error 수정 |
| `app/portfolio/page.tsx` | `let sections` → `const sections` | prefer-const lint 수정 |
| `app/portfolio/layout.tsx` | `let mediaMap` → `const mediaMap` | prefer-const lint 수정 |
| `app/(main)/manage/portfolio/page.tsx` | `let sections` → `const sections` | prefer-const lint 수정 |
| `components/portfolio/admin/InquiryInbox.tsx` | `BUDGET_TYPE_LABELS` 미사용 변수 제거 | lint warning 제거 |
| `components/portfolio/admin/MediaEditPanel.tsx` | 미사용 `toast` import 제거 | lint warning 제거 |
| `components/portfolio/admin/MemberPublicEditor.tsx` | 미사용 `PublicCrewMember` import 제거 | lint warning 제거 |
