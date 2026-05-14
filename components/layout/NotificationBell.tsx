"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

interface Props {
  variant?: "mobile" | "desktop";
}

const POLL_INTERVAL_MS = 5 * 60 * 1000;

export function NotificationBell({ variant = "desktop" }: Props) {
  const [unread, setUnread] = useState(0);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unread=1", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      setUnread(Number(json?.data?.unread ?? 0));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [refresh]);

  const className = variant === "mobile" ? "icon-btn" : "btn icon-only";
  const iconSize = variant === "mobile" ? 18 : 14;

  return (
    <button
      type="button"
      className={className}
      aria-label="알림"
      onClick={() => router.push("/notifications")}
      style={{ position: "relative" }}
    >
      <Bell size={iconSize} strokeWidth={2} />
      {unread > 0 && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: variant === "mobile" ? 6 : 2,
            right: variant === "mobile" ? 6 : 2,
            minWidth: 14,
            height: 14,
            padding: "0 4px",
            borderRadius: 7,
            background: "#ef4444",
            color: "#fff",
            fontSize: 9,
            fontWeight: 700,
            lineHeight: "14px",
            textAlign: "center",
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
