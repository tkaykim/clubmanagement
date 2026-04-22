# Designer — State Specs

## Loading
- Page loading: 레이아웃 shell은 유지하고, `.card` 자리에 Skeleton div (bg:muted-2, border-radius:8, height:content) + pulse animation.
- Next.js `loading.tsx` 각 라우트에 배치. 상단에 `<SkeletonStat/>`, `<SkeletonCard h=200/>` 패턴.
- 버튼 로딩: text → spinner(lucide Loader2 + animate-spin) + 기존 텍스트 옆 추가, `disabled`.

## Error
- Page error: `error.tsx` — `.empty` 스타일 사용, icon=AlertTriangle, 제목 "문제가 발생했어요" + 상세 msg(toLowerCase) + btn "다시 시도" (reset()).
- API 에러: toast(type=error) — 배경 `--danger`, 텍스트 #fff. 자동 4s 후 close.
- 필드 에러: label 밑 `<small style={{color:'var(--danger)'}}/>`.

## Empty
- 프로젝트 없음: icon=Folder + "아직 프로젝트가 없어요" + (admin only) btn primary "새 프로젝트 만들기"
- 일정 없음: icon=Calendar + "예정된 일정이 없어요"
- 공지 없음: icon=Megaphone + "새 공지가 없어요"
- 지원자 없음(모집중): icon=Users + "아직 지원자가 없어요"
- 검색 결과 없음: icon=Search + "'{q}' 에 해당하는 결과가 없어요"

## Success / Info toasts
- 저장 완료: toast(type=default) "저장되었습니다"
- 제출 완료: "지원이 접수되었습니다"
- 삭제 확인: Modal 표시, `btn danger "삭제"` + `btn ghost "취소"`. 삭제 후 toast "삭제되었습니다".
- 복사: "클립보드에 복사되었습니다"

## Status banners
- 승인 대기 사용자 로그인 시: 상단 `.banner.soft` + icon=Clock + "가입 승인을 기다리고 있어요. 관리자 확인 후 이용 가능합니다"
- 비활성 멤버: 모든 페이지 상단 `.banner`(solid fg) + "접근 권한이 없습니다. 관리자에게 문의하세요." + 버튼 없음
- 모집중 프로젝트 마감 임박: `.banner` `--warn-bg` "D-3 마감 임박"

## Modal overlays
- 삭제 확인 (destructive): 제목 "정말 삭제하시겠어요?" + body "이 작업은 되돌릴 수 없습니다" + danger btn
- 포지션 선택, 상태 전환, 점수 입력 → inline modal
- 작성 모달은 모바일에서 하단 시트로 전환 (.modal-root align-items:flex-end)

## Online / Offline
- navigator.onLine 감지. 오프라인 시 상단 `.banner` + "오프라인 상태입니다. 변경사항은 저장되지 않을 수 있어요."
- PWA: 서비스워커 업데이트 감지 시 toast + "새 버전이 있어요 · 새로고침".

## Animation
- 페이지 전환: Next.js 기본. `motion` 불필요.
- modal/drawer: 기본 slide + fade (CSS keyframes `slideUp/slideL`)
- bottom nav active indicator: transform 150ms
- 버튼 press: translateY(1px) 60ms

## Skeleton 패턴
```tsx
export function SkeletonCard({h=120}) {
  return <div className="card" style={{height:h}}><div className="sk"/></div>;
}
/* globals.css */
.sk { width:100%; height:100%; background: var(--muted-2); border-radius:8px; animation: pulse 1.6s infinite; }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
```

## Counts (batch-fresh)
- 사이드바·바텀탭 count 뱃지는 서버 컴포넌트에서 초기값, 클라이언트 `useSWR` 10초 interval 갱신. (선택)
- 기본은 SSR 값만 써서 최초 렌더 이후 재검증 없음으로도 동작.
