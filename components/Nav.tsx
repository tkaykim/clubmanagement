import Link from "next/link";

const links = [
  { href: "/", label: "홈" },
  { href: "/clubs", label: "동아리" },
  { href: "/events", label: "공개 이벤트" },
  { href: "/dashboard", label: "체험 대시" },
  { href: "/calendar", label: "캘린더" },
];

export function Nav() {
  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold text-foreground">
          우동
        </Link>
        <div className="flex gap-4">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
