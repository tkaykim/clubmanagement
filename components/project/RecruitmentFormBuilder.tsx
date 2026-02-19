"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { ProjectRecruitmentForm, ProjectRecruitmentQuestion, RecruitmentQuestionType } from "@/lib/types";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  List,
  CheckSquare,
  AlignLeft,
  Image,
} from "lucide-react";

const QUESTION_TYPE_LABELS: Record<RecruitmentQuestionType, string> = {
  short_text: "짧은 답 (한 줄)",
  long_text: "한 줄 텍스트",
  paragraph_short: "짧은 서술형",
  paragraph_long: "긴 서술형",
  radio: "라디오 (단일 선택)",
  checkbox: "체크박스 (복수 선택)",
  select: "드롭다운 선택",
  file_upload: "사진/파일 첨부",
};

type QuestionDraft = {
  id: string;
  type: RecruitmentQuestionType;
  label: string;
  required: boolean;
  options: string[];
};

type Props = {
  clubId: string;
  projectId: string;
  initialForm: ProjectRecruitmentForm | null;
  initialQuestions: ProjectRecruitmentQuestion[];
};

export function RecruitmentFormBuilder({ clubId, projectId, initialForm, initialQuestions }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialForm?.title ?? "");
  const [description, setDescription] = useState(initialForm?.description ?? "");
  const [posterUrl, setPosterUrl] = useState(initialForm?.poster_url ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(() =>
    initialQuestions.length > 0
      ? initialQuestions
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((q) => ({
            id: q.id,
            type: q.type,
            label: q.label,
            required: q.required,
            options: optionsFromDb(q),
          }))
      : []
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  function optionsFromDb(q: ProjectRecruitmentQuestion): string[] {
    if (!q.options) return [];
    if (Array.isArray(q.options)) return q.options as string[];
    return [String(q.options)];
  }

  useEffect(() => {
    setTitle(initialForm?.title ?? "");
    setDescription(initialForm?.description ?? "");
    setPosterUrl(initialForm?.poster_url ?? "");
    if (initialQuestions.length > 0) {
      const sorted = [...initialQuestions].sort((a, b) => a.sort_order - b.sort_order);
      setQuestions(
        sorted.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          required: q.required,
          options: optionsFromDb(q),
        }))
      );
    } else {
      setQuestions([]);
    }
  }, [initialForm?.id, initialForm?.title, initialForm?.description, initialForm?.poster_url, initialQuestions.map((q) => q.id).join(",")]);

  function addQuestion(type: RecruitmentQuestionType = "short_text") {
    setQuestions((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        type,
        label: "",
        required: true,
        options: type === "radio" || type === "checkbox" || type === "select" ? ["옵션 1"] : [],
      },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, dir: 1 | -1) {
    const next = index + dir;
    if (next < 0 || next >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function addOption(index: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, options: [...q.options, `옵션 ${q.options.length + 1}`] } : q
      )
    );
  }

  function removeOption(index: number, optionIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, options: q.options.filter((_, j) => j !== optionIndex) } : q
      )
    );
  }

  function updateOption(index: number, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index
          ? { ...q, options: q.options.map((o, j) => (j === optionIndex ? value : o)) }
          : q
      )
    );
  }

  async function handleSave() {
    setMessage(null);
    setSaving(true);
    try {
      let formId = initialForm?.id;
      if (!formId) {
        const { data: newForm, error: formErr } = await supabase
          .from("project_recruitment_forms")
          .insert({ project_id: projectId, title: title || null, description: description || null, poster_url: posterUrl || null })
          .select("id")
          .single();
        if (formErr) throw new Error(formErr.message);
        formId = newForm.id;
      } else {
        const { error: formErr } = await supabase
          .from("project_recruitment_forms")
          .update({ title: title || null, description: description || null, poster_url: posterUrl || null, updated_at: new Date().toISOString() })
          .eq("id", formId);
        if (formErr) throw new Error(formErr.message);
      }

      const existingIds = questions.filter((q) => !q.id.startsWith("new-")).map((q) => q.id);
      const { data: existingRows } = await supabase
        .from("project_recruitment_questions")
        .select("id")
        .eq("form_id", formId);
      const toDelete = (existingRows ?? []).map((r) => r.id).filter((id) => !existingIds.includes(id));
      if (toDelete.length > 0) {
        await supabase.from("project_recruitment_questions").delete().in("id", toDelete);
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const payload = {
          form_id: formId,
          sort_order: i,
          type: q.type,
          label: q.label || "(제목 없음)",
          required: q.required,
          options: q.options.length > 0 ? q.options : null,
        };
        if (q.id.startsWith("new-")) {
          await supabase.from("project_recruitment_questions").insert(payload);
        } else {
          await supabase.from("project_recruitment_questions").update(payload).eq("id", q.id);
        }
      }
      setMessage({ type: "success", text: "저장되었습니다." });
      router.refresh();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  }

  const choiceTypes: RecruitmentQuestionType[] = ["radio", "checkbox", "select"];
  const hasOptions = (type: RecruitmentQuestionType) => choiceTypes.includes(type);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <h3 className="text-sm font-semibold text-foreground">폼 정보</h3>
          <div className="space-y-2">
            <Label htmlFor="form-title">제목</Label>
            <Input
              id="form-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="모집 폼 제목"
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-desc">설명</Label>
            <Textarea
              id="form-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="안내 문구"
              className="min-h-[80px] rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="form-poster">대표 사진 URL</Label>
            <Input
              id="form-poster"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://..."
              className="rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">설문 문항</h3>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("short_text")}>
            <Type className="size-4" /> 짧은 답
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("paragraph_short")}>
            <AlignLeft className="size-4" /> 짧은 서술
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("paragraph_long")}>
            <AlignLeft className="size-4" /> 긴 서술
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("radio")}>
            <List className="size-4" /> 라디오
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("checkbox")}>
            <CheckSquare className="size-4" /> 체크박스
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("select")}>
            <List className="size-4" /> 드롭다운
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addQuestion("file_upload")}>
            <Image className="size-4" /> 파일 첨부
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, index) => (
          <Card key={q.id} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <GripVertical className="size-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {QUESTION_TYPE_LABELS[q.type]}
                  {q.required && " *"}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => moveQuestion(index, -1)} disabled={index === 0}>
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1}>
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => removeQuestion(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  value={q.label}
                  onChange={(e) => updateQuestion(index, { label: e.target.value })}
                  placeholder="문항 제목"
                  className="rounded-lg"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                  />
                  필수
                </label>
                {hasOptions(q.type) && (
                  <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground">선택지</p>
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="flex gap-2">
                        <Input
                          value={opt}
                          onChange={(e) => updateOption(index, oi, e.target.value)}
                          placeholder={`옵션 ${oi + 1}`}
                          className="rounded-lg"
                        />
                        <Button type="button" size="sm" variant="ghost" className="shrink-0 text-destructive" onClick={() => removeOption(index, oi)}>
                          삭제
                        </Button>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" className="gap-1 rounded-lg" onClick={() => addOption(index)}>
                      <Plus className="size-4" /> 선택지 추가
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <Card className="border-dashed border-border/80 bg-muted/20">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">문항이 없습니다. 위 버튼으로 문항을 추가하세요.</p>
            <Button type="button" variant="outline" className="mt-3 gap-1 rounded-lg" onClick={() => addQuestion()}>
              <Plus className="size-4" /> 첫 문항 추가
            </Button>
          </CardContent>
        </Card>
      )}

      {message && (
        <p className={message.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message.text}</p>
      )}
      <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl">
        {saving ? "저장 중…" : "모집 폼 저장"}
      </Button>
    </div>
  );
}
