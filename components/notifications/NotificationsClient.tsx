"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  tag: string | null;
  target_type: string | null;
  target_id: string | null;
  read_at: string | null;
  created_at: string;
};

interface Props {
  initialItems: NotificationRow[];
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export function NotificationsClient({ initialItems }: Props) {
  const [items, setItems] = useState<NotificationRow[]>(initialItems);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const unreadCount = items.filter((i) => !i.read_at).length;

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    setItems((prev) =>
      prev.map((it) =>
        ids.includes(it.id) && !it.read_at ? { ...it, read_at: new Date().toISOString() } : it
      )
    );
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "읽음 처리 실패");
      }
    } catch {
      toast.error("네트워크 오류");
    }
  }

  async function markAll() {
    if (unreadCount === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((it) => (it.read_at ? it : { ...it, read_at: now })));
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "읽음 처리 실패");
      } else {
        toast.success("모두 읽음 처리됐어요");
      }
    } catch {
      toast.error("네트워크 오류");
    }
  }

  function handleClick(it: NotificationRow) {
    if (!it.read_at) void markRead([it.id]);
    if (it.url) {
      startTransition(() => router.push(it.url!));
    }
  }

  if (items.length === 0) {
    return (
      <div className="card">
        <div className="empty" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 32 }}>
          <Bell size={28} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          <div>알림이 없어요</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {unreadCount > 0 && (
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: "var(--mf)" }}>
            읽지 않은 알림 {unreadCount}건
          </span>
          <button className="btn ghost sm" onClick={markAll}>
            <Check size={12} strokeWidth={2} />
            모두 읽음
          </button>
        </div>
      )}
      <div className="card">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => handleClick(it)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "14px 18px",
              borderBottom: "1px solid var(--border)",
              background: it.read_at ? "transparent" : "rgba(59, 130, 246, 0.04)",
              cursor: it.url ? "pointer" : "default",
              border: "none",
              borderBottomColor: "var(--border)",
              borderBottomStyle: "solid",
              borderBottomWidth: "1px",
            }}
          >
            <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              {!it.read_at && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#3b82f6",
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: it.read_at ? 400 : 600, fontSize: 14, marginBottom: 2 }}>
                  {it.title}
                </div>
                {it.body && (
                  <div style={{ fontSize: 13, color: "var(--mf)", marginBottom: 4 }}>
                    {it.body}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "var(--mf)", opacity: 0.7 }}>
                  {fmtTime(it.created_at)}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
