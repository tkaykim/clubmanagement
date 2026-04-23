"use client";

import { useState } from "react";

interface PortfolioAdminTabsProps {
  sectionEditor: React.ReactNode;
  mediaManager: React.ReactNode;
  careerManager: React.ReactNode;
  memberEditor: React.ReactNode;
}

const TABS = [
  { value: "intro", label: "소개" },
  { value: "media", label: "미디어" },
  { value: "career", label: "경력" },
  { value: "members", label: "멤버 프로필" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function PortfolioAdminTabs({
  sectionEditor,
  mediaManager,
  careerManager,
  memberEditor,
}: PortfolioAdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("intro");

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`tab ${activeTab === t.value ? "on" : ""}`}
            onClick={() => setActiveTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: activeTab === "intro" ? "block" : "none" }}>{sectionEditor}</div>
      <div style={{ display: activeTab === "media" ? "block" : "none" }}>{mediaManager}</div>
      <div style={{ display: activeTab === "career" ? "block" : "none" }}>{careerManager}</div>
      <div style={{ display: activeTab === "members" ? "block" : "none" }}>{memberEditor}</div>
    </>
  );
}
