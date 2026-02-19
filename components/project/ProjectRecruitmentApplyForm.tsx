"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { RecruitmentQuestionType } from "@/lib/types";

type FormRow = { id: string; title: string | null; description: string | null; poster_url: string | null };
type QuestionRow = { id: string; sort_order: number; type: RecruitmentQuestionType; label: string; required: boolean; options: string[] | null };

export function ProjectRecruitmentApplyForm({ projectId }: { projectId: string }) {
  const [form, setForm] = useState<FormRow | null>(null);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: formData } = await supabase
        .from("project_recruitment_forms")
        .select("id, title, description, poster_url")
        .eq("project_id", projectId)
        .maybeSingle();
      if (!formData) {
        setLoading(false);
        return;
      }
      setForm(formData);
      const { data: qData } = await supabase
        .from("project_recruitment_questions")
        .select("id, sort_order, type, label, required, options")
        .eq("form_id", formData.id)
        .order("sort_order");
      setQuestions((qData ?? []) as QuestionRow[]);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: app } = await supabase.from("project_applications").select("id").eq("project_id", projectId).eq("user_id", user.id).maybeSingle();
        setAlreadyApplied(!!app);
      }
      setLoading(false);
    })();
  }, [projectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }
    const required = questions.filter((q) => q.required);
    for (const q of required) {
      const v = answers[q.id];
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
        setMessage({ type: "error", text: `"${q.label}"을(를) 입력해 주세요.` });
        return;
      }
    }
    setMessage(null);
    setSubmitting(true);
    try {
      const { data: app, error: appErr } = await supabase
        .from("project_applications")
        .insert({ project_id: projectId, user_id: user.id, status: "pending" })
        .select("id")
        .single();
      if (appErr) {
        if (appErr.code === "23505") setMessage({ type: "error", text: "이미 지원하셨습니다." });
        else setMessage({ type: "error", text: appErr.message });
        setSubmitting(false);
        return;
      }
      for (const q of questions) {
        const v = answers[q.id];
        if (v === undefined) continue;
        const value = Array.isArray(v) ? v : v === "" ? null : v;
        if (value === null) continue;
        await supabase.from("project_application_answers").insert({
          application_id: app.id,
          question_id: q.id,
          value: Array.isArray(value) ? value : value,
        });
      }
      setMessage({ type: "success", text: "지원이 완료되었습니다." });
      setAlreadyApplied(true);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "지원에 실패했습니다." });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  if (!form || questions.length === 0) return null;

  const sorted = [...questions].sort((a, b) => a.sort_order - b.sort_order);
  const opts = (q: QuestionRow): string[] => (Array.isArray(q.options) ? q.options : q.options ? [String(q.options)] : []);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">{form.title || "지원하기"}</h2>
        {form.description && <p className="mb-4 text-xs text-muted-foreground">{form.description}</p>}
        {alreadyApplied ? (
          <p className="text-sm text-muted-foreground">이미 지원하셨습니다.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {sorted.map((q) => (
              <div key={q.id} className="space-y-2">
                <Label>
                  {q.label}
                  {q.required && " *"}
                </Label>
                {q.type === "short_text" || q.type === "long_text" ? (
                  <Input
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="rounded-lg"
                    required={q.required}
                  />
                ) : q.type === "paragraph_short" || q.type === "paragraph_long" ? (
                  <Textarea
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="min-h-[80px] rounded-lg"
                    required={q.required}
                  />
                ) : q.type === "radio" ? (
                  <div className="space-y-2">
                    {opts(q).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={(answers[q.id] as string) === opt}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : q.type === "checkbox" ? (
                  <div className="space-y-2">
                    {opts(q).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={((answers[q.id] as string[]) ?? []).includes(opt)}
                          onChange={(e) => {
                            const current = ((answers[q.id] as string[]) ?? []);
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.checked ? [...current, opt] : current.filter((x) => x !== opt),
                            }));
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : q.type === "select" ? (
                  <select
                    value={(answers[q.id] as string) ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    required={q.required}
                  >
                    <option value="">선택</option>
                    {opts(q).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : q.type === "file_upload" ? (
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setAnswers((prev) => ({ ...prev, [q.id]: f.name }));
                    }}
                    className="rounded-lg"
                  />
                ) : null}
              </div>
            ))}
            {message && (
              <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>
            )}
            <Button type="submit" disabled={submitting} className="w-full rounded-xl">
              {submitting ? "제출 중…" : "지원하기"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
