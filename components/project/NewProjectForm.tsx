"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, CalendarDays, ImageIcon } from "lucide-react";

export function NewProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [scheduleUndecided, setScheduleUndecided] = useState(false);
  const [fee, setFee] = useState(0);
  const [hasFee, setHasFee] = useState(false);
  const [recruitmentStartAt, setRecruitmentStartAt] = useState("");
  const [hasDeadline, setHasDeadline] = useState(true);
  const [recruitmentEndAt, setRecruitmentEndAt] = useState("");
  const [hasMaxParticipants, setHasMaxParticipants] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  const [syncRecruitment, setSyncRecruitment] = useState(true);
  const [scheduleDates, setScheduleDates] = useState<string[]>([]);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleStartDateChange(value: string) {
    setStartDate(value);
    if (value && endDate && value > endDate) setEndDate(value);
    if (syncRecruitment) {
      setRecruitmentStartAt(value ? value + "T00:00" : "");
      if (hasDeadline) setRecruitmentEndAt(endDate || value);
    }
  }

  function handleEndDateChange(value: string) {
    if (value && startDate && value < startDate) return;
    setEndDate(value);
    if (syncRecruitment && hasDeadline) setRecruitmentEndAt(value);
  }

  function addScheduleRange() {
    if (!rangeStart || !rangeEnd) return;
    const start = new Date(rangeStart + "T00:00:00");
    const end = new Date(rangeEnd + "T00:00:00");
    if (start > end) {
      setError("시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diff > 90) {
      setError("최대 90일 구간까지 추가할 수 있습니다.");
      return;
    }
    const newDates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const ds = cursor.toISOString().slice(0, 10);
      if (!scheduleDates.includes(ds)) newDates.push(ds);
      cursor.setDate(cursor.getDate() + 1);
    }
    if (newDates.length === 0) {
      setError("이미 모두 추가된 날짜입니다.");
      return;
    }
    setScheduleDates((prev) => [...prev, ...newDates].sort());
    setRangeStart("");
    setRangeEnd("");
    setError(null);
  }

  function removeScheduleDate(date: string) {
    setScheduleDates((prev) => prev.filter((d) => d !== date));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("프로젝트 이름을 입력하세요.");
      return;
    }
    if (!scheduleUndecided && startDate && endDate && startDate > endDate) {
      setError("프로젝트 종료일이 시작일보다 앞설 수 없습니다.");
      return;
    }
    if (
      hasDeadline &&
      recruitmentStartAt &&
      recruitmentEndAt &&
      recruitmentStartAt.slice(0, 10) > recruitmentEndAt
    ) {
      setError("모집 시작일이 마감일보다 늦을 수 없습니다.");
      return;
    }
    if (!scheduleUndecided && !startDate) {
      setError("프로젝트 일정을 설정하거나 '미정'으로 표시하세요.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: newProjectId, error: insertErr } = await supabase.rpc(
        "create_project",
        {
          p_owner_id: user.id,
          p_title: trimmedTitle,
          p_description: description.trim() || null,
          p_poster_url: posterUrl.trim() || null,
          p_start_date: scheduleUndecided ? null : startDate || null,
          p_end_date: scheduleUndecided ? null : endDate || null,
          p_schedule_undecided: scheduleUndecided,
          p_fee: hasFee ? fee : 0,
          p_recruitment_start_at: recruitmentStartAt || null,
          p_recruitment_end_at:
            hasDeadline && recruitmentEndAt ? recruitmentEndAt : null,
          p_max_participants: hasMaxParticipants ? maxParticipants : null,
          p_status: "recruiting",
        },
      );
      if (insertErr || !newProjectId) {
        setError(insertErr?.message || "생성에 실패했습니다.");
        setSubmitting(false);
        return;
      }

      if (scheduleDates.length > 0) {
        const { error: dateErr } = await supabase.rpc("add_schedule_dates", {
          p_project_id: newProjectId,
          p_dates: scheduleDates,
        });
        if (dateErr) {
          console.error("일정 후보 저장 실패:", dateErr.message);
        }
      }

      router.push("/manage");
    } catch {
      setError("생성에 실패했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 기본 정보 */}
          <div className="space-y-2">
            <Label htmlFor="title">프로젝트 이름 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 2025 정기 공연"
              className="rounded-lg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">프로젝트 설명</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대해 소개해주세요"
              className="min-h-[100px] rounded-lg"
            />
          </div>

          {/* 포스터 이미지 */}
          <div className="space-y-2">
            <Label htmlFor="poster_url" className="flex items-center gap-1.5">
              <ImageIcon className="size-4" />
              포스터 이미지 URL
            </Label>
            <Input
              id="poster_url"
              type="url"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
              placeholder="https://example.com/poster.jpg"
              className="rounded-lg"
            />
            {posterUrl && (
              <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterUrl}
                  alt="포스터 미리보기"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>

          {/* 참여비 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">참여비</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="hasFee"
                    checked={!hasFee}
                    onChange={() => {
                      setHasFee(false);
                      setFee(0);
                    }}
                  />
                  무료
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="hasFee"
                    checked={hasFee}
                    onChange={() => setHasFee(true)}
                  />
                  유료
                </label>
              </div>
            </div>
            {hasFee && (
              <div className="space-y-1.5">
                <Input
                  type="number"
                  min={0}
                  step={1000}
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value) || 0)}
                  placeholder="금액 입력"
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  원 단위로 입력하세요
                </p>
              </div>
            )}
          </div>

          {/* 모집 기간 */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">모집 기간</Label>
            <div className="space-y-1.5">
              <Label
                htmlFor="recruitment_start"
                className="text-xs text-muted-foreground"
              >
                모집 시작일
              </Label>
              <Input
                id="recruitment_start"
                type="datetime-local"
                value={recruitmentStartAt}
                onChange={(e) => setRecruitmentStartAt(e.target.value)}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="recruitment_end"
                  className="text-xs text-muted-foreground"
                >
                  모집 마감일
                </Label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!hasDeadline}
                    onChange={(e) => {
                      setHasDeadline(!e.target.checked);
                      if (e.target.checked) setRecruitmentEndAt("");
                    }}
                  />
                  마감일 없음
                </label>
              </div>
              {hasDeadline && (
                <Input
                  id="recruitment_end"
                  type="date"
                  value={recruitmentEndAt}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (recruitmentStartAt && v && v < recruitmentStartAt.slice(0, 10)) return;
                    setRecruitmentEndAt(v);
                  }}
                  min={recruitmentStartAt ? recruitmentStartAt.slice(0, 10) : undefined}
                  className="rounded-lg"
                />
              )}
            </div>
          </div>

          {/* 참여 인원 제한 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">참여 인원</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="hasMax"
                    checked={!hasMaxParticipants}
                    onChange={() => setHasMaxParticipants(false)}
                  />
                  제한 없음
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="hasMax"
                    checked={hasMaxParticipants}
                    onChange={() => setHasMaxParticipants(true)}
                  />
                  인원 제한
                </label>
              </div>
            </div>
            {hasMaxParticipants && (
              <div className="space-y-1.5">
                <Input
                  type="number"
                  min={1}
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(Number(e.target.value) || 1)
                  }
                  placeholder="최대 인원 수"
                  className="rounded-lg"
                />
                <p className="text-xs text-muted-foreground">
                  최대 {maxParticipants}명까지 지원 받습니다
                </p>
              </div>
            )}
          </div>

          {/* 프로젝트 일정 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">프로젝트 일정</Label>
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={scheduleUndecided}
                  onChange={(e) => setScheduleUndecided(e.target.checked)}
                />
                미정
              </label>
            </div>
            {!scheduleUndecided && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="start_date"
                      className="text-xs text-muted-foreground"
                    >
                      시작일
                    </Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="end_date"
                      className="text-xs text-muted-foreground"
                    >
                      종료일
                    </Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      min={startDate || undefined}
                      className="rounded-lg"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={syncRecruitment}
                    onChange={(e) => {
                      setSyncRecruitment(e.target.checked);
                      if (e.target.checked && startDate) {
                        setRecruitmentStartAt(startDate + "T00:00");
                        if (hasDeadline) setRecruitmentEndAt(endDate || startDate);
                      }
                    }}
                  />
                  모집 기간을 프로젝트 기간과 동일하게 설정
                </label>
              </div>
            )}
            {scheduleUndecided && (
              <p className="text-xs text-muted-foreground">
                일정이 미정인 경우 아래 후보 날짜를 설정하여 참여자들의 연습
                가능 일정을 취합할 수 있습니다.
              </p>
            )}
          </div>

          {/* 연습 가능 일정 후보 */}
          <div className="space-y-3">
            <Label className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarDays className="size-4" />
              연습 가능 일정 후보
            </Label>
            <p className="text-xs text-muted-foreground">
              참여자들이 각 날짜별로 가능한 시간대를 투표합니다.
            </p>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    시작일
                  </Label>
                  <Input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    종료일
                  </Label>
                  <Input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => {
                      if (rangeStart && e.target.value && e.target.value < rangeStart) return;
                      setRangeEnd(e.target.value);
                    }}
                    min={rangeStart || undefined}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addScheduleRange}
                disabled={!rangeStart || !rangeEnd}
                className="w-full rounded-lg gap-1"
              >
                <Plus className="size-4" />
                구간 날짜 일괄 추가
              </Button>
            </div>

            {scheduleDates.length > 0 && (
              <div className="space-y-1.5">
                {scheduleDates.map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarDays className="size-3.5 text-muted-foreground" />
                      {new Date(date + "T00:00:00").toLocaleDateString(
                        "ko-KR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        },
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeScheduleDate(date)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {scheduleDates.length}개 후보 날짜가 설정되었습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setScheduleDates([])}
                    className="text-xs text-destructive hover:underline"
                  >
                    전체 삭제
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl"
          >
            {submitting ? "생성 중…" : "프로젝트 공지하기"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
