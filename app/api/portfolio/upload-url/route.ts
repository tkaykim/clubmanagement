import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceSupabaseClient } from "@/lib/supabase-server";
import { requireAdmin, isNextResponse } from "@/lib/auth";
import { randomUUID } from "crypto";

const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

const uploadUrlBodySchema = z.object({
  kind: z.enum(["hero", "photos", "thumbnails", "members"]),
  ext: z.string().min(1).max(10),
});

/**
 * POST /api/portfolio/upload-url — Signed Upload URL 발급 (admin)
 */
export async function POST(request: Request) {
  try {
    const adminOrResponse = await requireAdmin();
    if (isNextResponse(adminOrResponse)) return adminOrResponse;

    const body = await request.json();
    const parsed = uploadUrlBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "입력 값을 확인해주세요", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { kind, ext } = parsed.data;
    const normalizedExt = ext.toLowerCase().replace(/^\./, "");

    if (!ALLOWED_EXTS.includes(normalizedExt)) {
      return NextResponse.json(
        { error: "허용되지 않는 파일 형식입니다" },
        { status: 400 }
      );
    }

    // createSignedUploadUrl은 service_role이 있어야 발급 가능 — 의도적으로 service_role 사용.
    // requireAdmin() 검증이 반드시 선행되어야 하며, 이 클라이언트를 다른 용도로 재사용 금지.
    const supabase = createServiceSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "스토리지 서비스를 사용할 수 없습니다" },
        { status: 503 }
      );
    }

    const uuid = randomUUID();
    const path = `portfolio/${kind}/${uuid}.${normalizedExt}`;

    const { data, error } = await supabase.storage
      .from("portfolio")
      .createSignedUploadUrl(path, { upsert: false });

    if (error || !data) {
      return NextResponse.json({ error: "업로드 URL 생성에 실패했습니다" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from("portfolio")
      .getPublicUrl(path);

    return NextResponse.json({
      data: {
        signedUrl: data.signedUrl,
        path,
        publicUrl: publicUrlData.publicUrl,
      },
    });
  } catch (err) {
    console.error("[POST /api/portfolio/upload-url] error:", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다" }, { status: 500 });
  }
}
