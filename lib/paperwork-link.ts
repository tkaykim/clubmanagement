// 그리고엔터 공통 거래 서류(사업자등록증·통장사본·사업자 정보) 보내기 화면으로 가는 링크.
// 원샷크루 출연·섭외 대금은 엔터 계좌를 쓰므로 for 파라미터는 붙이지 않는다(기본값=엔터).
const PAPERWORK_SHARE_URL = "https://www.grigoent.co.kr/paperwork/share";

export function paperworkShareUrl(opts: { project?: string | null; to?: string | null }): string {
  const p = new URLSearchParams();
  if (opts.project) p.set("project", opts.project);
  if (opts.to) p.set("to", opts.to);
  p.set("from", "원샷크루");
  return `${PAPERWORK_SHARE_URL}?${p.toString()}`;
}
