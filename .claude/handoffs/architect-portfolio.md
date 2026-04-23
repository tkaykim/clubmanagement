# 핸드오프 — architect-portfolio

## 작업 요약

포트폴리오 + 섭외 문의 기능을 위한 DB 스키마, 타입, 검증 스키마, YouTube 유틸을 설계·작성했다.
실제 마이그레이션 적용은 backend 에이전트가 수동으로 수행한다.

---

## 신규/수정 파일 목록

| 파일 | 상태 | 설명 |
|------|------|------|
| `supabase/migrations/014_portfolio.sql` | 신규 | DB 스키마, RLS, Storage 버킷, 시드 |
| `lib/youtube.ts` | 신규 | YouTube ID 추출 + 썸네일/임베드 URL 유틸 |
| `lib/types.ts` | 수정 | Portfolio 도메인 타입 추가 (파일 하단에 append) |
| `lib/validators.ts` | 수정 | Zod 스키마 6종 추가 (파일 하단에 append) |
| `.claude/handoffs/architect-portfolio-api.md` | 신규 | API 계약서 (Phase 3 전체) |
| `.claude/handoffs/architect-portfolio.md` | 신규 | 이 파일 (후속 에이전트 핸드오프) |

---

## DB ERD (ASCII)

```
users
  └─< portfolio_sections (updated_by → users.id)
  └─< portfolio_media    (created_by → users.id)
  └─< portfolio_careers  (created_by → users.id)

crew_members
  ├─< portfolio_media_members (crew_member_id → crew_members.id, CASCADE)
  └─< portfolio_inquiries     (target_member_id → crew_members.id, SET NULL)

portfolio_media
  ├─< portfolio_media_members (media_id → portfolio_media.id, CASCADE)
  ├─< portfolio_careers       (media_id → portfolio_media.id, SET NULL)
  └─< portfolio_inquiries     (reference_media_id → portfolio_media.id, SET NULL)

storage.buckets (id='portfolio')
  └── storage.objects (bucket_id='portfolio')
```

---

## 주요 의사결정

### 1. crew_members anon SELECT — 뷰 방식 선택

Supabase RLS는 컬럼 레벨 보안(column-level security)을 지원하지 않는다. anon에게 `crew_members`를 직접 SELECT 허용하면 email/phone이 노출된다.

해결: RLS 정책은 `is_active=true AND is_public=true` 행 필터만 담당하고, 공개 컬럼만 포함하는 `public_crew_members_view` 뷰를 별도 생성했다. 포트폴리오 Server Component와 API 라우트에서 뷰 또는 select 컬럼 제한으로 민감 데이터를 차단한다.

### 2. portfolio_inquiries INSERT — anon RLS 허용

RLS 정책 `portfolio_inquiries_anyone_insert WITH CHECK (true)`로 anon INSERT를 허용했다. SELECT/UPDATE/DELETE는 `is_admin_or_owner()` 제한.

backend 에이전트 주의: route handler에서 anon 세션을 통한 INSERT를 사용하면 RLS가 정상 적용된다. service role bypass 시에는 honeypot + 쿨다운 로직을 반드시 서버 측에서 구현할 것.

### 3. YouTube URL 저장 — 원본 URL 유지

`youtube_url` 컬럼에는 사용자가 입력한 원본 URL을 그대로 저장한다. 임베드 URL은 `lib/youtube.ts`의 `youtubeEmbed()`로 렌더 시점에 생성한다. 이렇게 하면 나중에 YouTube URL 형식이 바뀌어도 재파싱이 가능하다.

### 4. Storage — Signed Upload URL 방식

anon이 Storage에 직접 쓰는 것을 막기 위해 `/api/portfolio/upload-url` 라우트에서만 signed upload URL을 발급한다. 클라이언트는 이 URL로만 업로드 가능하다. Storage 정책에서 `is_admin_or_owner(auth.uid())`이 없는 INSERT는 차단된다.

### 5. 글로벌 범위 스키마 (crew_id 없음)

기존 009 패턴과 동일하게 단일 크루 전제로 설계했다. `crew_id` 같은 멀티테넌시 컬럼 없음.

---

## 후속 에이전트 주의사항

### backend 에이전트

1. **마이그레이션 적용 순서**: `014_portfolio.sql`은 009(is_admin_or_owner 헬퍼)가 적용된 후에 실행해야 한다.

2. **RLS anon 정책 충돌 확인**: `crew_members`에 기존 `crew_members_auth_select`(003) 정책이 있고 이번에 `crew_members_anon_public_select`를 추가했다. 두 정책은 `TO authenticated`, `TO anon`으로 role을 분리했으므로 충돌 없음. 단, Supabase Studio에서 정책 목록을 확인해 중복 없는지 검증 필요.

3. **portfolio_inquiries 레이트 리밋**: 1차 방어는 route handler에서 honeypot 필드(`_hp`) 값 유무 확인으로 충분하다. 2차(Upstash Rate Limit 등)는 out-of-scope.

4. **멤버 태깅 트랜잭션**: `POST /api/portfolio/media`에서 `portfolio_media_members` 삽입은 media INSERT와 같은 DB 트랜잭션 내에서 처리해야 한다. Supabase에서는 RPC 함수 또는 연속 쿼리 후 롤백 로직으로 구현.

5. **signed upload URL path 규약**: `portfolio/{kind}/{uuid}.{ext}` — kind는 `hero`, `photos`, `thumbnails`, `members` 중 하나. publicUrl은 `supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl`로 얻는다.

### designer / frontend 에이전트

1. **공개 멤버 조회**: `public_crew_members_view` 뷰를 직접 쿼리하거나, `crew_members` 테이블에서 반드시 공개 컬럼만 select할 것. `email`, `phone` 컬럼을 select에 포함하지 말 것.

2. **문의 폼 honeypot**: `InquiryForm`에 숨겨진 `_hp` 필드를 추가하고 Zod 스키마에서 제외할 것. 서버 라우트에서 `_hp` 값이 있으면 조용히 201 반환.

3. **YouTube 임베드**: `lib/youtube.ts`의 `extractYouTubeId()`, `youtubeEmbed()`, `youtubeThumbnail()`을 재사용할 것. iframe `src`는 직접 문자열 조합하지 말 것.

4. **섹션 키 표시 순서**: `portfolio_sections` key 순서 권장값 — `hero_title` → `hero_subtitle` → `about_team` → `genres` → `contact_email` → `contact_phone`.

5. **`genres` 값 파싱**: `genres` 섹션 값은 콤마(,)로 구분된 문자열이다. UI에서 `value.split(',').map(s => s.trim())`으로 배지 배열로 변환.

---

## tsc 통과 여부

타입 정의는 `lib/types.ts` 하단에 순수 타입만 추가했고 외부 import 없이 자기완결적이다.
`lib/validators.ts` 추가분은 기존 `z` import를 재사용하며 새 import 없음.
`lib/youtube.ts`는 외부 의존성 없는 순수 함수 파일이다.

후속 에이전트가 `tsc --noEmit`을 실행해 통과 여부를 확인할 것.
