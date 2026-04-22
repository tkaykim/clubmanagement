"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWABanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("oc.pwa-dismissed") === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (!prompt) return;
    await prompt.prompt();
    setVisible(false);
  };

  const handleClose = () => {
    localStorage.setItem("oc.pwa-dismissed", "1");
    setVisible(false);
  };

  return (
    <div className="pwa-banner" role="banner">
      <img src="/icon-192.png" alt="원샷크루" />
      <div className="body">
        <div className="t">홈 화면에 추가</div>
        <div className="s">앱처럼 빠르게 이용하세요</div>
      </div>
      <button className="btn primary sm" onClick={handleInstall}>
        설치
      </button>
      <button
        className="close"
        onClick={handleClose}
        aria-label="배너 닫기"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
