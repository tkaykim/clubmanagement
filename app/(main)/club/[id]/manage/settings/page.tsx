import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ClubInstagramForm } from "@/components/club/ClubInstagramForm";
import { ClubInterestEditor } from "@/components/club/ClubInterestEditor";
import { ClubNameForm } from "@/components/club/ClubNameForm";
import { ClubGeneralSettingsForm } from "@/components/club/ClubGeneralSettingsForm";
import { ClubUniversityForm } from "@/components/club/ClubUniversityForm";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function ClubManageSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: clubData, error } = await supabase.from("clubs").select("name, name_ko, name_en, description, category, max_members, is_recruiting, is_university_based, university_id, instagram_url").eq("id", id).single();
  if (error || !clubData) notFound();

  const club = { ...clubData, name_ko: clubData.name_ko ?? null, name_en: clubData.name_en ?? null, is_university_based: clubData.is_university_based ?? false, university_id: clubData.university_id ?? null, instagram_url: clubData.instagram_url ?? null };
  const { data: ci } = await supabase.from("club_interests").select("interest_id").eq("club_id", id);
  const clubInterestIds = (ci ?? []).map((r) => r.interest_id);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4">
        <p className="mb-5 text-sm text-muted-foreground">
          동아리 정보와 모집 설정을 변경할 수 있습니다.
        </p>
        <Card className="border-0 shadow-sm">
          <CardContent className="space-y-5 p-4">
            <div className="space-y-2">
              <Label>동아리 이름</Label>
              <ClubNameForm clubId={id} initialNameKo={club.name_ko} initialNameEn={club.name_en} />
            </div>
            <div className="space-y-2">
              <Label>공식 인스타그램</Label>
              <ClubInstagramForm clubId={id} initialUrl={club.instagram_url} />
            </div>
            <div className="space-y-2">
              <ClubInterestEditor clubId={id} initialInterestIds={clubInterestIds} />
            </div>
            <div className="space-y-2">
              <Label>대학 기반 동아리</Label>
              <ClubUniversityForm clubId={id} initialIsUniversityBased={club.is_university_based} initialUniversityId={club.university_id} />
            </div>

            <hr className="border-border/60" />

            <ClubGeneralSettingsForm
              clubId={id}
              initialCategory={club.category}
              initialDescription={club.description ?? ""}
              initialMaxMembers={club.max_members}
              initialIsRecruiting={club.is_recruiting}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
