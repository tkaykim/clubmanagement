import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <Icon className="ico" strokeWidth={1.5} />
      <div style={{ marginBottom: action ? 12 : 0 }}>{message}</div>
      {action && (
        action.href ? (
          <a href={action.href} className="btn sm mt-12">
            {action.label}
          </a>
        ) : (
          <button className="btn sm mt-12" onClick={action.onClick}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
