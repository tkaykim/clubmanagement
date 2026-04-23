import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { portfolioInquiryAdminUpdateSchema } from "@/lib/validators";
import { validateUuidParam } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/portfolio/inquiries/[id] — 문의 상태·메모 업데이트 (admin)
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const uuidError = validateUuidParam(id);
    if (uuidError) return uuidError;

    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = portfolioInquiryAdminUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const supabase = createRouteSupabaseClient();

    const { data: existing } = await supabase
      .from("portfolio_inquiries")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("portfolio_inquiries")
      .update(parsed.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "문의 수정에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[PATCH /api/portfolio/inquiries/[id]] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * DELETE /api/portfolio/inquiries/[id] — 문의 삭제 (admin)
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const uuidError = validateUuidParam(id);
    if (uuidError) return uuidError;

    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const supabase = createRouteSupabaseClient();

    const { data: existing } = await supabase
      .from("portfolio_inquiries")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "문의를 찾을 수 없습니다" }, { status: 404 });
    }

    const { error } = await supabase.from("portfolio_inquiries").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "문의 삭제에 실패했습니다" }, { status: 500 });
    }

    return NextResponse.json({ data: { id } });
  } catch (err) {
    console.error("[DELETE /api/portfolio/inquiries/[id]] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
