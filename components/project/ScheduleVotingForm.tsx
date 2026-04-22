"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  Plus,
  X,
  Check,
  HelpCircle,
  XCircle,
  Copy,
  ChevronDown,
  FolderOpen,
  Minus,
} from "lucide-react";
import type { VoteStatus, TimeSlot } from "@/lib/types";

type ScheduleDateRow = {
  id: string;
  date: string;
  label: string | null;
  sort_order: number;
};

type DateVoteState = {
  status: VoteStatus;
  timeSlots: TimeSlot[];
  note: string;
};

type CopySourceProject = {
  projectId: string;
  projectTitle: string;
  matchCount: number;
  totalDates: number;
  votes: Record<string, { status: VoteStatus; timeSlots: TimeSlot[] }>;
};

const STATUS_CONFIG: Record<
  VoteStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  available: {
    label: "가능",
    icon: <Check className="size-3.5" />,
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  partial: {
    label: "부분가능",
    icon: <Minus className="size-3.5" />,
    className: "bg-lime-100 text-lime-800 border-lime-300",
  },
  adjustable: {
    label: "조정가능",
    icon: <HelpCircle className="size-3.5" />,
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  unavailable: {
    label: "불가",
    icon: <XCircle className="size-3.5" />,
    className: "bg-red-100 text-red-800 border-red-300",
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function ScheduleVotingForm({ projectId }: { projectId: string }) {
  const [dates, setDates] = useState<ScheduleDateRow[]>([]);
  const [votes, setVotes] = useState<Record<string, DateVoteState>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [showCopyPanel, setShowCopyPanel] = useState(false);
  const [copySources, setCopySources] = useState<CopySourceProject[]>([]);
  const [loadingCopySources, setLoadingCopySources] = useState(false);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data: scheduleDates } = await supabase
      .from("project_schedule_dates")
      .select("id, date, label, sort_order")
      .eq("project_id", projectId)
      .order("date");

    const dateList = (scheduleDates ?? []) as ScheduleDateRow[];
    setDates(dateList);

    if (dateList.length === 0) {
      setLoading(false);
      return;
    }

    const initialVotes: Record<string, DateVoteState> = {};
    dateList.forEach((d) => {
      initialVotes[d.id] = { status: "available", timeSlots: [], note: "" };
    });

    if (user) {
      const dateIds = dateList.map((d) => d.id);
      const { data: existingVotes } = await supabase
        .from("schedule_votes")
        .select("id, schedule_date_id, status, time_slots, note")
        .in("schedule_date_id", dateIds)
        .eq("user_id", user.id);

      for (const v of existingVotes ?? []) {
        const ev = v as {
          id: string;
          schedule_date_id: string;
          status: VoteStatus;
          time_slots: TimeSlot[];
          note: string | null;
        };
        initialVotes[ev.schedule_date_id] = {
          status: ev.status,
          timeSlots: Array.isArray(ev.time_slots) ? ev.time_slots : [],
          note: ev.note ?? "",
        };
      }
    }

    setVotes(initialVotes);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function loadCopySources() {
    if (!userId || dates.length === 0) return;
    setLoadingCopySources(true);

    const currentDateStrings = new Set(dates.map((d) => d.date));

    const { data: myVotes } = await supabase
      .from("schedule_votes")
      .select(
        "status, time_slots, schedule_date_id, schedule_date:project_schedule_dates(id, date, project_id)"
      )
      .eq("user_id", userId);

    if (!myVotes || myVotes.length === 0) {
      setCopySources([]);
      setLoadingCopySources(false);
      return;
    }

    const byProject: Record<
      string,
      {
        dates: Record<string, { status: VoteStatus; timeSlots: TimeSlot[] }>;
        totalDates: number;
      }
    > = {};

    for (const v of myVotes) {
      const sd = v.schedule_date as unknown as {
        id: string;
        date: string;
        project_id: string;
      } | null;
      if (!sd || sd.project_id === projectId) continue;

      if (!byProject[sd.project_id]) {
        byProject[sd.project_id] = { dates: {}, totalDates: 0 };
      }
      byProject[sd.project_id].totalDates++;
      byProject[sd.project_id].dates[sd.date] = {
        status: v.status as VoteStatus,
        timeSlots: Array.isArray(v.time_slots)
          ? (v.time_slots as TimeSlot[])
          : [],
      };
    }

    const projectIds = Object.keys(byProject);
    if (projectIds.length === 0) {
      setCopySources([]);
      setLoadingCopySources(false);
      return;
    }

    const { data: projects } = await supabase
      .from("projects")
      .select("id, title")
      .in("id", projectIds);

    const projectNameMap: Record<string, string> = {};
    for (const p of projects ?? []) {
      projectNameMap[p.id] = p.title;
    }

    const sources: CopySourceProject[] = [];
    for (const [pid, data] of Object.entries(byProject)) {
      const matchingDates = Object.keys(data.dates).filter((d) =>
        currentDateStrings.has(d)
      );
      if (matchingDates.length === 0) continue;

      const matchedVotes: Record<
        string,
        { status: VoteStatus; timeSlots: TimeSlot[] }
      > = {};
      for (const d of matchingDates) {
        matchedVotes[d] = data.dates[d];
      }

      sources.push({
        projectId: pid,
        projectTitle: projectNameMap[pid] ?? "프로젝트",
        matchCount: matchingDates.length,
        totalDates: data.totalDates,
        votes: matchedVotes,
      });
    }

    sources.sort((a, b) => b.matchCount - a.matchCount);
    setCopySources(sources);
    setLoadingCopySources(false);
  }

  function applyCopySource(source: CopySourceProject) {
    const dateByDateStr: Record<string, string> = {};
    for (const d of dates) {
      dateByDateStr[d.date] = d.id;
    }

    setVotes((prev) => {
      const next = { ...prev };
      for (const [dateStr, voteData] of Object.entries(source.votes)) {
        const dateId = dateByDateStr[dateStr];
        if (dateId) {
          next[dateId] = {
            status: voteData.status,
            timeSlots: voteData.timeSlots.map((s) => ({ ...s })),
            note: prev[dateId]?.note ?? "",
          };
        }
      }
      return next;
    });

    setShowCopyPanel(false);
    setMessage({
      type: "success",
      text: `"${source.projectTitle}"에서 ${source.matchCount}개 날짜의 일정을 가져왔습니다. 저장 버튼을 눌러 확정하세요.`,
    });
  }

  function updateVoteStatus(dateId: string, status: VoteStatus) {
    setVotes((prev) => ({
      ...prev,
      [dateId]: { ...prev[dateId], status },
    }));
  }

  function addTimeSlot(dateId: string) {
    setVotes((prev) => ({
      ...prev,
      [dateId]: {
        ...prev[dateId],
        timeSlots: [
          ...prev[dateId].timeSlots,
          { start: "09:00", end: "18:00" },
        ],
      },
    }));
  }

  function removeTimeSlot(dateId: string, index: number) {
    setVotes((prev) => ({
      ...prev,
      [dateId]: {
        ...prev[dateId],
        timeSlots: prev[dateId].timeSlots.filter((_, i) => i !== index),
      },
    }));
  }

  function updateTimeSlot(
    dateId: string,
    index: number,
    field: "start" | "end",
    value: string
  ) {
    setVotes((prev) => ({
      ...prev,
      [dateId]: {
        ...prev[dateId],
        timeSlots: prev[dateId].timeSlots.map((s, i) =>
          i === index ? { ...s, [field]: value } : s
        ),
      },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) {
      setMessage({ type: "error", text: "로그인이 필요합니다." });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    try {
      for (const dateId of Object.keys(votes)) {
        const vote = votes[dateId];
        const { error } = await supabase
          .from("schedule_votes")
          .upsert(
            {
              schedule_date_id: dateId,
              user_id: userId,
              status: vote.status,
              time_slots: vote.timeSlots,
              note: vote.note.trim() || null,
            },
            { onConflict: "schedule_date_id,user_id" }
          );
        if (error) throw error;
      }
      setMessage({ type: "success", text: "연습 일정 투표가 저장되었습니다!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "저장에 실패했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <p className="text-sm text-muted-foreground">일정 불러오는 중…</p>
    );
  if (dates.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            연습 일정 투표
          </h2>
          {userId && (
            <button
              type="button"
              onClick={() => {
                if (showCopyPanel) {
                  setShowCopyPanel(false);
                } else {
                  setShowCopyPanel(true);
                  if (copySources.length === 0) loadCopySources();
                }
              }}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Copy className="size-3" />
              다른 프로젝트에서 가져오기
              <ChevronDown
                className={`size-3 transition-transform ${showCopyPanel ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          각 날짜별로 연습 가능 여부와 시간대를 선택해주세요.
        </p>

        {showCopyPanel && (
          <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Copy className="size-3.5" />
              이전 투표 내역에서 가져오기
            </p>
            <p className="text-xs text-muted-foreground">
              겹치는 날짜의 가능 여부와 시간대가 자동으로 채워집니다.
            </p>

            {loadingCopySources ? (
              <p className="text-xs text-muted-foreground py-2">
                불러오는 중…
              </p>
            ) : copySources.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                겹치는 날짜가 있는 이전 투표 내역이 없습니다.
              </p>
            ) : (
              <div className="space-y-1.5">
                {copySources.map((src) => (
                  <button
                    key={src.projectId}
                    type="button"
                    onClick={() => applyCopySource(src)}
                    className="w-full flex items-center gap-3 rounded-lg border bg-background p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FolderOpen className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {src.projectTitle}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        겹치는 날짜 {src.matchCount}개 / 전체{" "}
                        {src.totalDates}개
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-[10px] shrink-0"
                    >
                      {src.matchCount}개 적용
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {dates.map((d) => {
            const vote = votes[d.id];
            if (!vote) return null;
            const cfg = STATUS_CONFIG[vote.status];

            return (
              <div key={d.id} className="rounded-xl border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{formatDate(d.date)}</p>
                    {d.label && (
                      <p className="text-xs text-muted-foreground">
                        {d.label}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className={`gap-1 ${cfg.className}`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </Badge>
                </div>

                <div className="flex gap-1.5">
                  {(Object.keys(STATUS_CONFIG) as VoteStatus[]).map((s) => {
                    const c = STATUS_CONFIG[s];
                    const isActive = vote.status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => updateVoteStatus(d.id, s)}
                        className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium border transition-all ${
                          isActive
                            ? c.className
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {c.icon}
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      {vote.status === "unavailable"
                        ? `불가능 시간대${vote.timeSlots.length === 0 ? " (종일 불가)" : ""}`
                        : `가능 시간대${vote.timeSlots.length === 0 ? " (종일 가능)" : ""}`}
                    </Label>
                    <button
                      type="button"
                      onClick={() => addTimeSlot(d.id)}
                      className="flex items-center gap-0.5 text-xs text-primary hover:underline"
                    >
                      <Plus className="size-3" />
                      시간 추가
                    </button>
                  </div>
                  {vote.timeSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start}
                        onChange={(e) =>
                          updateTimeSlot(d.id, i, "start", e.target.value)
                        }
                        className="flex-1 rounded-lg text-xs h-8"
                      />
                      <span className="text-xs text-muted-foreground">
                        ~
                      </span>
                      <Input
                        type="time"
                        value={slot.end}
                        onChange={(e) =>
                          updateTimeSlot(d.id, i, "end", e.target.value)
                        }
                        className="flex-1 rounded-lg text-xs h-8"
                      />
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(d.id, i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

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
            disabled={submitting || !userId}
            className="w-full rounded-xl"
          >
            {submitting ? "저장 중…" : "투표 저장하기"}
          </Button>

          {!userId && (
            <p className="text-xs text-center text-muted-foreground">
              로그인 후 투표할 수 있습니다.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
