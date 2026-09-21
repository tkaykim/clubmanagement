"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  HandCoins,
  LoaderCircle,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";
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
  eventStatus: string;
};

type FinanceManagerOption = FinanceProjectsResponse["data"][number]["managers"][number];

const EMPTY_FILTERS: FilterState = {
  q: "",
  month: "",
  managerUserId: "",
  participantUserId: "",
  receiptStatus: "",
  paymentStatus: "",
  eventStatus: "active",
};

const MAX_PROJECT_PAGES = 100;

function initialFilters(searchParams: URLSearchParams): FilterState {
  return {
    q: searchParams.get("q") ?? "",
    month: searchParams.get("month") ?? "",
    managerUserId: searchParams.get("managerUserId") ?? "",
    participantUserId: searchParams.get("participantUserId") ?? "",
    receiptStatus: searchParams.get("receiptStatus") ?? "",
    paymentStatus: searchParams.get("paymentStatus") ?? "",
    eventStatus: searchParams.get("eventStatus") ?? "active",
  };
}

export function FinanceProjectsClient() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => initialFilters(searchParams));
  const [data, setData] = useState<FinanceProjectsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedServerQuery, setLoadedServerQuery] = useState<string | null>(null);
  const [managerOptions, setManagerOptions] = useState<FinanceManagerOption[]>([]);
  const activeRequestRef = useRef<AbortController | null>(null);

  const serverQuery = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (key !== "q" && value) params.set(key, value);
    }
    return params.toString();
  }, [filters]);

  const load = useCallback(async () => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const rows = new Map<string, FinanceProjectsResponse["data"][number]>();
      let cursor: string | null = null;
      let access: FinanceProjectsResponse["access"] | null = null;

      for (let page = 0; page < MAX_PROJECT_PAGES; page += 1) {
        const params = new URLSearchParams(serverQuery);
        params.set("limit", "100");
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/finance/projects?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null) as FinanceProjectsResponse | null;
        if (!response.ok || !payload) {
          throw new Error(apiErrorMessage(payload, "프로젝트 재무를 불러오지 못했습니다."));
        }
        access ??= payload.access;
        for (const project of payload.data) rows.set(project.projectId, project);
        if (!payload.nextCursor) {
          if (!controller.signal.aborted) {
            const projects = Array.from(rows.values());
            setManagerOptions((current) => Array.from(
              new Map([...current, ...projects.flatMap((project) => project.managers)].map((manager) => [manager.userId, manager])).values()
            ).sort((a, b) => a.name.localeCompare(b.name, "ko")));
            setData({ data: projects, access: access ?? payload.access, nextCursor: null });
            setLoadedServerQuery(serverQuery);
          }
          return;
        }
        if (payload.nextCursor === cursor) {
          throw new Error("프로젝트 목록의 다음 페이지를 확인하지 못했습니다. 다시 시도해 주세요.");
        }
        cursor = payload.nextCursor;
      }
      throw new Error("프로젝트가 너무 많아 합계를 안전하게 계산하지 못했습니다. 조건을 좁혀 다시 조회해 주세요.");
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "프로젝트 재무를 불러오지 못했습니다.");
        setLoadedServerQuery(serverQuery);
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [serverQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 180);
    return () => {
      window.clearTimeout(timer);
      activeRequestRef.current?.abort();
    };
  }, [load]);

  function update<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (loadedServerQuery !== serverQuery) return <FinanceLoading label="필터를 적용하는 중입니다" />;
  if (loading && !data) return <FinanceLoading />;
  if (error && !data) return <FinanceError message={error} onRetry={() => void load()} />;
  if (!data) return null;

  const managers = managerOptions;
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
  const attention = visibleProjects.filter((project) => project.needsAttention && project.projectStatus !== "cancelled");
  const currencies = Array.from(new Set(visibleProjects.map((project) => project.currency)));
  const aggregateCurrency = currencies.length === 1 ? currencies[0] : undefined;
  const aggregateDisplayValue = visibleProjects.length === 0 ? "—" : aggregateCurrency ? undefined : "통화별 상세";
  const selectedManager = managers.find((manager) => manager.userId === filters.managerUserId)?.name;
  const filterScope = [
    filters.eventStatus === "cancelled" ? "취소 행사만" : filters.eventStatus === "all" ? "전체(취소 포함)" : "취소 제외",
    filters.month || "전체 기간",
    selectedManager ? `담당 ${selectedManager}` : "담당자 전체",
    filters.receiptStatus === "unpaid" ? "미수 있음" : filters.receiptStatus === "paid" ? "수금 완료" : "수금 상태 전체",
    filters.paymentStatus === "not_paid" ? "미지급" : filters.paymentStatus === "partially_paid" ? "일부 지급" : filters.paymentStatus === "paid" ? "지급 완료" : "지급 상태 전체",
  ];

  return (
    <div className="finance-stack">
      {error && <div className="banner soft"><AlertTriangle size={16} />{error}</div>}

      <section className="os-grid grid-4" aria-label="재무 합계">
        <FinanceSummaryCard label="총예산" value={aggregateCurrency ? totals.budgetAmount : null} displayValue={aggregateDisplayValue} currency={aggregateCurrency} icon={WalletCards} caption="조회 범위 집행 한도" />
        <FinanceSummaryCard label="고객 미수금" value={aggregateCurrency ? totals.receivableAmount : null} displayValue={aggregateDisplayValue} currency={aggregateCurrency} icon={BanknoteArrowDown} tone={totals.receivableAmount ? "warn" : "ok"} />
        <FinanceSummaryCard label="세전 수당" value={aggregateCurrency ? totals.confirmedGrossAmount : null} displayValue={aggregateDisplayValue} currency={aggregateCurrency} icon={HandCoins} caption="공제 전 인건비" />
        <FinanceSummaryCard label="미지급액" value={aggregateCurrency ? totals.unpaidAmount : null} displayValue={aggregateDisplayValue} currency={aggregateCurrency} icon={BanknoteArrowUp} tone={totals.unpaidAmount ? "warn" : "ok"} />
      </section>

      <div className="finance-summary-scope" aria-live="polite">
        <span><strong>{visibleProjects.length.toLocaleString("ko-KR")}건</strong>의 합계</span>
        <span>{filterScope.join(" · ")}{filters.q.trim() ? ` · “${filters.q.trim()}” 검색` : ""}</span>
        {loading && <span className="finance-inline-loading"><LoaderCircle className="animate-spin" size={13} /> 필터 적용 중</span>}
      </div>

      <section className="card finance-filters" aria-label="프로젝트 재무 필터">
        <label className="finance-filter finance-search-filter"><span>검색</span><div className="finance-search"><Search size={15} aria-hidden /><input className="input" value={filters.q} onChange={(event) => update("q", event.target.value)} placeholder="프로젝트·거래처" /></div></label>
        <label className="finance-filter"><span>조회 월</span><input className="input" type="month" value={filters.month} onChange={(event) => update("month", event.target.value)} /></label>
        <label className="finance-filter"><span>담당자</span><select className="select" value={filters.managerUserId} onChange={(event) => update("managerUserId", event.target.value)}><option value="">전체</option>{managers.map((manager) => <option key={manager.userId} value={manager.userId}>{manager.name}</option>)}</select></label>
        <label className="finance-filter"><span>수금 상태</span><select className="select" value={filters.receiptStatus} onChange={(event) => update("receiptStatus", event.target.value)}><option value="">전체</option><option value="unpaid">미수 있음</option><option value="paid">수금 완료</option></select></label>
        <label className="finance-filter"><span>지급 상태</span><select className="select" value={filters.paymentStatus} onChange={(event) => update("paymentStatus", event.target.value)}><option value="">전체</option><option value="not_paid">미지급</option><option value="partially_paid">일부 지급</option><option value="paid">지급 완료</option></select></label>
        <label className="finance-filter"><span>행사 상태</span><select className="select" value={filters.eventStatus} onChange={(event) => update("eventStatus", event.target.value)}><option value="active">취소 제외</option><option value="cancelled">취소 행사만</option><option value="all">전체(취소 포함)</option></select></label>
        <div className="finance-filter-actions">
          <button className="btn sm" type="button" onClick={() => setFilters(EMPTY_FILTERS)}><RotateCcw size={13} /> 초기화</button>
        </div>
      </section>

      {attention.length > 0 && (
        <details className="card finance-attention">
          <summary><span className="finance-attention-title"><AlertTriangle size={15} /><strong>확인 필요한 항목</strong><small>예산·계약금액·담당자·수당을 확인해 주세요.</small></span><span className="badge danger">{attention.length}건</span><ChevronDown className="finance-attention-chevron" size={15} /></summary>
          <div className="finance-attention-list">
            {attention.slice(0, 5).map((project) => (
              <Link key={project.projectId} href={`/finance/${project.projectId}`}>
                <strong>{project.title}</strong>
                <span>금액·예정일·증빙 중 확인이 필요한 항목이 있습니다.</span>
                <ChevronRight size={14} />
              </Link>
            ))}
          </div>
        </details>
      )}

      {visibleProjects.length === 0 ? (
        <FinanceEmpty title="표시할 프로젝트가 없습니다" description="담당자로 배정된 프로젝트가 없거나 현재 필터 조건에 맞는 프로젝트가 없습니다." />
      ) : (
        <>
        <section className="card finance-project-cards finance-mobile-only">
          <div className="card-head finance-card-head"><h2>프로젝트 재무</h2><span className="hint">{visibleProjects.length.toLocaleString("ko-KR")}건</span></div>
          {visibleProjects.map((project) => (
            <Link key={project.projectId} href={`/finance/${project.projectId}`} className="finance-project-card">
              <div className="finance-project-card-head"><div><span className="finance-project-title"><strong>{project.title}</strong>{project.projectStatus === "cancelled" && <span className="badge danger">취소</span>}</span><small>{project.clientName ?? "거래처 미입력"} · {formatDate(project.eventDate)}</small></div><FinanceStatus status={project.allowanceStatus ?? (project.needsAttention ? "setup_required" : "draft")} /></div>
              <div className="finance-project-card-grid"><span>총예산 <b>{formatWon(project.budgetAmount, false, project.currency)}</b></span><span>미수금 <b>{formatWon(project.receivableAmount, false, project.currency)}</b></span><span>세전 수당 <b>{formatWon(project.confirmedGrossAmount, false, project.currency)}</b></span><span>미지급 <b>{formatWon(project.unpaidAmount, false, project.currency)}</b></span></div>
              <div className="finance-project-card-foot">담당 {project.managers.length ? project.managers.map((manager) => manager.name).join(", ") : "미배정"}<ChevronRight size={15} /></div>
            </Link>
          ))}
        </section>
        <section className="card flush finance-project-table finance-desktop-only">
          <div className="card-head finance-card-head">
            <h2>프로젝트 재무</h2>
            <span className="hint">{visibleProjects.length.toLocaleString("ko-KR")}건</span>
          </div>
          <div className="finance-table-scroll" role="region" aria-label="프로젝트 재무 표" tabIndex={0}><table className="tbl">
            <thead><tr><th>프로젝트</th><th>행사일</th><th>담당자</th><th>총예산</th><th>청구 / 수금</th><th>세전 수당</th><th>지급 / 미지급</th><th>상태</th><th aria-label="상세" /></tr></thead>
            <tbody>
              {visibleProjects.map((project) => (
                <tr key={project.projectId}>
                  <td><Link className="finance-project-link" href={`/finance/${project.projectId}`}><span className="finance-project-title"><strong>{project.title}</strong>{project.projectStatus === "cancelled" && <span className="badge danger">취소</span>}</span><small>{project.clientName ?? "거래처 미입력"}</small></Link></td>
                  <td><span className="finance-date"><CalendarDays size={13} />{formatDate(project.eventDate)}</span></td>
                  <td>{project.managers.length ? project.managers.map((manager) => manager.name).join(", ") : <span className="finance-missing">미배정</span>}</td>
                  <td className="num">{formatWon(project.budgetAmount, false, project.currency)}</td>
                  <td className="num"><span className="finance-amount-stack"><strong>청구 {formatWon(project.contractTotalAmount, false, project.currency)}</strong><small>수금 {formatWon(project.receiptExecutedAmount, false, project.currency)}</small></span></td>
                  <td className="num">{formatWon(project.confirmedGrossAmount, false, project.currency)}</td>
                  <td className="num"><span className="finance-amount-stack"><strong>지급 {formatWon(project.paymentExecutedAmount, false, project.currency)}</strong><small>미지급 {formatWon(project.unpaidAmount, false, project.currency)}</small></span></td>
                  <td><FinanceStatus status={project.allowanceStatus ?? (project.needsAttention ? "setup_required" : "draft")} /></td>
                  <td><Link href={`/finance/${project.projectId}`} className="btn icon-only sm" aria-label={`${project.title} 상세`}><ChevronRight size={14} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>
        </>
      )}
    </div>
  );
}
