import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { AnnouncementWithAuthor } from "@/lib/types";

export type AnnouncementFilter = {
  pinned?: boolean;
  scope?: "team" | "project";
  project_id?: string;
};

/**
 * 공지 목록 조회 (작성자 정보 포함)
 */
export async function getTeamAnnouncements(
  filter: AnnouncementFilter = {}
): Promise<AnnouncementWithAuthor[]> {
  const supabase = createServerSupabaseClient();
  let query = supabase
    .from("announcements")
    .select(`*, author:users(id, name)`)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (filter.pinned !== undefined) {
    query = query.eq("pinned", filter.pinned);
  }
  if (filter.scope) {
    query = query.eq("scope", filter.scope);
  }
  if (filter.project_id) {
    query = query.eq("project_id", filter.project_id);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as AnnouncementWithAuthor[];
}
