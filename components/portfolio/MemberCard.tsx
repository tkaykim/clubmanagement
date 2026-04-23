import Image from "next/image";
import type { PublicCrewMember } from "@/lib/types";

interface MemberCardProps {
  member: PublicCrewMember;
  onInquire: (memberId: string) => void;
}

export function MemberCard({ member, onInquire }: MemberCardProps) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-os)",
        overflow: "hidden",
        background: "#fff",
        transition: "transform 150ms, box-shadow 150ms",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      <div style={{ position: "relative", aspectRatio: "4/5", background: "var(--fg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {member.profile_image_url ? (
          <Image
            src={member.profile_image_url}
            alt={member.stage_name || member.name}
            fill
            style={{ objectFit: "cover" }}
            loading="lazy"
          />
        ) : (
          <span style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>
            {(member.stage_name || member.name).charAt(0)}
          </span>
        )}
      </div>
      <div style={{ padding: "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{member.stage_name || member.name}</div>
        {member.position && (
          <div style={{ fontSize: 12, color: "var(--mf)" }}>{member.position}</div>
        )}
        {member.public_bio && (
          <div style={{ fontSize: 11, color: "var(--mf)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {member.public_bio}
          </div>
        )}
        {member.specialties && member.specialties.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
            {member.specialties.slice(0, 3).map((s) => (
              <span key={s} style={{ fontSize: 10, padding: "2px 6px", border: "1px solid var(--border)", borderRadius: 999, color: "var(--mf)" }}>
                {s}
              </span>
            ))}
          </div>
        )}
        <button
          className="btn sm ghost"
          style={{ marginTop: "auto", width: "100%" }}
          onClick={() => onInquire(member.id)}
        >
          섭외 문의하기 →
        </button>
      </div>
    </div>
  );
}
