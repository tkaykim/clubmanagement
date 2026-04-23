interface GenreBadgeProps {
  genre: string;
  size?: "default" | "lg";
}

export function GenreBadge({ genre, size = "default" }: GenreBadgeProps) {
  const fontSize = size === "lg" ? 13 : 11.5;
  const padding = size === "lg" ? "6px 14px" : "4px 10px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize,
        padding,
        border: "1px solid var(--pf-border)",
        borderRadius: 999,
        fontWeight: 500,
        background: "var(--pf-bg-card)",
        color: "var(--pf-ink)",
      }}
    >
      {genre.trim()}
    </span>
  );
}
