# API 계약서 — Portfolio & Inquiry (Phase 3)

모든 응답은 프로젝트 규약 `{ data: T } | { error: string, details?: ZodIssue[] }` 형식을 따른다.
인증 레벨: **Public** = anon/authenticated 모두 허용, **Admin** = `is_admin_or_owner(auth.uid())` 필요.

---

## 1. 공개 데이터 조회

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/api/portfolio/public` | Public | 섹션+미디어+경력+공개 멤버 일괄 반환 |

### GET /api/portfolio/public

```
Response 200: {
  data: {
    sections: Record<PortfolioSectionKey, string>   // key→value 맵
    media: PortfolioMediaWithMembers[]               // sort_order ASC
    careers: PortfolioCareerWithMedia[]              // event_date DESC
    members: PublicCrewMember[]                      // is_active=true AND is_public=true
  }
}
```

주의: SSR Server Component에서는 이 라우트 대신 `lib/supabase-server.ts`로 직접 쿼리. 클라이언트 컴포넌트에서만 호출.

---

## 2. 섭외 문의

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/api/portfolio/inquiries` | Public | 문의 제출 (비로그인 가능) |
| GET | `/api/portfolio/inquiries` | Admin | 문의 목록 조회 |
| PATCH | `/api/portfolio/inquiries/[id]` | Admin | status·memo 업데이트 |
| DELETE | `/api/portfolio/inquiries/[id]` | Admin | 문의 삭제 |

### POST /api/portfolio/inquiries

```
Body (portfolioInquiryInputSchema):
{
  target_type: 'team' | 'member'
  target_member_id?: string (UUID, target_type='member'일 때 필수)
  reference_media_id?: string (UUID)
  inquiry_type: 'performance' | 'broadcast' | 'commercial' | 'workshop' | 'other'
  requester_name: string (max 80)
  requester_organization?: string (max 200)
  requester_email: string (email)
  requester_phone?: string (max 40)
  region?: string (max 200)
  event_date_start?: string (YYYY-MM-DD)
  event_date_end?: string (YYYY-MM-DD)
  event_time?: string (max 100, 자유 입력 ex: "19:00~21:00")
  budget_type: 'fixed' | 'range' | 'tbd' (default 'tbd')
  budget_amount?: number (fixed일 때)
  budget_min?: number (range일 때)
  budget_max?: number (range일 때)
  message: string (min 10, max 4000)
}

Response 201: { data: PortfolioInquiry }
Response 400: { error: '입력 값을 확인해주세요', details: ZodIssue[] }
```

보안 메모:
- anon 클라이언트(`createBrowserSupabaseClient`)로 INSERT — RLS `portfolio_inquiries_anyone_insert` 정책으로 허용
- 서버 라우트에서 Zod 검증 선행 필수
- honeypot 필드(`_hp`)는 클라이언트 폼에만 존재; 서버에서 값이 채워져 있으면 조용히 200 반환

### GET /api/portfolio/inquiries

```
Query params:
  status?: 'new' | 'in_review' | 'contacted' | 'closed'
  page?: number (default 1)
  limit?: number (default 20, max 100)

Response 200: {
  data: PortfolioInquiry[]
  meta: { total: number, page: number, limit: number }
}
```

### PATCH /api/portfolio/inquiries/[id]

```
Body (portfolioInquiryAdminUpdateSchema):
{
  status?: 'new' | 'in_review' | 'contacted' | 'closed'
  admin_memo?: string (max 2000)
}

Response 200: { data: PortfolioInquiry }
Response 404: { error: '문의를 찾을 수 없습니다' }
```

### DELETE /api/portfolio/inquiries/[id]

```
Response 200: { data: { id: string } }
Response 404: { error: '문의를 찾을 수 없습니다' }
```

---

## 3. 포트폴리오 섹션

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| PATCH | `/api/portfolio/sections` | Admin | key/value 여러 개 upsert |

### PATCH /api/portfolio/sections

```
Body:
{
  sections: Array<portfolioSectionUpdateSchema>
  // 예: [{ key: 'hero_title', value: 'ONESHOT 크루' }, ...]
}

Response 200: { data: PortfolioSection[] }   // upsert된 행 전체 반환
Response 400: { error: '입력 값을 확인해주세요', details: ZodIssue[] }
```

---

## 4. 미디어 CRUD

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/api/portfolio/media` | Public | 전체 미디어 목록 (kind 필터 가능) |
| POST | `/api/portfolio/media` | Admin | 미디어 생성 + 멤버 태깅 |
| PATCH | `/api/portfolio/media/[id]` | Admin | 미디어 수정 |
| DELETE | `/api/portfolio/media/[id]` | Admin | 미디어 삭제 |
| POST | `/api/portfolio/media/reorder` | Admin | sort_order 일괄 변경 |

### GET /api/portfolio/media

```
Query params:
  kind?: 'hero_image' | 'hero_video' | 'photo' | 'performance' | 'cover' | 'other_video'
  featured?: 'true'   -- is_featured=true 필터

Response 200: { data: PortfolioMediaWithMembers[] }
```

### POST /api/portfolio/media

```
Body (portfolioMediaInputSchema):
{
  kind: 'hero_image' | 'hero_video' | 'photo' | 'performance' | 'cover' | 'other_video'
  title?: string (max 200)
  description?: string (max 2000)
  image_url?: string (url) -- Storage public URL
  youtube_url?: string (url) -- 서버에서 extractYouTubeId 검증 후 정규화 저장
  thumbnail_url?: string (url)
  sort_order?: number (default 0)
  is_featured?: boolean (default false)
  event_date?: string (YYYY-MM-DD)
  venue?: string (max 200)
  member_ids?: string[] (UUID[]) -- portfolio_media_members 동시 삽입
}

Response 201: { data: PortfolioMediaWithMembers }
Response 400: { error: '입력 값을 확인해주세요', details: ZodIssue[] }
Response 400: { error: '유효하지 않은 YouTube URL입니다' }   -- extractYouTubeId null 시
```

### PATCH /api/portfolio/media/[id]

```
Body: portfolioMediaInputSchema (partial, member_ids 포함 시 태깅 전체 교체)

Response 200: { data: PortfolioMediaWithMembers }
Response 404: { error: '미디어를 찾을 수 없습니다' }
```

### DELETE /api/portfolio/media/[id]

```
Response 200: { data: { id: string } }
Response 404: { error: '미디어를 찾을 수 없습니다' }
```

### POST /api/portfolio/media/reorder

```
Body:
{
  items: Array<{ id: string, sort_order: number }>
}

Response 200: { data: { updated: number } }
```

---

## 5. 경력 CRUD

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| GET | `/api/portfolio/careers` | Public | 전체 경력 목록 |
| POST | `/api/portfolio/careers` | Admin | 경력 생성 |
| PATCH | `/api/portfolio/careers/[id]` | Admin | 경력 수정 |
| DELETE | `/api/portfolio/careers/[id]` | Admin | 경력 삭제 |

### GET /api/portfolio/careers

```
Query params:
  category?: 'performance' | 'broadcast' | 'commercial' | 'competition' | 'workshop'

Response 200: { data: PortfolioCareerWithMedia[] }   // event_date DESC
```

### POST /api/portfolio/careers

```
Body (portfolioCareerInputSchema):
{
  title: string (min 1, max 300)
  category?: 'performance' | 'broadcast' | 'commercial' | 'competition' | 'workshop'
  event_date?: string (YYYY-MM-DD)
  location?: string (max 200)
  description?: string (max 2000)
  link_url?: string (url)
  media_id?: string (UUID) -- 연관 미디어
  sort_order?: number (default 0)
}

Response 201: { data: PortfolioCareerWithMedia }
Response 400: { error: '입력 값을 확인해주세요', details: ZodIssue[] }
```

### PATCH /api/portfolio/careers/[id]

```
Body: portfolioCareerInputSchema (partial)

Response 200: { data: PortfolioCareerWithMedia }
Response 404: { error: '경력을 찾을 수 없습니다' }
```

### DELETE /api/portfolio/careers/[id]

```
Response 200: { data: { id: string } }
Response 404: { error: '경력을 찾을 수 없습니다' }
```

---

## 6. Storage Signed Upload URL 발급

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| POST | `/api/portfolio/upload-url` | Admin | 클라이언트 직접 업로드용 Signed URL 발급 |

### POST /api/portfolio/upload-url

```
Body:
{
  kind: 'hero' | 'photos' | 'thumbnails' | 'members'
  ext: string  -- 파일 확장자 (ex: 'jpg', 'png', 'webp')
}

Response 200: {
  data: {
    signedUrl: string    -- supabase.storage.createSignedUploadUrl() 반환값
    path: string         -- 'portfolio/{kind}/{uuid}.{ext}'
    publicUrl: string    -- Storage public URL (업로드 완료 후 DB에 저장할 URL)
  }
}
Response 400: { error: '허용되지 않는 파일 형식입니다' }
```

구현 메모:
- `supabase.storage.from('portfolio').createSignedUploadUrl(path, { upsert: false })` 사용
- 허용 ext: jpg, jpeg, png, webp, gif, avif
- 클라이언트는 `supabase.storage.from('portfolio').uploadToSignedUrl(path, token, file)` 호출 후 publicUrl을 media.image_url 또는 media.thumbnail_url에 저장

---

## 7. 멤버 공개 프로필

| Method | Path | Auth | 설명 |
|--------|------|------|------|
| PATCH | `/api/members/[id]/public` | Admin or Self | 공개 프로필 필드 수정 |

### PATCH /api/members/[id]/public

```
Body (memberPublicProfileSchema):
{
  profile_image_url?: string (url)
  is_public?: boolean
  public_bio?: string (max 500)
  specialties?: string[] (max 10 items)
}

Response 200: { data: PublicCrewMember }
Response 403: { error: '권한이 없습니다' }
Response 404: { error: '멤버를 찾을 수 없습니다' }
```

권한 규칙: `auth.uid()` 가 대상 crew_member.user_id 이거나 `is_admin_or_owner()` 이면 허용.

---

## 구현 주의사항

1. **anon 클라이언트 분기**: `portfolio_inquiries` INSERT는 anon 허용이므로 route handler에서 `createServerSupabaseClient()`(service role) 대신 `createAnonymousClient()`나 요청자 세션의 클라이언트를 사용해야 RLS가 정상 적용된다. 또는 service role로 INSERT 후 별도 레이트 리밋 로직 적용.

2. **YouTube URL 정규화**: `portfolioMediaInputSchema.youtube_url`은 `.url()` 통과 후 route handler에서 `extractYouTubeId()`로 추가 검증. null이면 400 반환. 저장 시 원본 URL을 저장하고, `thumbnail_url`이 없으면 `youtubeThumbnail(id, 'hq')`로 자동 채움.

3. **멤버 태깅 트랜잭션**: `POST/PATCH /api/portfolio/media`에서 `member_ids`가 있으면 `portfolio_media_members`를 DELETE-INSERT 패턴으로 원자적 교체 (단일 트랜잭션 or Supabase RPC).

4. **민감 컬럼 노출 방지**: `crew_members` 직접 SELECT 시 반드시 공개 컬럼만 select(`id, stage_name, name, position, profile_image_url, public_bio, specialties, is_public, is_active, joined_month`). API 응답에 email/phone 포함 금지.

5. **문의 PII 보호**: `GET /api/portfolio/inquiries` 응답에서 `requester_email`, `requester_phone`은 Admin 세션에서만 반환. 프론트엔드에서 별도 마스킹 처리 권장.
