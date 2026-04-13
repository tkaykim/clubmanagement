"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import type { FormFieldType } from "@/lib/types";

type FieldRow = {
  id: string;
  sort_order: number;
  type: FormFieldType;
  label: string;
  required: boolean;
  options: string[] | null;
};

export function ProjectApplyForm({
  projectId,
  maxParticipants,
  currentApplicants,
}: {
  projectId: string;
  maxParticipants?: number | null;
  currentApplicants?: number;
}) {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setLoggedIn(!!user);

      if (user) {
        const { data: existing } = await supabase
          .from("project_applications")
          .select("id")
          .eq("project_id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (existing) {
          setAlreadyApplied(true);
          setLoading(false);
          return;
        }
      }

      const { data: fieldData } = await supabase
        .from("recruitment_form_fields")
        .select("id, sort_order, type, label, required, options")
        .eq("project_id", projectId)
        .order("sort_order");

      setFields((fieldData ?? []) as FieldRow[]);
      setLoading(false);
    })();
  }, [projectId]);

  function getOptions(f: FieldRow): string[] {
    if (Array.isArray(f.options)) return f.options;
    return [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }

    for (const f of fields) {
      if (!f.required) continue;
      const v = answers[f.id];
      if (
        v === undefined ||
        v === "" ||
        (Array.isArray(v) && v.length === 0)
      ) {
        setMessage({
          type: "error",
          text: `"${f.label}"을(를) 입력해 주세요.`,
        });
        return;
      }
    }

    setMessage(null);
    setSubmitting(true);

    try {
      const answersJson: Record<string, string | string[]> = {};
      for (const f of fields) {
        const v = answers[f.id];
        if (v !== undefined && v !== "") {
          answersJson[f.id] = v;
        }
      }

      const { error: insertErr } = await supabase
        .from("project_applications")
        .insert({
          project_id: projectId,
          user_id: user.id,
          status: "pending",
          answers: answersJson,
        });

      if (insertErr) {
        if (insertErr.code === "23505") {
          setMessage({ type: "error", text: "이미 지원하셨습니다." });
        } else {
          setMessage({ type: "error", text: insertErr.message });
        }
        setSubmitting(false);
        return;
      }

      const { count } = await supabase
        .from("project_applications")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);

      const orderText = count ? `${count}번째 신청` : "";
      setMessage({
        type: "success",
        text: `지원이 완료되었습니다.${orderText ? ` (${orderText})` : ""}`,
      });
      setAlreadyApplied(true);
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "지원에 실패했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">불러오는 중…</p>
    );

  if (!loggedIn) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            로그인이 필요합니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (alreadyApplied) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            이미 지원하셨습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isFull =
    maxParticipants != null && (currentApplicants ?? 0) >= maxParticipants;

  if (isFull) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            모집 인원이 마감되었습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          {message && (
            <p
              className={`mb-3 text-sm ${message.type === "error" ? "text-destructive" : "text-emerald-600"}`}
            >
              {message.text}
            </p>
          )}
          <Button
            onClick={handleSubmit as unknown as () => void}
            disabled={submitting}
            className="w-full rounded-xl gap-1.5"
          >
            <Send className="size-4" />
            {submitting ? "제출 중…" : "지원하기"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <h2 className="mb-4 text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Send className="size-4" />
          지원하기
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {sorted.map((f) => (
            <div key={f.id} className="space-y-2">
              <Label className="text-sm">
                {f.label}
                {f.required && (
                  <span className="text-destructive ml-0.5">*</span>
                )}
              </Label>

              {f.type === "short_text" && (
                <Input
                  value={(answers[f.id] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [f.id]: e.target.value,
                    }))
                  }
                  className="rounded-lg"
                  required={f.required}
                />
              )}

              {f.type === "long_text" && (
                <Textarea
                  value={(answers[f.id] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [f.id]: e.target.value,
                    }))
                  }
                  className="min-h-[80px] rounded-lg"
                  required={f.required}
                />
              )}

              {f.type === "radio" && (
                <div className="space-y-2">
                  {getOptions(f).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={f.id}
                        value={opt}
                        checked={(answers[f.id] as string) === opt}
                        onChange={() =>
                          setAnswers((prev) => ({ ...prev, [f.id]: opt }))
                        }
                        className="accent-primary"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {f.type === "checkbox" && (
                <div className="space-y-2">
                  {getOptions(f).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(
                          (answers[f.id] as string[]) ?? []
                        ).includes(opt)}
                        onChange={(e) => {
                          const current =
                            (answers[f.id] as string[]) ?? [];
                          setAnswers((prev) => ({
                            ...prev,
                            [f.id]: e.target.checked
                              ? [...current, opt]
                              : current.filter((x) => x !== opt),
                          }));
                        }}
                        className="accent-primary"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {f.type === "select" && (
                <select
                  value={(answers[f.id] as string) ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [f.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required={f.required}
                >
                  <option value="">선택해주세요</option>
                  {getOptions(f).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}

          {message && (
            <p
              className={
                message.type === "error"
                  ? "text-sm text-destructive"
                  : "text-sm text-emerald-600"
              }
            >
              {message.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl gap-1.5"
          >
            <Send className="size-4" />
            {submitting ? "제출 중…" : "지원하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
