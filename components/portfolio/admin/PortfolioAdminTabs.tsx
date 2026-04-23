"use client";

import { useState } from "react";

interface PortfolioAdminTabsProps {
  newCount: number;
  sectionEditor: React.ReactNode;
  mediaManager: React.ReactNode;
  careerManager: React.ReactNode;
  memberEditor: React.ReactNode;
  inquiryInbox: React.ReactNode;
}

const TABS = [
  { value: "intro", label: "소개" },
  { value: "media", label: "미디어" },
  { value: "career", label: "경력" },
  { value: "members", label: "멤버 프로필" },
  { value: "inquiries", label: "문의함" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function PortfolioAdminTabs({
  newCount,
  sectionEditor,
  mediaManager,
  careerManager,
  memberEditor,
  inquiryInbox,
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
            {t.value === "inquiries" && newCount > 0 && (
              <span className="count">{newCount}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: activeTab === "intro" ? "block" : "none" }}>{sectionEditor}</div>
      <div style={{ display: activeTab === "media" ? "block" : "none" }}>{mediaManager}</div>
      <div style={{ display: activeTab === "career" ? "block" : "none" }}>{careerManager}</div>
      <div style={{ display: activeTab === "members" ? "block" : "none" }}>{memberEditor}</div>
      <div style={{ display: activeTab === "inquiries" ? "block" : "none" }}>{inquiryInbox}</div>
    </>
  );
}
