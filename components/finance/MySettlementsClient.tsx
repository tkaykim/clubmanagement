"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, ReceiptText } from "lucide-react";
import type { FinanceMySettlementsResponse } from "@/lib/finance-types";
import { apiErrorMessage, formatDate, formatWon } from "./format";
import { FinanceEmpty, FinanceError, FinanceLoading } from "./FinanceStates";
import { FinanceStatus } from "./FinanceStatus";
import { FinanceSummaryCard } from "./FinanceSummaryCard";

type Filters = { year: string; month: string; projectId: string };

export function MySettlementsClient() {
  const [filters, setFilters] = useState<Filters>(() => ({ year: String(new Date().getFullYear()), month: "", projectId: "" }));
  const [data, setData] = useState<FinanceMySettlementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(() => { const params = new URLSearchParams(); if (filters.year) params.set("year", filters.year); if (filters.month) params.set("month", filters.month); if (filters.projectId.trim()) params.set("projectId", filters.projectId.trim()); return params.toString(); }, [filters]);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const response = await fetch(`/api/finance/my-settlements${query ? `?${query}` : ""}`, { credentials: "include", cache: "no-store" }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(apiErrorMessage(payload, "내 정산을 불러오지 못했습니다.")); setData(payload as FinanceMySettlementsResponse); } catch (cause) { setError(cause instanceof Error ? cause.message : "내 정산을 불러오지 못했습니다."); } finally { setLoading(false); } }, [query]);
  useEffect(() => { void load(); }, [load]);
  if (loading && !data) return <FinanceLoading label="내 정산을 불러오는 중입니다" />;
  if (error && !data) return <FinanceError message={error} onRetry={() => void load()} />;
  if (!data) return null;
  const currencyTotals = Object.entries(data.totals.totalsByCurrency);
  return <div className="finance-stack">
    {error && <div className="banner soft">{error}</div>}
    <section className="os-grid grid-3" aria-label="내 정산 합계">
      <FinanceSummaryCard label="확정 대기" value={null} displayValue={`${data.totals.pendingConfirmationCount.toLocaleString("ko-KR")}건`} icon={Filter} caption="공개 전 배분안" />
      {currencyTotals.length === 0 ? <><FinanceSummaryCard label="확정 미지급" value={null} displayValue="0" icon={ReceiptText} tone="ok" /><FinanceSummaryCard label="실제 수령" value={null} displayValue="0" icon={Download} tone="ok" /></> : currencyTotals.flatMap(([currency, totals]) => [
        <FinanceSummaryCard key={`${currency}-unpaid`} label={`확정 미지급 · ${currency}`} value={totals.confirmedUnpaidAmount} currency={currency} icon={ReceiptText} tone={totals.confirmedUnpaidAmount > 0 ? "warn" : "ok"} />,
        <FinanceSummaryCard key={`${currency}-received`} label={`실제 수령 · ${currency}`} value={totals.receivedAmount} currency={currency} icon={Download} tone="ok" />,
      ])}
    </section>
    <section className="card finance-filters finance-my-filters" aria-label="내 정산 필터"><label><span>연도</span><select className="select" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}><option value="">전체</option>{Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - index)).map((year) => <option key={year} value={year}>{year}년</option>)}</select></label><label><span>월</span><input className="input" type="month" value={filters.month} onChange={(e) => setFilters({ ...filters, month: e.target.value })} /></label><label><span>프로젝트 ID</span><input className="input" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })} placeholder="필요한 경우만 입력" /></label><button className="btn sm" type="button" onClick={() => window.location.assign(`/api/finance/my-settlements/csv${query ? `?${query}` : ""}`)}><Download size={13} /> 내역 다운로드</button></section>
    {data.data.length === 0 ? <FinanceEmpty title="선택한 기간의 확정 정산이 없습니다" description="확정 전 배분안은 금액 없이 확정 대기 건수로만 표시됩니다." /> : <section className="finance-settlement-projects">{data.data.map((settlement) => <article className="card finance-settlement-card" key={settlement.allowanceBatchId}><div className="card-head"><div><h2>{settlement.projectTitle}</h2><span className="hint">행사일 {formatDate(settlement.eventDate)} · 확정 {formatDate(settlement.confirmedAt)}</span></div></div><div className="tbl-scroll"><table className="tbl"><thead><tr><th>수당 항목</th><th>사유</th><th>세전액</th><th>공제액</th><th>지급 예정액</th><th>지급 누계</th><th>남은 금액</th><th>예정일</th><th>상태</th></tr></thead><tbody>{settlement.items.map((item) => <tr key={item.id}><td>{item.category}</td><td>{item.reason || "—"}</td><td className="num">{formatWon(item.grossAmount, false, settlement.currency)}</td><td className="num">{formatWon(item.deductionAmount, false, settlement.currency)}</td><td className="num">{formatWon(item.netAmount, false, settlement.currency)}</td><td className="num">{formatWon(item.paidAmount, false, settlement.currency)}</td><td className="num">{formatWon(item.outstandingAmount, false, settlement.currency)}</td><td>{formatDate(item.scheduledPaymentDate)}</td><td><FinanceStatus status={item.paymentStatus} /></td></tr>)}</tbody></table></div></article>)}</section>}
  </div>;
}
