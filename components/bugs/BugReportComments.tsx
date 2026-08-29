"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import type { BugReportComment } from "@/lib/types";
import { Linkify } from "@/lib/text/Linkify";

interface Props {
  bugId: string;
  initialComments?: BugReportComment[];
  onCommentAdded?: (comment: BugReportComment) => void;
}

export function BugReportComments({
  bugId,
  initialComments = [],
  onCommentAdded,
}: Props) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [comments]
  );

  const submitComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error("댓글 내용을 적어주세요");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/bugs/${bugId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        toast.error(json.error ?? "댓글 저장에 실패했습니다");
        return;
      }
      const comment = json.data as BugReportComment;
      setComments((current) => [...current, comment]);
      onCommentAdded?.(comment);
      setBody("");
      toast.success("댓글을 남겼습니다");
    } catch {
      toast.error("인터넷 연결을 확인해주세요");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ marginTop: 18 }} aria-label="제보 댓글">
      <div
        className="row gap-6"
        style={{ alignItems: "center", marginBottom: 10, fontWeight: 700 }}
      >
        <MessageCircle size={15} strokeWidth={2} />
        댓글
        <span className="badge outline">{sortedComments.length}</span>
      </div>
      <div className="muted text-xs" style={{ marginBottom: 10 }}>
        제보자와 운영팀이 함께 보는 내용입니다.
      </div>

      {sortedComments.length === 0 ? (
        <div
          className="muted"
          style={{
            padding: "14px 12px",
            border: "1px dashed var(--border)",
            borderRadius: 8,
            fontSize: 12.5,
          }}
        >
          아직 남겨진 댓글이 없습니다.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }} aria-live="polite">
          {sortedComments.map((comment) => (
            <article
              key={comment.id}
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background:
                  comment.author_kind === "staff"
                    ? "color-mix(in srgb, var(--accent) 8%, var(--bg))"
                    : "var(--bg-soft)",
              }}
            >
              <div
                className="row gap-6"
                style={{ alignItems: "center", marginBottom: 6, fontSize: 12 }}
              >
                <strong>
                  {comment.author_kind === "staff"
                    ? "원샷크루 운영팀"
                    : comment.author_name}
                </strong>
                {comment.author_kind === "staff" && (
                  <span className="badge ok">운영팀</span>
                )}
                <time className="muted" dateTime={comment.created_at}>
                  {new Date(comment.created_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.65 }}>
                <Linkify text={comment.body} />
              </div>
            </article>
          ))}
        </div>
      )}

      <form onSubmit={submitComment} style={{ marginTop: 10 }}>
        <label htmlFor={`bug-comment-${bugId}`} className="sr-only">
          댓글 내용
        </label>
        <textarea
          id={`bug-comment-${bugId}`}
          className="textarea"
          rows={3}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder="확인한 내용이나 더 궁금한 점을 적어주세요."
          disabled={submitting}
        />
        <div
          className="row"
          style={{ justifyContent: "space-between", alignItems: "center", marginTop: 8 }}
        >
          <span className="muted text-xs">{body.length}/2000</span>
          <button
            type="submit"
            className="btn primary sm"
            disabled={submitting || !body.trim()}
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Send size={12} strokeWidth={2} />
            )}
            댓글 남기기
          </button>
        </div>
      </form>
    </section>
  );
}
