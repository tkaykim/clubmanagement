import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { NewClubForm } from "./NewClubForm";

export const dynamic = "force-dynamic";

type CategoryMajor = { id: string; name: string };

export default async function NewClubPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) redirect("/login");

  let categories: CategoryMajor[] = [];
  if (supabase) {
    const { data } = await supabase.from("category_major").select("id, name").order("sort_order");
    categories = (data ?? []) as CategoryMajor[];
  }

  return (
    <div className="flex flex-col">
      <MobileHeader title="동아리 만들기" backHref="/clubs" />
      <div className="flex-1 px-4 py-4">
        <NewClubForm categories={categories} />
      </div>
    </div>
  );
}
