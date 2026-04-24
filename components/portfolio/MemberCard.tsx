import Image from "next/image";
import type { PublicCrewMember } from "@/lib/types";

interface MemberCardProps {
  member: PublicCrewMember;
  onInquire: (memberId: string) => void;
}

export function MemberCard({ member, onInquire }: MemberCardProps) {
  const label = member.stage_name || member.name;

  return (
    <div className="pf-member-card">
      <div className="pf-member-thumb">
        {member.profile_image_url ? (
          <Image
            src={member.profile_image_url}
            alt={label}
            fill
            style={{ objectFit: "cover" }}
            loading="lazy"
            sizes="(max-width:640px) 50vw, (max-width:1023px) 33vw, 25vw"
          />
        ) : (
          <div className="pf-member-initials">
            {label.charAt(0)}
          </div>
        )}
      </div>
      <div className="pf-member-body">
        <div className="pf-member-name">{label}</div>
        {member.position && (
          <div className="pf-member-position">{member.position}</div>
        )}
        {member.public_bio && (
          <div className="pf-member-bio">{member.public_bio}</div>
        )}
        {member.specialties && member.specialties.length > 0 && (
          <div className="pf-member-specialties">
            {member.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  border: "1px solid var(--pf-border-2)",
                  borderRadius: 999,
                  color: "var(--pf-mf)",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.04em",
                }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
        <button
          className="btn sm"
          style={{ marginTop: "auto", width: "100%" }}
          onClick={() => onInquire(member.id)}
        >
          섭외 문의 →
        </button>
      </div>
    </div>
  );
}
