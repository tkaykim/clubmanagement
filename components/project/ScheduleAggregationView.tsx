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
  Check,
  HelpCircle,
  XCircle,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  Plus,
  X,
} from "lucide-react";
import type { AvailabilityStatus, TimeSlot } from "@/lib/types";

type ScheduleDateRow = {
  id: string;
  date: string;
  label: string | null;
  sort_order: number;
};

type VoteRow = {
  id: string;
  schedule_date_id: string;
  user_id: string;
  status: AvailabilityStatus;
  time_slots: TimeSlot[];
  note: string | null;
  user: { id: string; name: string; avatar_url: string | null };
};

type EditingVote = {
  voteId: string;
  status: AvailabilityStatus;
  timeSlots: TimeSlot[];
};

const STATUS_ICON: Record<AvailabilityStatus, React.ReactNode> = {
  available: <Check className="size-3.5 text-emerald-600" />,
  maybe: <HelpCircle className="size-3.5 text-amber-600" />,
  unavailable: <XCircle className="size-3.5 text-red-500" />,
};

const STATUS_BG: Record<AvailabilityStatus, string> = {
  available: "bg-emerald-50",
  maybe: "bg-amber-50",
  unavailable: "bg-red-50",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function ScheduleAggregationView({ projectId }: { projectId: string }) {
  const [dates, setDates] = useState<ScheduleDateRow[]>([]);
  const [votesByDate, setVotesByDate] = useState<Record<string, VoteRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [editingVote, setEditingVote] = useState<EditingVote | null>(null);
  const [saving, setSaving] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [addingDate, setAddingDate] = useState(false);

  const loadData = useCallback(async () => {
    const { data: scheduleDates } = await supabase
      .from("project_schedule_dates")
      .select("id, date, label, sort_order")
      .eq("project_id", projectId)
      .order("sort_order");

    const dateList = (scheduleDates ?? []) as ScheduleDateRow[];
    setDates(dateList);

    if (dateList.length === 0) {
      setLoading(false);
      return;
    }

    const dateIds = dateList.map((d) => d.id);
    const { data: votes } = await supabase
      .from("project_availability_votes")
      .select("id, schedule_date_id, user_id, status, time_slots, note, user:users(id, name, avatar_url)")
      .in("schedule_date_id", dateIds);

    const grouped: Record<string, VoteRow[]> = {};
    for (const d of dateList) grouped[d.id] = [];
    for (const v of (votes ?? []) as unknown as VoteRow[]) {
      if (grouped[v.schedule_date_id]) {
        grouped[v.schedule_date_id].push(v);
      }
    }
    setVotesByDate(grouped);
    setExpandedDates(new Set(dateList.map((d) => d.id)));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleDate(dateId: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateId)) next.delete(dateId);
      else next.add(dateId);
      return next;
    });
  }

  function getDateSummary(dateId: string) {
    const votes = votesByDate[dateId] ?? [];
    const available = votes.filter((v) => v.status === "available").length;
    const maybe = votes.filter((v) => v.status === "maybe").length;
    const unavailable = votes.filter((v) => v.status === "unavailable").length;
    return { total: votes.length, available, maybe, unavailable };
  }

  function startEditing(vote: VoteRow) {
    setEditingVote({
      voteId: vote.id,
      status: vote.status,
      timeSlots: Array.isArray(vote.time_slots) ? [...vote.time_slots] : [],
    });
  }

  async function saveEdit() {
    if (!editingVote) return;
    setSaving(true);
    const { error } = await supabase
      .from("project_availability_votes")
      .update({
        status: editingVote.status,
        time_slots: editingVote.timeSlots,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingVote.voteId);
    setSaving(false);
    if (!error) {
      setEditingVote(null);
      loadData();
    }
  }

  async function addScheduleDate() {
    if (!newDate) return;
    setAddingDate(true);
    const { error } = await supabase.from("project_schedule_dates").insert({
      project_id: projectId,
      date: newDate,
      sort_order: dates.length,
    });
    setAddingDate(false);
    if (!error) {
      setNewDate("");
      loadData();
    }
  }

  async function removeScheduleDate(dateId: string) {
    if (!confirm("이 날짜를 삭제하시겠습니까? 관련 투표도 모두 삭제됩니다.")) return;
    await supabase.from("project_schedule_dates").delete().eq("id", dateId);
    loadData();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">불러오는 중…</p>;
  }

  return (
    <div className="space-y-4">
      {/* 후보 날짜 추가 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <Label className="text-sm font-semibold flex items-center gap-1.5 mb-3">
            <CalendarDays className="size-4" />
            후보 날짜 관리
          </Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 rounded-lg"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addScheduleDate}
              disabled={addingDate || !newDate}
              className="gap-1 rounded-lg"
            >
              <Plus className="size-4" />
              추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {dates.length === 0 ? (
        <Card className="border-0 bg-muted/30">
          <CardContent className="py-10 text-center">
            <CalendarDays className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              설정된 후보 날짜가 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        dates.map((d) => {
          const summary = getDateSummary(d.id);
          const expanded = expandedDates.has(d.id);
          const votes = votesByDate[d.id] ?? [];

          return (
            <Card key={d.id} className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* 날짜 헤더 */}
                <button
                  type="button"
                  onClick={() => toggleDate(d.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                      <CalendarDays className="size-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{formatDate(d.date)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                          <Check className="size-3" />
                          {summary.available}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-amber-600">
                          <HelpCircle className="size-3" />
                          {summary.maybe}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-red-500">
                          <XCircle className="size-3" />
                          {summary.unavailable}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {summary.total}명
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScheduleDate(d.id);
                      }}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <X className="size-4" />
                    </button>
                    {expanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* 투표 상세 */}
                {expanded && (
                  <div className="border-t px-4 pb-4">
                    {votes.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        아직 투표한 참여자가 없습니다.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {votes.map((v) => {
                          const isEditing = editingVote?.voteId === v.id;
                          const slots = Array.isArray(v.time_slots) ? v.time_slots : [];

                          return (
                            <div key={v.id} className={`py-3 ${STATUS_BG[v.status]} rounded-lg my-1 px-3`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                    {v.user.name.charAt(0)}
                                  </div>
                                  <span className="text-sm font-medium">{v.user.name}</span>
                                  {!isEditing && (
                                    <span className="flex items-center gap-0.5">
                                      {STATUS_ICON[v.status]}
                                    </span>
                                  )}
                                </div>
                                {!isEditing ? (
                                  <button
                                    type="button"
                                    onClick={() => startEditing(v)}
                                    className="text-muted-foreground hover:text-foreground p-1"
                                  >
                                    <Edit3 className="size-3.5" />
                                  </button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={saveEdit}
                                    disabled={saving}
                                    className="gap-1 h-7 text-xs rounded-lg"
                                  >
                                    <Save className="size-3" />
                                    저장
                                  </Button>
                                )}
                              </div>

                              {isEditing && editingVote ? (
                                <div className="mt-2 space-y-2">
                                  <div className="flex gap-1.5">
                                    {(["available", "maybe", "unavailable"] as AvailabilityStatus[]).map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() =>
                                          setEditingVote({ ...editingVote, status: s })
                                        }
                                        className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium border transition-all ${
                                          editingVote.status === s
                                            ? s === "available"
                                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                              : s === "maybe"
                                              ? "bg-amber-100 text-amber-800 border-amber-300"
                                              : "bg-red-100 text-red-800 border-red-300"
                                            : "bg-background border-border"
                                        }`}
                                      >
                                        {STATUS_ICON[s]}
                                        {s === "available" ? "가능" : s === "maybe" ? "미정" : "불가"}
                                      </button>
                                    ))}
                                  </div>
                                  {editingVote.status !== "unavailable" && (
                                    <div className="space-y-1">
                                      {editingVote.timeSlots.map((slot, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                          <Input
                                            type="time"
                                            value={slot.start}
                                            onChange={(e) => {
                                              const next = [...editingVote.timeSlots];
                                              next[i] = { ...next[i], start: e.target.value };
                                              setEditingVote({ ...editingVote, timeSlots: next });
                                            }}
                                            className="flex-1 h-7 text-xs rounded-md"
                                          />
                                          <span className="text-xs">~</span>
                                          <Input
                                            type="time"
                                            value={slot.end}
                                            onChange={(e) => {
                                              const next = [...editingVote.timeSlots];
                                              next[i] = { ...next[i], end: e.target.value };
                                              setEditingVote({ ...editingVote, timeSlots: next });
                                            }}
                                            className="flex-1 h-7 text-xs rounded-md"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const next = editingVote.timeSlots.filter((_, j) => j !== i);
                                              setEditingVote({ ...editingVote, timeSlots: next });
                                            }}
                                            className="text-muted-foreground hover:text-destructive"
                                          >
                                            <X className="size-3" />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingVote({
                                            ...editingVote,
                                            timeSlots: [...editingVote.timeSlots, { start: "09:00", end: "18:00" }],
                                          })
                                        }
                                        className="text-xs text-primary hover:underline flex items-center gap-0.5"
                                      >
                                        <Plus className="size-3" />
                                        시간 추가
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <>
                                  {slots.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {slots.map((s, i) => (
                                        <Badge key={i} variant="outline" className="gap-1 text-xs">
                                          <Clock className="size-2.5" />
                                          {s.start} ~ {s.end}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {v.note && (
                                    <p className="mt-1 text-xs text-muted-foreground">{v.note}</p>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* 전체 요약 */}
      {dates.length > 0 && (
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <Users className="size-4" />
              전체 요약
            </h3>
            <div className="space-y-2">
              {dates.map((d) => {
                const summary = getDateSummary(d.id);
                const ratio = summary.total > 0 ? summary.available / summary.total : 0;
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="text-xs font-medium min-w-[100px]">
                      {formatDate(d.date).replace(/\d{4}년 /, "")}
                    </span>
                    <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                      {summary.available}/{summary.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
