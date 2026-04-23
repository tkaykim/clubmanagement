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
  Bug,
  ImageIcon,
  Inbox,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { initials, memberKindOf } from "@/lib/utils";
import type { CrewMember } from "@/lib/types";

const KIND_LABEL: Record<ReturnType<typeof memberKindOf>, string> = {
  leader: "리더",
  operator: "운영진",
  contract_member: "계약멤버",
  regular_member: "일반멤버",
  external_guest: "게스트",
};

interface SidebarProps {
  me: CrewMember | null;
  isAdmin: boolean;
  counts?: {
    projects?: number;
    unreadAnn?: number;
    myPending?: number;
    newInquiry?: number;
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
      <NavItem href="/bugs/new" icon={Bug} onClick={onNavClick}>버그 제보</NavItem>

      {/* ADMIN 그룹 */}
      {isAdmin && (
        <>
          <div className="nav-group-title">ADMIN</div>
          <NavItem
            href="/manage"
            icon={FileText}
            onClick={onNavClick}
            exclude={["/manage/settlements", "/manage/members", "/manage/bugs", "/manage/portfolio", "/manage/inquiries"]}
          >
            프로젝트 관리
          </NavItem>
          <NavItem href="/manage/portfolio" icon={ImageIcon} onClick={onNavClick}>포트폴리오 관리</NavItem>
          <NavItem href="/manage/inquiries" icon={Inbox} count={counts.newInquiry} onClick={onNavClick}>섭외 문의</NavItem>
          <NavItem href="/manage/settlements" icon={DollarSign} onClick={onNavClick}>정산 리포트</NavItem>
          <NavItem href="/manage/members" icon={Users} onClick={onNavClick}>멤버 관리</NavItem>
          <NavItem href="/manage/bugs" icon={Bug} onClick={onNavClick}>버그 리포트</NavItem>
        </>
      )}

      {/* 하단 유저 카드 */}
      <div style={{ flex: 1 }} />
      {me && (
        <div className="me">
          <div className="avatar">{initials(me.name)}</div>
          <div>
            <b>{me.stage_name ?? me.name}</b>
            <small>{KIND_LABEL[memberKindOf(me.role, me.contract_type)]}</small>
          </div>
        </div>
      )}
    </aside>
  );
}
