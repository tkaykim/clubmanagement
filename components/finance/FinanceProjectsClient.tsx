"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarDays,
  ChevronRight,
  HandCoins,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import type { FinanceProjectsResponse } from "@/lib/finance-types";
import { apiErrorMessage, formatDate, formatWon } from "./format";
import { FinanceError, FinanceLoading, FinanceEmpty } from "./FinanceStates";
import { FinanceStatus } from "./FinanceStatus";
import { FinanceSummaryCard } from "./FinanceSummaryCard";

type FilterState = {
  q: string;
  month: string;
  managerUserId: string;
  participantUserId: string;
  receiptStatus: string;
  paymentStatus: string;
};

const EMPTY_FILTERS: FilterState = {
  q: "",
  month: "",
  managerUserId: "",
  participantUserId: "",
  receiptStatus: "",
  paymentStatus: "",
};

function initialFilters(searchParams: URLSearchParams): FilterState {
  return {
    q: searchParams.get("q") ?? "",
    month: searchParams.get("month") ?? "",
    managerUserId: searchParams.get("managerUserId") ?? "",
    participantUserId: searchParams.get("participantUserId") ?? "",
    receiptStatus: searchParams.get("receiptStatus") ?? "",
    paymentStatus: searchParams.get("paymentStatus") ?? "",
  };
}

export function FinanceProjectsClient() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => initialFilters(searchParams));
  const [data, setData] = useState<FinanceProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/projects${query ? `?${query}` : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, "프로젝트 재무를 불러오지 못했습니다."));
      setData(payload as FinanceProjectsResponse);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로젝트 재무를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => window.clearTimeout(timer);
  }, [load]);

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (loading && !data) return <FinanceLoading />;
  if (error && !data) return <FinanceError message={error} onRetry={() => void load()} />;
  if (!data) return null;

  const managers = Array.from(
    new Map(data.data.flatMap((project) => project.managers).map((manager) => [manager.userId, manager])).values()
  ).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const visibleProjects = data.data.filter((project) => {
    const keyword = filters.q.trim().toLocaleLowerCase("ko");
    if (!keyword) return true;
    return project.title.toLocaleLowerCase("ko").includes(keyword) || project.clientName?.toLocaleLowerCase("ko").includes(keyword);
  });
  const totals = visibleProjects.reduce(
    (sum, project) => ({
      budgetAmount: project.budgetAmount == null || sum.budgetAmount == null ? null : sum.budgetAmount + project.budgetAmount,
      receivableAmount: project.receivableAmount == null || sum.receivableAmount == null ? null : sum.receivableAmount + project.receivableAmount,
      confirmedGrossAmount: sum.confirmedGrossAmount + project.confirmedGrossAmount,
      unpaidAmount: sum.unpaidAmount + project.unpaidAmount,
    }),
    { budgetAmount: 0 as number | null, receivableAmount: 0 as number | null, confirmedGrossAmount: 0, unpaidAmount: 0 }
  );
  const attention = visibleProjects.filter((project) => project.needsAttention);
  const currencies = Array.from(new Set(visibleProjects.map((project) => project.currency)));
  const aggregateCurrency = currencies.length === 1 ? currencies[0] : undefined;

  return (
    <div className="finance-stack">
      {error && <div className="banner soft"><AlertTriangle size={16} />{error}</div>}

      <section className="os-grid grid-4" aria-label="재무 합계">
        <FinanceSummaryCard label="총예산" value={aggregateCurrency ? totals.budgetAmount : null} displayValue={aggregateCurrency ? undefined : "통화별 상세"} currency={aggregateCurrency} icon={WalletCards} caption="조회 범위 집행 한도" />
        <FinanceSummaryCard label="고객 미수금" value={aggregateCurrency ? totals.receivableAmount : null} displayValue={aggregateCurrency ? undefined : "통화별 상세"} currency={aggregateCurrency} icon={BanknoteArrowDown} tone={totals.receivableAmount ? "warn" : "ok"} />
        <FinanceSummaryCard label="세전 수당" value={aggregateCurrency ? totals.confirmedGrossAmount : null} displayValue={aggregateCurrency ? undefined : "통화별 상세"} currency={aggregateCurrency} icon={HandCoins} caption="공제 전 인건비" />
        <FinanceSummaryCard label="미지급액" value={aggregateCurrency ? totals.unpaidAmount : null} displayValue={aggregateCurrency ? undefined : "통화별 상세"} currency={aggregateCurrency} icon={BanknoteArrowUp} tone={totals.unpaidAmount ? "warn" : "ok"} />
      </section>

      <section className="card finance-filters" aria-label="프로젝트 재무 필터">
        <div className="finance-search">
          <Search size={15} aria-hidden />
          <input className="input" value={filters.q} onChange={(event) => update("q", event.target.value)} placeholder="프로젝트·거래처 검색" aria-label="프로젝트 또는 거래처 검색" />
        </div>
        <input className="input" type="month" value={filters.month} onChange={(event) => update("month", event.target.value)} aria-label="조회 월" />
        <select className="select" value={filters.managerUserId} onChange={(event) => update("managerUserId", event.target.value)} aria-label="담당자">
          <option value="">담당자 전체</option>
          {managers.map((manager) => <option key={manager.userId} value={manager.userId}>{manager.name}</option>)}
        </select>
        <select className="select" value={filters.receiptStatus} onChange={(event) => update("receiptStatus", event.target.value)} aria-label="수금 상태">
          <option value="">수금 전체</option>
          <option value="unpaid">미수 있음</option>
          <option value="paid">수금 완료</option>
        </select>
        <select className="select" value={filters.paymentStatus} onChange={(event) => update("paymentStatus", event.target.value)} aria-label="지급 상태">
          <option value="">지급 전체</option>
          <option value="not_paid">미지급</option>
          <option value="partially_paid">일부 지급</option>
          <option value="paid">지급 완료</option>
        </select>
        <div className="finance-filter-actions">
          <button className="btn sm" type="button" onClick={() => setFilters(EMPTY_FILTERS)}><RotateCcw size={13} /> 초기화</button>
        </div>
      </section>

      {attention.length > 0 && (
        <section className="card finance-attention">
          <div className="card-head finance-card-head"><h2><AlertTriangle size={15} /> 확인이 필요한 항목</h2><span className="badge danger">{attention.length}건</span></div>
          <div className="finance-attention-list">
            {attention.slice(0, 5).map((project) => (
              <Link key={project.projectId} href={`/finance/${project.projectId}`}>
                <strong>{project.title}</strong>
                <span>금액·예정일·증빙 중 확인이 필요한 항목이 있습니다.</span>
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {visibleProjects.length === 0 ? (
        <FinanceEmpty title="표시할 프로젝트가 없습니다" description="담당자로 배정된 프로젝트가 없거나 현재 필터 조건에 맞는 프로젝트가 없습니다." />
      ) : (
        <>
        <section className="card finance-project-cards mob-only">
          <div className="card-head finance-card-head"><h2>프로젝트 재무</h2><span className="hint">{visibleProjects.length.toLocaleString("ko-KR")}건</span></div>
          {visibleProjects.map((project) => (
            <Link key={project.projectId} href={`/finance/${project.projectId}`} className="finance-project-card">
              <div className="finance-project-card-head"><div><strong>{project.title}</strong><small>{project.clientName ?? "거래처 미입력"} · {formatDate(project.eventDate)}</small></div><FinanceStatus status={project.allowanceStatus ?? (project.needsAttention ? "setup_required" : "draft")} /></div>
              <div className="finance-project-card-grid"><span>총예산 <b>{formatWon(project.budgetAmount, false, project.currency)}</b></span><span>미수금 <b>{formatWon(project.receivableAmount, false, project.currency)}</b></span><span>세전 수당 <b>{formatWon(project.confirmedGrossAmount, false, project.currency)}</b></span><span>미지급 <b>{formatWon(project.unpaidAmount, false, project.currency)}</b></span></div>
              <div className="finance-project-card-foot">담당 {project.managers.length ? project.managers.map((manager) => manager.name).join(", ") : "미배정"}<ChevronRight size={15} /></div>
            </Link>
          ))}
        </section>
        <section className="card flush tbl-scroll finance-project-table pc-only">
          <div className="card-head finance-card-head">
            <h2>프로젝트 재무</h2>
            <span className="hint">{visibleProjects.length.toLocaleString("ko-KR")}건</span>
          </div>
          <table className="tbl">
            <thead><tr><th>프로젝트</th><th>행사일</th><th>담당자</th><th>총예산</th><th>청구 / 수금</th><th>세전 수당</th><th>지급 / 미지급</th><th>상태</th><th aria-label="상세" /></tr></thead>
            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.projectId}>
                  <td><Link className="finance-project-link" href={`/finance/${project.projectId}`}><strong>{project.title}</strong><small>{project.clientName ?? "거래처 미입력"}</small></Link></td>
                  <td><span className="finance-date"><CalendarDays size={13} />{formatDate(project.eventDate)}</span></td>
                  <td>{project.managers.length ? project.managers.map((manager) => manager.name).join(", ") : <span className="finance-missing">미배정</span>}</td>
                  <td className="num">{formatWon(project.budgetAmount, false, project.currency)}</td>
                  <td className="num"><strong>{formatWon(project.contractTotalAmount, false, project.currency)}</strong><small>{formatWon(project.receiptExecutedAmount, false, project.currency)} 수금</small></td>
                  <td className="num">{formatWon(project.confirmedGrossAmount, false, project.currency)}</td>
                  <td className="num"><strong>{formatWon(project.paymentExecutedAmount, false, project.currency)}</strong><small>{formatWon(project.unpaidAmount, false, project.currency)} 남음</small></td>
                  <td><FinanceStatus status={project.allowanceStatus ?? (project.needsAttention ? "setup_required" : "draft")} /></td>
                  <td><Link href={`/finance/${project.projectId}`} className="btn icon-only sm" aria-label={`${project.title} 상세`}><ChevronRight size={14} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        </>
      )}
    </div>
  );
}
