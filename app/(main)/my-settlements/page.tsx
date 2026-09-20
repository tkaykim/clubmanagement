import { MySettlementsClient } from "@/components/finance/MySettlementsClient";

export const dynamic = "force-dynamic";

export default function MySettlementsPage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>내 정산</h1>
          <div className="sub">확정된 개인 정산과 실제 지급 내역</div>
        </div>
      </div>
      <MySettlementsClient />
    </div>
  );
}
