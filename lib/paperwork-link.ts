// 그리고엔터 공통 거래 서류로 가는 링크. 원샷크루 서버(/api/paperwork/handoff)가 권한을 확인하고
// 서명한 토큰으로 grigoent 에 넘기므로, 담당자는 거기서 견적서·거래명세서까지 바로 발행할 수 있다.
export function paperworkHandoffUrl(projectId: string): string {
  return `/api/paperwork/handoff?project=${encodeURIComponent(projectId)}`;
}
