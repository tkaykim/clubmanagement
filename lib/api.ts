import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * URL 파라미터 id가 UUID 형식인지 검증한다.
 * 유효하면 null 반환, 유효하지 않으면 400 NextResponse 반환.
 */
export function validateUuidParam(id: string): NextResponse | null {
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  return null;
}
