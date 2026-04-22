import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Link from "next/link";
import { ChevronLeft, Pin } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AnnouncementDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data: ann, error } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, scope, created_at, project_id")
    .eq("id", id)
    .single();

  if (error || !ann) notFound();

  return (
    <div className="page">
      <div className="row mb-12">
        <Link href="/announcements" className="btn ghost sm">
          <ChevronLeft size={14} strokeWidth={2} />
          공지
        </Link>
      </div>

      <div className="card">
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <div className="row gap-8 mb-8">
            {ann.pinned && <Pin size={14} strokeWidth={2} style={{ color: "var(--warn)" }} />}
            <span className="badge">{ann.scope === "team" ? "팀" : "프로젝트"}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>
            {ann.title}
          </h1>
          <div className="mono text-xs muted">
            {new Date(ann.created_at).toLocaleDateString("ko-KR", {
              year: "numeric", month: "long", day: "numeric"
            })}
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", color: "var(--fg-soft)" }}>
            {ann.body}
          </p>
        </div>
      </div>
    </div>
  );
}
