/**
 * lib/youtube.ts — YouTube URL 파싱 및 썸네일/임베드 URL 생성 유틸
 *
 * 순수 함수만 포함. 외부 의존성 없음.
 * 서버·클라이언트 양쪽에서 사용 가능.
 */

/**
 * 다양한 형식의 YouTube URL에서 11자리 비디오 ID를 추출한다.
 *
 * 지원 형식:
 *   - https://www.youtube.com/watch?v=VIDEO_ID
 *   - https://youtu.be/VIDEO_ID
 *   - https://www.youtube.com/embed/VIDEO_ID
 *   - https://www.youtube.com/shorts/VIDEO_ID
 *   - 위 형식에 추가 쿼리 파라미터 포함된 경우
 *
 * @returns 11자리 비디오 ID, 파싱 실패 시 null
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  // youtu.be 단축 URL
  const shortMatch = url.match(
    /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})(?:[?&]|$)/
  );
  if (shortMatch) return shortMatch[1];

  // watch?v=, embed/, shorts/ 형식
  const longMatch = url.match(
    /^https?:\/\/(?:www\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})(?:[?&/]|$)/
  );
  if (longMatch) return longMatch[1];

  return null;
}

/** YouTube 썸네일 품질 옵션 */
export type YouTubeThumbnailQuality = "hq" | "mq" | "maxres";

/**
 * YouTube 비디오 ID로 썸네일 URL을 반환한다.
 *
 * @param id       11자리 YouTube 비디오 ID
 * @param quality  썸네일 품질 (기본값: 'hq')
 *   - 'hq'     → 480×360  (hqdefault)  — 거의 항상 존재
 *   - 'mq'     → 320×180  (mqdefault)
 *   - 'maxres' → 1280×720 (maxresdefault) — 일부 영상에만 존재
 */
export function youtubeThumbnail(
  id: string,
  quality: YouTubeThumbnailQuality = "hq"
): string {
  const qualityMap: Record<YouTubeThumbnailQuality, string> = {
    hq: "hqdefault",
    mq: "mqdefault",
    maxres: "maxresdefault",
  };
  return `https://i.ytimg.com/vi/${id}/${qualityMap[quality]}.jpg`;
}

/**
 * YouTube 비디오 ID로 임베드 URL을 반환한다.
 *
 * @param id  11자리 YouTube 비디오 ID
 * @returns   `https://www.youtube.com/embed/{id}`
 */
export function youtubeEmbed(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}
