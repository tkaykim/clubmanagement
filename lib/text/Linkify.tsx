import React from "react";

// http(s):// 로 시작하는 URL을 매칭. 끝의 일반 문장부호는 trim.
// React가 텍스트를 escape하므로 XSS는 React 자체 보호에 의존.
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;
const TRAIL_PUNCT = /[)\].,!?;:'"`]+$/;

function linkifyChunk(chunk: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let i = 0;
  let match: RegExpExecArray | null;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(chunk)) !== null) {
    const raw = match[0];
    const start = match.index;
    // 끝의 문장부호 떼기 — URL이 문장 끝에 있을 때 자연스럽게.
    const trail = raw.match(TRAIL_PUNCT);
    const url = trail ? raw.slice(0, raw.length - trail[0].length) : raw;
    const trailing = trail ? trail[0] : "";

    if (start > lastIndex) {
      out.push(chunk.slice(lastIndex, start));
    }
    out.push(
      <a
        key={`${keyPrefix}-l${i}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent, #2563eb)", textDecoration: "underline" }}
      >
        {url}
      </a>
    );
    if (trailing) out.push(trailing);
    lastIndex = start + raw.length;
    i += 1;
  }
  if (lastIndex < chunk.length) {
    out.push(chunk.slice(lastIndex));
  }
  return out;
}

export function Linkify({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  // 줄바꿈은 부모의 whitespace-pre-wrap에 맡기되, 안전하게 줄 단위로 분할 처리.
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, idx) => (
        <React.Fragment key={idx}>
          {linkifyChunk(line, `${idx}`)}
          {idx < lines.length - 1 && "\n"}
        </React.Fragment>
      ))}
    </>
  );
}
