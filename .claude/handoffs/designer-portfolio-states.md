# Designer — Portfolio 상태 명세

기존 `designer-states.md`의 패턴을 계승하며, 포트폴리오 전용 컴포넌트의 loading/empty/error/success 상태를 정의한다.

---

## 1. 공개 페이지 (`/portfolio`)

### 전체 페이지 로딩 (`app/portfolio/loading.tsx`)

Next.js `Suspense` fallback. PublicHeader는 실제 렌더 유지.

```
PublicHeader (실제, sticky)

[Hero 스켈레톤 — 배경 #0A0A0B]
  sk h=12 w=100 (eyebrow)
  sk h=44 w=320 (h1 제목, serif)
  sk h=20 w=240 (부제목)
  sk h=42 w=160 + sk h=42 w=140 (CTA 버튼 2개 가로)
  sk h=280 w=full rounded-2xl (히어로 미디어)

[About 스켈레톤 — 배경 --bg]
  sk h=8 w=80 (eyebrow)
  sk h=32 w=200 (섹션 제목)
  sk h-72 w=full (본문 텍스트 블록)
  row: sk h-8 w-24 × 5 (장르 배지)

[공연 영상 스켈레톤 — 배경 --bg]
  sk h=32 w=200 (섹션 제목)
  grid 3열:
    sk aspect-video w=full rounded-xl × 6 (썸네일)

[포토 갤러리 스켈레톤]
  grid 4열:
    sk aspect-square w=full rounded-lg × 8

[경력 스켈레톤]
  sk h=8 w=80 (연도 라벨)
  row: sk h=4 w=20 + sk h-4 w=full (날짜 + 제목) × 4

[멤버 스켈레톤]
  grid 4열:
    sk aspect=[4/5] w=full rounded-xl × 8 (카드)
```

### 섹션별 로딩 (클라이언트 재검증 시)

섹션 래퍼에 `opacity-50 pointer-events-none` 적용 + 상단 1px 프로그레스 바 (`bg:--info, height:2px, animation:slide-right`).

---

## 2. HeroSection 상태

| 상태 | 처리 방식 |
|------|----------|
| loading | 전체 로딩 스켈레톤 내 포함 |
| hero_title 없음 | `"ONESHOT CREW"` fallback 텍스트 사용 |
| hero_subtitle 없음 | 서브제목 줄 숨김 (공간 유지 안 함) |
| hero_video 없음, hero_image 없음 | 미디어 영역 숨김, 텍스트만 중앙 정렬로 변경 |
| hero_image만 있음 | `<Image priority fill objectFit="cover"/>`, 반투명 오버레이 |
| hero_video만 있음 | YouTube 썸네일 + Play 버튼 오버레이, 클릭→VideoPlayerDialog |

---

## 3. VideoPlayerDialog 상태

| 상태 | UI |
|------|----|
| 열림 (정상) | YouTube iframe src={youtubeEmbed(id)}, autoplay=1 |
| 미디어 ID 없음 | Dialog 열리지 않음 (guard) |
| iframe 로드 에러 | iframe onError 감지 어려움 → YouTube iframe 오류 메시지 자체 표시 |
| 닫는 중 | Dialog close animation |

---

## 4. PhotoGallery / LightboxDialog 상태

| 상태 | UI |
|------|----|
| 이미지 로드 중 | `.sk` 배경 (aspect-square) |
| 이미지 에러 | bg--muted + ImageOff 아이콘 (lucide) 중앙 배치 |
| Lightbox 열림 | bg rgba(0,0,0,0.92) fullscreen, 이미지 object-contain |
| Lightbox 이미지 로드 중 | Loader2 아이콘 spin 중앙 |
| 첫 사진일 때 | "이전" 버튼 `disabled + opacity-30` |
| 마지막 사진일 때 | "다음" 버튼 `disabled + opacity-30` |

---

## 5. InquiryForm 상태

### 필드별 유효성 상태

| 상태 | 표시 |
|------|------|
| 미입력(초기) | 일반 border `--border` |
| 포커스 | border `--fg` + outline 2px ring |
| 유효 | 일반 border (성공 표시 없음 — 부담감 제거) |
| 에러 | border `--danger` + `<small color:--danger>` 메시지 |

### 폼 전체 상태

| 상태 | UI |
|------|------|
| 초기 | 일반 폼 표시 |
| 제출 중 | 제출 버튼 disabled + Loader2 spin + "전송 중..." 텍스트, 모든 필드 readOnly |
| 제출 성공 (Dialog 방식) | Dialog 닫기 + `toast.success("문의가 접수되었습니다.")` |
| 제출 성공 (모달 교체 방식) | DialogContent 내부를 성공 화면으로 교체 (Check 아이콘 + 메시지 + 확인 버튼) |
| 제출 실패 (400 Zod) | `toast.error("입력한 내용을 확인해 주세요.")` + 각 필드 에러 표시 |
| 제출 실패 (500) | `toast.error("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")` |
| 쿨다운 (제출 후 5초) | 버튼 disabled + 카운트다운 표시 "(3초 후 재시도 가능)" — 문자 은 tabnum mono |

### 조건부 필드 표시

| 조건 | 표시 필드 |
|------|----------|
| target_type = 'member' | 멤버 Combobox (Command) 표시 |
| target_type = 'team' | 멤버 Combobox 숨김 |
| budget_type = 'fixed' | budget_amount Input |
| budget_type = 'range' | budget_min + budget_max Input (가로 배치) |
| budget_type = 'tbd' | 예산 입력 필드 없음 |
| reference_media_id 있음 | 레퍼런스 카드 표시 (read-only) |

---

## 6. 관리자 탭별 상태

### SectionEditor (소개 탭)

| 상태 | UI |
|------|------|
| 데이터 로드 중 | 각 Input/Textarea 위치에 `.sk` |
| 편집 중 | 정상 폼 |
| 저장 중 | 저장 버튼 disabled + Loader2 |
| 저장 성공 | `toast.success("저장되었습니다")` |
| 저장 실패 | `toast.error("저장에 실패했습니다")` |
| genres 미리보기 | Input 아래 실시간 배지 렌더 (onChange) |

### MediaManager (미디어 탭)

| 상태 | UI |
|------|------|
| 리스트 로드 중 | 리스트 영역 `.sk` × 5 |
| 항목 미선택 | 우측 패널: EmptyState "항목을 선택하거나 새 항목을 추가하세요" |
| 항목 선택됨 | 우측 패널: MediaEditPanel (편집 폼) |
| 새 항목 모드 | 우측 패널: 빈 폼 (item=null) |
| 저장 중 | 버튼 disabled + Loader2 |
| 저장 성공 | 리스트 갱신 + `toast.success("저장되었습니다")` |
| 삭제 전 확인 | 기존 Modal 패턴 "정말 삭제하시겠어요?" + danger btn |
| 삭제 성공 | 리스트에서 제거 + 패널 초기화 + `toast.success("삭제되었습니다")` |
| 순서 변경 (↑↓) | 낙관적 업데이트 → API 호출 → 실패 시 원복 + `toast.error` |

### ImageUploader (업로드 컴포넌트)

| 상태 | UI |
|------|------|
| 초기 (value 없음) | 드롭존 (점선 border, 업로드 아이콘 + 안내 텍스트) |
| 드래그 오버 | border `--info` + bg `--info-bg` |
| 파일 검증 에러 | "파일 형식이 올바르지 않습니다" or "파일 크기가 5MB를 초과합니다" (inline danger 텍스트) |
| signed URL 발급 중 | 드롭존 내 Loader2 spin |
| 업로드 중 | ProgressBar (0–100%) + 파일명 + X 취소 버튼 |
| 업로드 성공 | 썸네일 (80×80px, radius 8) + "변경" + "제거" 버튼 |
| 업로드 실패 | AlertCircle + "업로드에 실패했습니다" + "다시 시도" 버튼 |
| 기존 이미지 표시 (value 있음) | 썸네일 표시 + "변경" + "제거" 버튼 |

### CareerManager (경력 탭)

MediaManager와 동일한 리스트+패널 패턴. 추가 상태:
- 카테고리 필터 변경 시 즉시 리스트 필터 (서버 재요청 없이 클라이언트 필터링)
- sort_order 변경: ↑↓ 버튼 클릭 → 낙관적 업데이트

### MemberPublicEditor (멤버 프로필 탭)

| 상태 | UI |
|------|------|
| 전체 로드 중 | 테이블 행에 `.sk` × 10 |
| is_public Switch 변경 | 즉시 낙관적 업데이트 → API PATCH → 실패 시 원복 |
| 편집 Sheet 열림 | side=right Sheet |
| 저장 중 | Sheet 내 버튼 disabled |
| 저장 성공 | Sheet 닫기 + 테이블 행 갱신 + `toast.success("저장되었습니다")` |

### InquiryInbox (문의함 탭)

| 상태 | UI |
|------|------|
| 리스트 로드 중 | 리스트 `.sk` × 8 |
| 문의 없음 | EmptyState icon=Inbox "문의가 없습니다" |
| 특정 status 필터 적용, 항목 없음 | EmptyState "해당 상태의 문의가 없습니다" |
| 행 클릭 → Sheet 열기 | 선택 row bg--muted |
| 상태 변경 중 | Select disabled + Loader2 (Select 옆) |
| 상태 변경 성공 | InquiryStatusBadge 즉시 갱신 + `toast.success("상태가 업데이트되었습니다")` |
| 메모 저장 중 | 저장 버튼 disabled + Loader2 |
| 삭제 확인 | Modal "정말 삭제하시겠어요?" + danger btn |
| 삭제 성공 | Sheet 닫기 + 리스트에서 제거 + `toast.success("삭제되었습니다")` |
| 이메일/전화 복사 | 복사 아이콘 클릭 → `toast.success("클립보드에 복사되었습니다")` |

---

## 7. 에러 경계 (Error Boundary)

### 공개 페이지 `app/portfolio/error.tsx`

```
PublicHeader (실제)

[중앙 정렬 블록]
  AlertTriangle 48px (color: --warn)
  "포트폴리오를 불러올 수 없습니다"  (16px bold)
  "잠시 후 다시 시도해 주세요."      (13px mf)
  [btn primary "다시 시도"] → reset()
  [a href="/" class="btn ghost"] "홈으로"  (내부 앱 홈이 아닌 /portfolio 홈)
```

### 관리자 탭 에러 (개별 탭 내부)

탭 컨텐츠 내부에서 try-catch로 에러 처리 후 toast 표시. 전체 페이지 에러 바운더리 미사용.

---

## 8. 토스트 메시지 목록

모두 `sonner` (`components/ui/sonner.tsx`) 사용.

| 이벤트 | 타입 | 메시지 |
|--------|------|--------|
| 문의 제출 성공 | success | "문의가 접수되었습니다. 빠른 시일 내에 연락 드리겠습니다." |
| 문의 제출 실패 (유효성) | error | "입력한 내용을 확인해 주세요." |
| 문의 제출 실패 (서버) | error | "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." |
| 관리자 저장 성공 | success | "저장되었습니다" |
| 관리자 저장 실패 | error | "저장에 실패했습니다" |
| 삭제 성공 | success | "삭제되었습니다" |
| 이미지 업로드 성공 | success | "이미지가 업로드되었습니다" |
| 이미지 업로드 실패 | error | "이미지 업로드에 실패했습니다" |
| 클립보드 복사 | success | "클립보드에 복사되었습니다" |
| 상태 변경 성공 | success | "상태가 업데이트되었습니다" |

---

## 9. 애니메이션 명세

기존 `designer-states.md` 규칙 준수 + 포트폴리오 전용 추가:

| 요소 | 애니메이션 |
|------|-----------|
| 섹션 진입 (IntersectionObserver) | `opacity: 0 → 1` + `translateY(20px → 0)`, duration 400ms, ease-out |
| 공연 영상 카드 hover | `translateY(-2px)` + `box-shadow` 강화, transition 150ms |
| 멤버 카드 hover | `translateY(-2px)` + `box-shadow: var(--shadow-md)`, transition 150ms |
| 썸네일 Play 오버레이 | opacity 0 → 0.7, transition 150ms |
| Lightbox 열림 | `scale(0.96) → scale(1)` + opacity, duration 200ms |
| ImageUploader ProgressBar | CSS transition on `width`, ease-linear |
| 포토 갤러리 이미지 로드 완료 | opacity 0 → 1, duration 300ms |

섹션 진입 애니메이션 주의: `'use client'` 필요, Server Component에서 사용 불가 → 별도 래퍼 컴포넌트(`SectionReveal.tsx`)로 분리하거나 CSS `@keyframes` + `animation-timeline: view()` 순수 CSS 방식 사용 권장.
