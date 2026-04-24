import { createServerSupabaseClient } from "@/lib/supabase-server";
import { InquiryInbox, type InquiryWithRefs } from "@/components/portfolio/admin/InquiryInbox";

export const dynamic = "force-dynamic";

export default async function ManageInquiriesPage() {
  const supabase = createServerSupabaseClient();

  let inquiries: InquiryWithRefs[] = [];
  let inquiryTotal = 0;

  try {
    const { data } = await supabase
      .from("portfolio_inquiries")
      .select(
        `*,
         target_member:crew_members!target_member_id(id, stage_name, name),
         reference_media:portfolio_media!reference_media_id(id, title, youtube_url, thumbnail_url)`
      )
      .order("created_at", { ascending: false })
      .limit(200);
    inquiries = (data ?? []) as unknown as InquiryWithRefs[];
    inquiryTotal = inquiries.length;
  } catch {
    // 빈 상태
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>섭외 문의</h1>
          <div className="sub">공개 포트폴리오로 들어온 문의 내역</div>
        </div>
      </div>

      <div className="card">
        <div style={{ padding: 20 }}>
          <InquiryInbox initialInquiries={inquiries} initialTotal={inquiryTotal} />
        </div>
      </div>
    </div>
  );
}
