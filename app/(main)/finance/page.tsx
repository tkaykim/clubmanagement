import { FinanceProjectsClient } from "@/components/finance/FinanceProjectsClient";

export const dynamic = "force-dynamic";

export default function FinancePage() {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>프로젝트 재무</h1>
          <div className="sub">권한이 있는 프로젝트의 예산, 수금, 정산 현황</div>
        </div>
      </div>
      <FinanceProjectsClient />
    </div>
  );
}
