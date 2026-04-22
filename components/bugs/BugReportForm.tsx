"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY_OPTIONS = [
  { value: "low", label: "가벼움", hint: "불편하지만 쓸 수는 있음" },
  { value: "medium", label: "보통", hint: "일부 기능이 제대로 안 됨" },
  { value: "high", label: "심각", hint: "중요한 기능이 안 됨" },
  { value: "blocker", label: "막힘", hint: "아예 못 씀 / 데이터 날아감" },
] as const;

type Severity = (typeof SEVERITY_OPTIONS)[number]["value"];

export function BugReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("무엇이 문제인지 한 줄로 적어주세요");
      return;
    }
    if (!description.trim()) {
      toast.error("상황 설명을 적어주세요");
      return;
    }

    setSubmitting(true);
    try {
      // 자동 캡처: URL / UA / 뷰포트
      const page_url =
        typeof window !== "undefined"
          ? document.referrer || window.location.href
          : null;
      const user_agent =
        typeof navigator !== "undefined" ? navigator.userAgent : null;
      const viewport =
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : null;

      const res = await fetch("/api/bugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          severity,
          page_url,
          user_agent,
          viewport,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? "제보 저장에 실패했습니다");
        return;
      }
      toast.success("제보 감사합니다! 확인 후 빠르게 처리할게요.");
      router.push("/");
    } catch {
      toast.error("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card">
        <div style={{ padding: 24 }}>
          {/* 안내 */}
          <div
            className="banner mb-16"
            style={{ borderColor: "var(--border)", background: "var(--bg-soft)" }}
          >
            <Info size={16} strokeWidth={2} />
            <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
              어떤 페이지에서 무엇을 누르려다 뭐가 이상했는지 편하게 적어주세요.
              <br />
              <span className="muted">
                화면 크기·브라우저·페이지 주소는 자동으로 함께 보내집니다.
              </span>
            </div>
          </div>

          {/* 제목 */}
          <div className="field">
            <label htmlFor="bug-title">
              무엇이 문제인가요? <span className="req">*</span>
            </label>
            <input
              id="bug-title"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 지원하기 버튼을 눌러도 반응이 없어요"
              maxLength={200}
              required
            />
          </div>

          {/* 설명 */}
          <div className="field">
            <label htmlFor="bug-description">
              어떤 상황이었나요? <span className="req">*</span>
            </label>
            <textarea
              id="bug-description"
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={[
                "자유롭게 적어주세요. 예시:",
                "- 어떤 페이지에서 무엇을 클릭했는지",
                "- 원래는 어떻게 될 거라 생각했는지",
                "- 실제로 어떤 일이 벌어졌는지 (오류 메시지가 있었다면 그대로 적어주세요)",
              ].join("\n")}
              rows={8}
              maxLength={5000}
              required
            />
            <div
              className="mono text-xs muted"
              style={{ textAlign: "right", marginTop: 4 }}
            >
              {description.length}/5000
            </div>
          </div>

          {/* 심각도 */}
          <div className="field">
            <label>얼마나 심각한가요?</label>
            <div className="seg full">
              {SEVERITY_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={cn(severity === s.value && "on")}
                  onClick={() => setSeverity(s.value)}
                  title={s.hint}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div
              className="hint"
              style={{ fontSize: 11.5, color: "var(--mf)", marginTop: 6 }}
            >
              {SEVERITY_OPTIONS.find((s) => s.value === severity)?.hint}
            </div>
          </div>
        </div>
      </div>

      <div
        className="row"
        style={{ justifyContent: "flex-end", gap: 8, marginTop: 24 }}
      >
        <button
          type="button"
          className="btn ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          취소
        </button>
        <button type="submit" className="btn primary lg" disabled={submitting}>
          {submitting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Send size={14} strokeWidth={2} />
          )}
          {submitting ? "전송 중…" : "제보 보내기"}
        </button>
      </div>
    </form>
  );
}
