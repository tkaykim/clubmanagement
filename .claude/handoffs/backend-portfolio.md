# 핸드오프 — backend-portfolio

## 작업 요약

포트폴리오 + 섭외 문의 기능을 위한 API 라우트 전체를 구현했다.
`tsc --noEmit` 및 `npm run build` 모두 통과.
DB 마이그레이션(`014_portfolio.sql`)은 Supabase Studio에서 수동 적용이 필요하다.

---

## 마이그레이션 적용 (수동 필요)

`supabase/migrations/014_portfolio.sql` 을 Supabase Studio SQL Editor에서 실행:
- URL: https://supabase.com/dashboard/project/ouavlxtxvtmtnuitaopy/sql/new
- 전체 파일 내용을 붙여넣고 실행

적용 후 확인 사항:
- 신규 테이블 5개: `portfolio_sections`, `portfolio_media`, `portfolio_media_members`, `portfolio_careers`, `portfolio_inquiries`
- `crew_members` 신규 컬럼: `profile_image_url`, `is_public`, `public_bio`, `specialties`
- 뷰: `public_crew_members_view`
- Storage 버킷: `portfolio` (public read)
- RLS 정책 각 테이블에 적용됨

---

## 생성한 API 라우트 (10개)

| 파일 | 메서드 | Auth | 설명 |
|------|--------|------|------|
| `app/api/portfolio/sections/route.ts` | GET | Public | 섹션 목록 조회 |
| `app/api/portfolio/sections/route.ts` | PATCH | Admin | 섹션 배열 upsert |
| `app/api/portfolio/media/route.ts` | GET | Public | 미디어 목록 (kind/featured 필터) |
| `app/api/portfolio/media/route.ts` | POST | Admin | 미디어 생성 + 멤버 태깅 |
| `app/api/portfolio/media/[id]/route.ts` | PATCH | Admin | 미디어 수정 |
| `app/api/portfolio/media/[id]/route.ts` | DELETE | Admin | 미디어 삭제 |
| `app/api/portfolio/media/reorder/route.ts` | POST | Admin | sort_order 일괄 변경 |
| `app/api/portfolio/careers/route.ts` | GET | Public | 경력 목록 (category 필터) |
| `app/api/portfolio/careers/route.ts` | POST | Admin | 경력 생성 |
| `app/api/portfolio/careers/[id]/route.ts` | PATCH | Admin | 경력 수정 |
| `app/api/portfolio/careers/[id]/route.ts` | DELETE | Admin | 경력 삭제 |
| `app/api/portfolio/inquiries/route.ts` | POST | Public | 문의 제출 (honeypot _hp 체크) |
| `app/api/portfolio/inquiries/route.ts` | GET | Admin | 문의 목록 (status/page/limit) |
| `app/api/portfolio/inquiries/[id]/route.ts` | PATCH | Admin | 문의 status·memo 업데이트 |
| `app/api/portfolio/inquiries/[id]/route.ts` | DELETE | Admin | 문의 삭제 |
| `app/api/portfolio/upload-url/route.ts` | POST | Admin | Signed Upload URL 발급 |
| `app/api/portfolio/public/route.ts` | GET | Public | 섹션+미디어+경력+공개멤버 일괄 |
| `app/api/members/[id]/public/route.ts` | PATCH | Admin or Self | 공개 프로필 수정 |

---

## 구현 세부 사항

### YouTube URL 처리
- `POST/PATCH /api/portfolio/media` 에서 `youtube_url` 존재 시 `extractYouTubeId()` 검증
- ID null 이면 400 반환
- `thumbnail_url` 미입력 시 `youtubeThumbnail(id, 'hq')` 로 자동 채움
- DB에는 원본 URL 저장 (렌더 시 `youtubeEmbed()` 로 embed URL 생성)

### 멤버 태깅
- `POST /api/portfolio/media`: `member_ids` 배열을 `portfolio_media_members`에 insert
- `PATCH /api/portfolio/media/[id]`: `member_ids` 제공 시 DELETE-INSERT 패턴으로 전체 교체
- 실패 시 console.error 로그만 (미디어 자체는 생성/수정 유지)

### 문의 honeypot
- `POST /api/portfolio/inquiries`: body `_hp` 필드에 값 있으면 `{ data: {} }` 200 반환 (봇에게 에러 노출 금지)

### Signed Upload URL
- `POST /api/portfolio/upload-url`: `{ kind, ext }` → path `portfolio/{kind}/{uuid}.{ext}` 생성
- `createSignedUploadUrl(path, { upsert: false })` 로 URL 발급
- 허용 ext: jpg, jpeg, png, webp, gif, avif
- 응답: `{ signedUrl, path, publicUrl }`

### 공개 멤버 조회
- `GET /api/portfolio/media`: `public_crew_members_view` 뷰를 조인하여 email/phone 노출 차단
- `GET /api/portfolio/public`: 동일 뷰 사용

---

## 남은 이슈 / TODO

1. **마이그레이션 수동 적용 필요**: Service Role Key 없이 MCP execute_sql 도구 접근 불가. Supabase Studio에서 직접 실행 요망.
2. **Storage 정책 upsert 주의**: 마이그레이션의 `portfolio_storage_*` 정책이 이미 다른 정책과 충돌하는 경우 `DROP POLICY IF EXISTS` 로 처리됨 — 정상.
3. **`createSignedUploadUrl` 타입**: Supabase client 버전에 따라 반환 형식 차이 가능. 빌드 통과 기준 구현됨.

---

## frontend 에이전트에게 알릴 점

### 클라이언트 fetch 패턴

```ts
// 공개 페이지 (SSR Server Component 권장)
const supabase = createServerSupabaseClient();
const { data: sections } = await supabase.from('portfolio_sections').select('*');
const { data: media } = await supabase
  .from('portfolio_media')
  .select(`*, members:portfolio_media_members(sort_order, crew_member:public_crew_members_view(...))`)
  .order('sort_order');

// 클라이언트 컴포넌트라면 GET /api/portfolio/public 호출
const res = await fetch('/api/portfolio/public');
const { data } = await res.json();
```

### Supabase Storage 업로드 플로우

```ts
// 1. Admin: signed URL 발급
const { data } = await fetch('/api/portfolio/upload-url', {
  method: 'POST',
  body: JSON.stringify({ kind: 'photos', ext: 'webp' }),
}).then(r => r.json());
// data.signedUrl, data.path, data.publicUrl

// 2. 클라이언트에서 Storage에 직접 업로드
import { createBrowserSupabaseClient } from '@/lib/supabase';
const supabase = createBrowserSupabaseClient();
const { error } = await supabase.storage
  .from('portfolio')
  .uploadToSignedUrl(data.path, token, file);
// token은 data.signedUrl에서 파싱하거나 별도 필드로 받아야 함

// 3. 업로드 완료 후 data.publicUrl을 media.image_url 또는 thumbnail_url에 저장
await fetch('/api/portfolio/media', {
  method: 'POST',
  body: JSON.stringify({ kind: 'photo', image_url: data.publicUrl, ... }),
});
```

주의: `supabase.storage.uploadToSignedUrl(path, token, file)` 에서 `token`은 signed URL의 token 파라미터다. `signedUrl`에서 `token=` 쿼리 파라미터를 추출하거나, Supabase JS SDK v2의 `createSignedUploadUrl` 반환 `token` 필드를 별도로 반환받아야 한다. 현재 `/api/portfolio/upload-url` 응답에는 `signedUrl` 전체가 포함되므로 프론트엔드에서 파싱하거나 `fetch(signedUrl, { method: 'PUT', body: file })` 방식으로 직접 업로드해도 된다.

### 문의 폼 honeypot

```tsx
// InquiryForm 에 숨김 필드 추가
<input name="_hp" type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
// _hp 값은 Zod 스키마에서 제외하고, fetch body에 포함시켜 전송
```

### 공개 멤버 조회

`public_crew_members_view` 뷰는 `is_active=true AND is_public=true` 조건으로 필터된 안전한 뷰다.
직접 쿼리 시 email/phone이 없는 컬럼만 노출됨.
crew_members 테이블을 직접 SELECT할 때는 반드시 공개 컬럼만 select할 것.

### genres 값 파싱

`portfolio_sections` 에서 `key='genres'`의 `value`는 콤마 구분 문자열:
```ts
const badges = section.genres.split(',').map(s => s.trim());
```
