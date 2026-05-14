/**
 * 이메일 발송 유틸리티 (Resend API)
 *
 * 환경 변수:
 *   - RESEND_API_KEY: Resend API 키 (https://resend.com/api-keys)
 *   - INQUIRY_NOTIFY_EMAIL: 섭외 문의 알림 수신 이메일 (기본값: contact@grigoent.co.kr)
 *
 * 사용법:
 *   1. https://resend.com 에서 API 키 발급
 *   2. .env.local 에 RESEND_API_KEY=re_xxxx 추가
 *   3. 도메인 인증 완료 후 from 이메일 변경 가능
 */

import { Resend } from "resend";

// Resend 클라이언트 (lazy init)
let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — email sending disabled");
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/** 이메일 발송 결과 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 섭외 문의 알림 이메일 발송
 *
 * RESEND_API_KEY가 설정되지 않으면 조용히 성공 반환 (graceful degradation)
 */
export async function sendInquiryNotificationEmail(inquiry: {
  title: string;
  requester_name: string;
  requester_email: string;
  requester_phone?: string | null;
  requester_organization?: string | null;
  inquiry_type: string;
  target_type: string;
  event_date_start?: string | null;
  event_date_end?: string | null;
  budget_type?: string;
  budget_amount?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  message: string;
  region?: string | null;
}): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    // 키 없으면 에러 안 내고 통과 (개발/테스트 환경 고려)
    return { success: true };
  }

  const notifyEmail = process.env.INQUIRY_NOTIFY_EMAIL || "contact@grigoent.co.kr";

  // 문의 유형 라벨링
  const inquiryTypeLabels: Record<string, string> = {
    performance: "공연",
    broadcast: "방송",
    commercial: "광고",
    workshop: "워크숍",
    other: "기타",
  };
  const inquiryTypeLabel = inquiryTypeLabels[inquiry.inquiry_type] || inquiry.inquiry_type;

  // 예산 포맷
  let budgetText = "미정";
  if (inquiry.budget_type === "fixed" && inquiry.budget_amount != null) {
    budgetText = `${inquiry.budget_amount.toLocaleString()}원`;
  } else if (inquiry.budget_type === "range") {
    const min = inquiry.budget_min != null ? `${inquiry.budget_min.toLocaleString()}원` : "-";
    const max = inquiry.budget_max != null ? `${inquiry.budget_max.toLocaleString()}원` : "-";
    budgetText = `${min} ~ ${max}`;
  }

  // 일정 포맷
  let dateText = "미정";
  if (inquiry.event_date_start) {
    dateText = inquiry.event_date_start;
    if (inquiry.event_date_end && inquiry.event_date_end !== inquiry.event_date_start) {
      dateText += ` ~ ${inquiry.event_date_end}`;
    }
  }

  // 이메일 본문 (플레인 텍스트)
  const textBody = `
[원샷크루] 새로운 섭외 문의가 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

제목: ${inquiry.title}
문의 유형: ${inquiryTypeLabel}
대상: ${inquiry.target_type === "team" ? "팀 전체" : "개인 멤버"}

━━ 요청자 정보 ━━
이름: ${inquiry.requester_name}
이메일: ${inquiry.requester_email}
${inquiry.requester_phone ? `연락처: ${inquiry.requester_phone}` : ""}
${inquiry.requester_organization ? `소속: ${inquiry.requester_organization}` : ""}

━━ 행사 정보 ━━
일정: ${dateText}
${inquiry.region ? `지역: ${inquiry.region}` : ""}
예산: ${budgetText}

━━ 문의 내용 ━━
${inquiry.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

관리자 페이지에서 상세 내용을 확인하세요:
https://oneshotcrew.grigoent.co.kr/manage/inquiries

이 메일은 oneshotcrew.grigoent.co.kr 에서 자동 발송되었습니다.
`.trim();

  // HTML 버전
  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1a1a1a; color: #fff; padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 600; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
    .field { margin-bottom: 8px; }
    .field-label { font-weight: 500; color: #555; }
    .message-box { background: #fff; border: 1px solid #e0e0e0; padding: 16px; border-radius: 4px; white-space: pre-wrap; }
    .cta { text-align: center; margin-top: 24px; }
    .cta a { display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; font-size: 12px; color: #999; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>새로운 섭외 문의</h1>
    </div>
    <div class="content">
      <div class="section">
        <div class="field"><span class="field-label">제목:</span> ${escapeHtml(inquiry.title)}</div>
        <div class="field"><span class="field-label">문의 유형:</span> ${escapeHtml(inquiryTypeLabel)}</div>
        <div class="field"><span class="field-label">대상:</span> ${inquiry.target_type === "team" ? "팀 전체" : "개인 멤버"}</div>
      </div>

      <div class="section">
        <div class="section-title">요청자 정보</div>
        <div class="field"><span class="field-label">이름:</span> ${escapeHtml(inquiry.requester_name)}</div>
        <div class="field"><span class="field-label">이메일:</span> <a href="mailto:${escapeHtml(inquiry.requester_email)}">${escapeHtml(inquiry.requester_email)}</a></div>
        ${inquiry.requester_phone ? `<div class="field"><span class="field-label">연락처:</span> ${escapeHtml(inquiry.requester_phone)}</div>` : ""}
        ${inquiry.requester_organization ? `<div class="field"><span class="field-label">소속:</span> ${escapeHtml(inquiry.requester_organization)}</div>` : ""}
      </div>

      <div class="section">
        <div class="section-title">행사 정보</div>
        <div class="field"><span class="field-label">일정:</span> ${escapeHtml(dateText)}</div>
        ${inquiry.region ? `<div class="field"><span class="field-label">지역:</span> ${escapeHtml(inquiry.region)}</div>` : ""}
        <div class="field"><span class="field-label">예산:</span> ${escapeHtml(budgetText)}</div>
      </div>

      <div class="section">
        <div class="section-title">문의 내용</div>
        <div class="message-box">${escapeHtml(inquiry.message)}</div>
      </div>

      <div class="cta">
        <a href="https://oneshotcrew.grigoent.co.kr/manage/inquiries">관리자 페이지에서 확인</a>
      </div>
    </div>
    <div class="footer">
      이 메일은 oneshotcrew.grigoent.co.kr 에서 자동 발송되었습니다.
    </div>
  </div>
</body>
</html>
`.trim();

  try {
    const result = await resend.emails.send({
      // Resend 기본 도메인 사용 (도메인 인증 전)
      // 인증 후: from: "원샷크루 <noreply@grigoent.co.kr>"
      from: "원샷크루 <onboarding@resend.dev>",
      to: [notifyEmail],
      replyTo: inquiry.requester_email,
      subject: `[섭외 문의] ${inquiry.title} - ${inquiry.requester_name}`,
      text: textBody,
      html: htmlBody,
    });

    if (result.error) {
      console.error("[email] Resend error:", result.error);
      return { success: false, error: result.error.message };
    }

    console.log("[email] Inquiry notification sent:", result.data?.id);
    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Failed to send inquiry notification:", errorMessage);
    return { success: false, error: errorMessage };
  }
}

/** HTML 이스케이프 헬퍼 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
