import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface OsAvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function OsAvatar({ name, src, size, className }: OsAvatarProps) {
  const cls = cn("av", size === "sm" && "sm", size === "lg" && "lg", className);
  if (src) {
    return <img src={src} alt={name} className={cls} style={{ objectFit: "cover" }} />;
  }
  return <div className={cls}>{initials(name)}</div>;
}

interface AvatarStackProps {
  members: Array<{ id: string; name: string }>;
  max?: number;
}

export function AvatarStack({ members, max = 5 }: AvatarStackProps) {
  const visible = members.slice(0, max);
  const overflow = members.length - max;
  return (
    <div className="av-stack">
      {visible.map((m) => (
        <div key={m.id} className="av sm">
          {initials(m.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="av sm outline">+{overflow}</div>
      )}
    </div>
  );
}
