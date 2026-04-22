import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("crew_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || (member.role !== "admin" && member.role !== "owner")) {
    redirect("/");
  }

  return <>{children}</>;
}
