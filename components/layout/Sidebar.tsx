import {
  Home,
  Folder,
  Calendar,
  Users,
  Megaphone,
  User,
  Sparkles,
  FileText,
  DollarSign,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { initials } from "@/lib/utils";
import type { CrewMember } from "@/lib/types";

interface SidebarProps {
  me: CrewMember | null;
  isAdmin: boolean;
  counts?: {
    projects?: number;
    unreadAnn?: number;
    myPending?: number;
  };
  className?: string;
  onNavClick?: () => void;
}

export function Sidebar({ me, isAdmin, counts = {}, className, onNavClick }: SidebarProps) {
  return (
    <aside className={`sidebar ${className ?? ""}`}>
      {/* Brand */}
      <div className="brand">
        <img src="/icon-192.png" alt="원샷크루 로고" />
        <div className="wordmark">
          <b>원샷크루</b>
          <span>ONESHOT CREW</span>
        </div>
      </div>

      {/* MAIN 그룹 */}
      <div className="nav-group-title">MAIN</div>
      <NavItem href="/" icon={Home} onClick={onNavClick}>홈</NavItem>
      <NavItem href="/projects" icon={Folder} count={counts.projects} onClick={onNavClick}>프로젝트</NavItem>
      <NavItem href="/calendar" icon={Calendar} onClick={onNavClick}>내 캘린더</NavItem>
      <NavItem href="/members" icon={Users} onClick={onNavClick}>멤버</NavItem>
      <NavItem href="/announcements" icon={Megaphone} count={counts.unreadAnn} onClick={onNavClick}>공지</NavItem>

      {/* PERSONAL 그룹 */}
      <div className="nav-group-title">PERSONAL</div>
      <NavItem href="/mypage" icon={User} count={counts.myPending} onClick={onNavClick}>마이페이지</NavItem>
      <NavItem href="/apply" icon={Sparkles} onClick={onNavClick}>빠른 지원</NavItem>

      {/* ADMIN 그룹 */}
      {isAdmin && (
        <>
          <div className="nav-group-title">ADMIN</div>
          <NavItem
            href="/manage"
            icon={FileText}
            onClick={onNavClick}
            exclude={["/manage/settlements", "/manage/members"]}
          >
            프로젝트 관리
          </NavItem>
          <NavItem href="/manage/settlements" icon={DollarSign} onClick={onNavClick}>정산 리포트</NavItem>
          <NavItem href="/manage/members" icon={Users} onClick={onNavClick}>멤버 관리</NavItem>
        </>
      )}

      {/* 하단 유저 카드 */}
      <div style={{ flex: 1 }} />
      {me && (
        <div className="me">
          <div className="avatar">{initials(me.name)}</div>
          <div>
            <b>{me.stage_name ?? me.name}</b>
            <small>{me.role.toUpperCase()}</small>
          </div>
        </div>
      )}
    </aside>
  );
}
