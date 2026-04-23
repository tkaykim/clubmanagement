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
        border: "1px solid var(--border-2)",
        borderRadius: 999,
        fontWeight: 500,
        background: "#fff",
        color: "var(--fg)",
      }}
    >
      {genre.trim()}
    </span>
  );
}
