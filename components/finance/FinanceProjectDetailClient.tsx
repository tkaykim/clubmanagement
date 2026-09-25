"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Download, FileCheck2, FileText, Loader2, Plus, ReceiptText, Save, Send, UsersRound, WalletCards } from "lucide-react";
import { toast } from "sonner";
import type { FinanceAllowanceDraftItemInput, FinanceAllowanceItem, FinanceBudgetInput, FinanceManagersInput, FinancePaymentInput, FinanceProjectDetail, FinanceReceiptInput } from "@/lib/finance-types";
import { apiErrorMessage, formatDate, formatWon } from "./format";
import { FinanceEmpty, FinanceError, FinanceLoading } from "./FinanceStates";
import { FinanceStatus } from "./FinanceStatus";
import { FinanceSummaryCard } from "./FinanceSummaryCard";
import { SearchableMemberDropdown } from "./SearchableMemberDropdown";
import { paperworkHandoffUrl } from "@/lib/paperwork-link";

type FinanceMemberCandidate = { crewMemberId: string; userId: string; name: string };
type FinanceMutation = (path: string, method: "POST" | "PUT", body: unknown, success: string) => Promise<FinanceProjectDetail>;

function useFinanceMemberCandidates(enabled: boolean) {
  const [candidates, setCandidates] = useState<FinanceMemberCandidate[]>([]);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    void (async () => {
      const response = await fetch("/api/finance/members", { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) { setUnavailable(true); return; }
      setCandidates((payload as { data?: FinanceMemberCandidate[] }).data ?? []);
    })();
  }, [enabled]);
  return { candidates, unavailable };
}

type Tab = "overview" | "allowances" | "transactions" | "audit";

const EMPTY_DRAFT: FinanceAllowanceDraftItemInput = {
  recipientUserId: "", category: "", reason: "", requestedAmountRaw: null, grossAmount: null, taxType: "undecided", scheduledPaymentDate: null, evidenceRef: null,
};

function numeric(value: string): number | null {
  const parsed = Number(value.replaceAll(",", "").trim());
  return value.trim() === "" || !Number.isFinite(parsed) ? null : parsed;
}

function draftFromItem(item: FinanceAllowanceItem): FinanceAllowanceDraftItemInput {
  return {
    id: item.id, recipientUserId: item.recipientUserId, category: item.category, reason: item.reason,
    requestedAmountRaw: item.requestedAmountRaw, grossAmount: item.grossAmount, taxType: item.taxType,
    scheduledPaymentDate: item.scheduledPaymentDate, evidenceRef: item.evidenceRef ?? null,
  };
}

function dateAtKst(value: string): string | null {
  return value ? `${value}T00:00:00+09:00` : null;
}

function revisionDrafts(items: FinanceAllowanceItem[]): FinanceAllowanceDraftItemInput[] {
  return items.map((item) => {
    const { id: _id, ...draft } = draftFromItem(item);
    return draft;
  });
}

export function FinanceProjectDetailClient({ projectId }: { projectId: string }) {
  const [detail, setDetail] = useState<FinanceProjectDetail | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const candidates = useFinanceMemberCandidates(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/finance/projects/${encodeURIComponent(projectId)}`, { cache: "no-store", credentials: "include" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiErrorMessage(payload, "프로젝트 재무를 불러오지 못했습니다."));
      setDetail((payload as { data: FinanceProjectDetail }).data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로젝트 재무를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { void load(); }, [load]);

  const applyMutation = useCallback(async (path: string, method: "POST" | "PUT", body: unknown, success: string) => {
    const response = await fetch(`/api/finance/projects/${encodeURIComponent(projectId)}${path}`, {
      method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = apiErrorMessage(payload, "저장하지 못했습니다.");
      if ((payload as { code?: string } | null)?.code === "VERSION_CONFLICT") {
        await load();
        throw new Error(`${message} 최신 내용을 불러왔습니다.`);
      }
      throw new Error(message);
    }
    const nextDetail = (payload as { data: FinanceProjectDetail }).data;
    setDetail(nextDetail);
    toast.success(success);
    return nextDetail;
  }, [load, projectId]);

  if (loading && !detail) return <div className="page"><FinanceLoading /></div>;
  if (error && !detail) return <div className="page"><FinanceError message={error} onRetry={() => void load()} /></div>;
  if (!detail) return null;

  const isGlobal = detail.access === "global";
  const allocationTotal = detail.allowances.reduce((sum, item) => sum + (item.grossAmount ?? 0), 0);
  const remainingBudget = detail.budgetAmount == null ? null : detail.budgetAmount - allocationTotal;

  return (
    <div className="page finance-detail-page">
      <div className="page-head finance-detail-head">
        <div>
          <Link href="/finance" className="finance-back"><ArrowLeft size={14} /> 프로젝트 재무</Link>
          <h1>{detail.title}</h1>
          <div className="sub">{formatDate(detail.eventDate)} · {detail.clientName ?? "거래처 미입력"}</div>
        </div>
        <div className="row gap-8" style={{ flexWrap: "wrap" }}>
          <FinanceStatus status={detail.allowanceStatus ?? "draft"} />
          <button className="btn sm" type="button" onClick={() => window.location.assign(`/api/finance/projects/${encodeURIComponent(projectId)}/csv`)}><Download size={13} /> CSV</button>
          <a className="btn sm" href={paperworkHandoffUrl(projectId)} target="_blank" rel="noopener noreferrer"><FileText size={13} /> 거래 서류 보내기</a>
        </div>
      </div>

      <section className="os-grid grid-4" aria-label="프로젝트 재무 합계">
        <FinanceSummaryCard label="총예산" value={detail.budgetAmount} currency={detail.currency} icon={WalletCards} />
        <FinanceSummaryCard label="배정 비용" value={detail.confirmedGrossAmount} currency={detail.currency} icon={UsersRound} />
        <FinanceSummaryCard label="미배정 예산" value={remainingBudget} currency={detail.currency} icon={WalletCards} tone={remainingBudget != null && remainingBudget < 0 ? "warn" : "default"} />
        <FinanceSummaryCard label="미지급액" value={detail.unpaidAmount} currency={detail.currency} icon={ReceiptText} tone={detail.unpaidAmount > 0 ? "warn" : "ok"} />
      </section>

      {error && <div className="banner soft">{error}</div>}

      <nav className="tabs finance-tabs" aria-label="재무 상세 탭">
        {([ ["overview", "예산 · 담당자"], ["allowances", "수당 배분"], ["transactions", "수금 · 지급"], ["audit", "변경 이력"] ] as Array<[Tab, string]>).map(([key, label]) => (
          <button key={key} type="button" className={`tab ${tab === key ? "on" : ""}`} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>

      {tab === "overview" && <Overview detail={detail} isGlobal={isGlobal} candidates={candidates} onMutate={applyMutation} />}
      {tab === "allowances" && <AllowanceEditor detail={detail} candidates={candidates.candidates} canEdit={detail.access === "global" || detail.access === "project_manager"} onMutate={applyMutation} />}
      {tab === "transactions" && <Transactions detail={detail} isGlobal={isGlobal} onMutate={applyMutation} />}
      {tab === "audit" && <AuditLog projectId={projectId} />}
    </div>
  );
}

function Overview({ detail, isGlobal, candidates, onMutate }: { detail: FinanceProjectDetail; isGlobal: boolean; candidates: ReturnType<typeof useFinanceMemberCandidates>; onMutate: FinanceMutation }) {
  const [budget, setBudget] = useState({ budget: detail.budgetAmount?.toString() ?? "", supply: detail.contractSupplyAmount?.toString() ?? "", vat: detail.contractVatAmount?.toString() ?? "", total: detail.contractTotalAmount?.toString() ?? "", basis: detail.contractAmountBasis, note: detail.contractNote ?? "", evidenceRef: detail.budgetEvidenceRef ?? "", client: detail.clientName ?? "", reason: "" });
  const [managerIds, setManagerIds] = useState(detail.managers.map((manager) => manager.crewMemberId));
  const [primaryManagerId, setPrimaryManagerId] = useState(detail.managers.find((manager) => manager.isPrimary)?.crewMemberId ?? detail.managers[0]?.crewMemberId ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBudget({ budget: detail.budgetAmount?.toString() ?? "", supply: detail.contractSupplyAmount?.toString() ?? "", vat: detail.contractVatAmount?.toString() ?? "", total: detail.contractTotalAmount?.toString() ?? "", basis: detail.contractAmountBasis, note: detail.contractNote ?? "", evidenceRef: detail.budgetEvidenceRef ?? "", client: detail.clientName ?? "", reason: "" });
    setManagerIds(detail.managers.map((manager) => manager.crewMemberId));
    setPrimaryManagerId(detail.managers.find((manager) => manager.isPrimary)?.crewMemberId ?? detail.managers[0]?.crewMemberId ?? "");
  }, [detail]);

  async function saveBudget() {
    setBusy(true);
    try {
      const payload: FinanceBudgetInput = { expectedVersion: detail.version, currency: detail.currency, budgetAmount: numeric(budget.budget), contractSupplyAmount: numeric(budget.supply), contractVatAmount: numeric(budget.vat), contractTotalAmount: numeric(budget.total), contractAmountBasis: budget.basis, contractNote: budget.note.trim() || null, clientName: budget.client.trim() || null, reason: budget.reason.trim(), ...(budget.evidenceRef.trim() ? { evidenceRef: budget.evidenceRef.trim() } : {}) };
      await onMutate("/budget", "PUT", payload, "예산 정보를 저장했습니다.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "저장하지 못했습니다."); } finally { setBusy(false); }
  }
  async function saveManagers() {
    const ids = Array.from(new Set(managerIds));
    if (!ids.length) { toast.error("재무 담당자를 한 명 이상 선택해주세요."); return; }
    setBusy(true);
    try {
      const selectedPrimary = ids.includes(primaryManagerId) ? primaryManagerId : ids[0];
      const payload: FinanceManagersInput = { expectedVersion: detail.version, managers: ids.map((crewMemberId) => ({ crewMemberId, isPrimary: crewMemberId === selectedPrimary })), reason: "재무 담당자 배정 변경" };
      await onMutate("/managers", "PUT", payload, "재무 담당자를 저장했습니다.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "저장하지 못했습니다."); } finally { setBusy(false); }
  }

  return <div className="finance-stack">
    <section className="card finance-section"><div className="card-head"><h2>계약 · 예산</h2><span className="hint">{detail.currency}</span></div>
      {isGlobal ? <div className="finance-form-grid">
        <Field label="총예산"><input className="input" inputMode="decimal" value={budget.budget} onChange={(e) => setBudget({ ...budget, budget: e.target.value })} placeholder="미입력" /></Field>
        <Field label="고객 공급가액"><input className="input" inputMode="decimal" value={budget.supply} onChange={(e) => setBudget({ ...budget, supply: e.target.value })} placeholder="미입력" /></Field>
        <Field label="VAT"><input className="input" inputMode="decimal" value={budget.vat} onChange={(e) => setBudget({ ...budget, vat: e.target.value })} placeholder="미입력" /></Field>
        <Field label="고객 청구합계"><input className="input" inputMode="decimal" value={budget.total} onChange={(e) => setBudget({ ...budget, total: e.target.value })} placeholder="미입력" /></Field>
        <Field label="계약 금액 기준"><select className="select" value={budget.basis} onChange={(e) => setBudget({ ...budget, basis: e.target.value as FinanceBudgetInput["contractAmountBasis"] })}><option value="undecided">미정</option><option value="supply_vat">공급가액 + VAT</option><option value="total_only">총액만</option></select></Field>
        <Field label="거래처"><input className="input" value={budget.client} onChange={(e) => setBudget({ ...budget, client: e.target.value })} placeholder="미입력" /></Field>
        <Field label="계약 메모" full><input className="input" value={budget.note} onChange={(e) => setBudget({ ...budget, note: e.target.value })} placeholder="계약·청구 참고 사항" /></Field>
        <Field label="계약·예산 증빙 참조" full><input className="input" value={budget.evidenceRef} onChange={(e) => setBudget({ ...budget, evidenceRef: e.target.value })} placeholder="문서 또는 원장 참조" /></Field>
        <Field label="변경 사유" full><input className="input" value={budget.reason} onChange={(e) => setBudget({ ...budget, reason: e.target.value })} placeholder="변경 근거를 남겨주세요" /></Field>
        <button className="btn primary" type="button" disabled={busy} onClick={() => void saveBudget()}>{busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} 예산 저장</button>
      </div> : <dl className="finance-definition-list"><Info label="총예산" value={formatWon(detail.budgetAmount, false, detail.currency)} /><Info label="고객 청구합계" value={formatWon(detail.contractTotalAmount, false, detail.currency)} /><Info label="수금 누계" value={formatWon(detail.receiptExecutedAmount, false, detail.currency)} /><Info label="미수금" value={formatWon(detail.receivableAmount, false, detail.currency)} /></dl>}
    </section>
    <section className="card finance-section"><div className="card-head"><h2>재무 담당자</h2><span className="hint">첫 번째 담당자가 주담당자입니다.</span></div>
      <div className="finance-manager-list">{detail.managers.length ? detail.managers.map((manager) => <div key={manager.id}><strong>{manager.name}</strong>{manager.isPrimary && <span className="badge info">주담당</span>}</div>) : <span className="finance-missing">배정된 담당자가 없습니다.</span>}</div>
      {isGlobal && <div className="finance-edit-block"><label className="lab">재무 담당자</label>{candidates.candidates.length ? <><div className="finance-manager-selection">{managerIds.map((crewMemberId) => { const candidate = candidates.candidates.find((row) => row.crewMemberId === crewMemberId); return <span className="finance-manager-chip" key={crewMemberId}>{candidate?.name ?? "현재 담당자"}<button aria-label={`${candidate?.name ?? "현재 담당자"} 담당자 제거`} disabled={busy} onClick={() => { setManagerIds((current) => current.filter((id) => id !== crewMemberId)); if (primaryManagerId === crewMemberId) setPrimaryManagerId(managerIds.find((id) => id !== crewMemberId) ?? ""); }} type="button">×</button></span>; })}</div><SearchableMemberDropdown ariaLabel="재무 담당자 추가" dataTestId="finance-manager-member-picker" disabled={busy} onSelect={(crewMemberId) => { setManagerIds((current) => current.includes(crewMemberId) ? current : [...current, crewMemberId]); if (!primaryManagerId) setPrimaryManagerId(crewMemberId); }} options={candidates.candidates.map((candidate) => ({ id: candidate.crewMemberId, name: candidate.name }))} placeholder="이름으로 담당자 추가" /><label className="lab">주담당자</label><SearchableMemberDropdown ariaLabel="주담당자 선택" dataTestId="finance-primary-manager-picker" disabled={busy || !managerIds.length} onSelect={setPrimaryManagerId} options={managerIds.map((crewMemberId) => { const candidate = candidates.candidates.find((row) => row.crewMemberId === crewMemberId); return { id: crewMemberId, name: candidate?.name ?? "현재 담당자" }; })} placeholder="주담당자 선택" value={primaryManagerId} /></> : <p className="hint">{candidates.unavailable ? "담당자 선택 목록을 불러오지 못했습니다. 새로고침 후 다시 시도해주세요." : "담당자 선택 목록을 불러오는 중입니다."}</p>}<p className="hint">여러 명을 추가할 수 있으며 주담당자를 별도로 지정합니다.</p><button className="btn" type="button" disabled={busy || !candidates.candidates.length} onClick={() => void saveManagers()}><UsersRound size={14} /> 담당자 저장</button></div>}
    </section>
  </div>;
}

function AllowanceEditor({ detail, candidates, canEdit, onMutate }: { detail: FinanceProjectDetail; candidates: FinanceMemberCandidate[]; canEdit: boolean; onMutate: FinanceMutation }) {
  const [items, setItems] = useState(() => detail.allowances.map(draftFromItem));
  const [busy, setBusy] = useState(false);
  const [creatingRevision, setCreatingRevision] = useState(false);
  useEffect(() => {
    setItems(detail.allowances.map(draftFromItem));
    if (detail.allowanceStatus !== "confirmed") setCreatingRevision(false);
  }, [detail.allowances, detail.allowanceStatus]);
  const draftTotal = useMemo(() => items.reduce((sum, item) => sum + (item.grossAmount ?? 0), 0), [items]);
  const overBudget = detail.budgetAmount != null && draftTotal > detail.budgetAmount;
  const canCreateRevision = canEdit && detail.allowanceStatus === "confirmed" && detail.paymentExecutedAmount === 0;
  const canEditDraft = canEdit && (detail.allowanceStatus !== "confirmed" || creatingRevision);
  function update(index: number, patch: Partial<FinanceAllowanceDraftItemInput>) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  async function save(submit = false) {
    if (overBudget) return toast.error("총예산을 초과한 배분안은 제출할 수 없습니다.");
    setBusy(true);
    try {
      const savedDetail = await onMutate("/allowances", "PUT", { expectedRevision: creatingRevision ? null : detail.allowanceRevision, items, reason: "수당 배분안 저장" }, "배분안을 저장했습니다.");
      if (submit) await onMutate("/allowances/submit", "POST", { expectedRevision: savedDetail.allowanceRevision ?? 0, reason: "재무 검토 요청" }, "재무 검토를 요청했습니다.");
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "저장하지 못했습니다."); } finally { setBusy(false); }
  }
  async function confirm() { setBusy(true); try { await onMutate("/allowances/confirm", "POST", { expectedRevision: detail.allowanceRevision ?? 0, reason: "재무 확정" }, "정산을 확정했습니다."); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "확정하지 못했습니다."); } finally { setBusy(false); } }
  return <section className="finance-stack"><div className="card finance-section"><div className="card-head"><h2>수당 배분안</h2><div className="row gap-8"><FinanceStatus status={detail.allowanceStatus ?? "draft"} /><span className={overBudget ? "finance-over-budget" : "hint"}>배분 합계 {formatWon(draftTotal, false, detail.currency)}</span></div></div>
    {overBudget && <div className="banner"><strong>예산 초과 {formatWon(draftTotal - (detail.budgetAmount ?? 0), false, detail.currency)}</strong><span>예산을 조정하거나 항목을 줄인 뒤 제출해주세요.</span></div>}
    {items.length === 0 && <FinanceEmpty title="아직 수당 항목이 없습니다" description={canEdit ? "참여자와 수당 사유를 추가해 배분안을 시작하세요." : "재무 담당자의 배분안 작성을 기다리고 있습니다."} />}
    <div className="finance-allowance-list">{items.map((item, index) => <AllowanceRow key={item.id ?? `new-${index}`} item={item} original={item.id ? detail.allowances.find((allowance) => allowance.id === item.id) : undefined} candidates={candidates} currency={detail.currency} editable={canEditDraft} onChange={(patch) => update(index, patch)} onRemove={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>
    {canCreateRevision && !creatingRevision && <div className="finance-edit-block mt-12"><p className="hint">기존 확정안은 정산 이력으로 유지되고, 새 배분안은 별도 초안으로 작성됩니다.</p><button className="btn primary" type="button" onClick={() => { setItems(revisionDrafts(detail.allowances)); setCreatingRevision(true); }}><Plus size={14} /> 새 배분안 작성</button></div>}
    {canEditDraft && <div className="row gap-8 mt-12" style={{ flexWrap: "wrap" }}><button className="btn" type="button" onClick={() => setItems((current) => [...current, { ...EMPTY_DRAFT }])}><Plus size={14} /> 항목 추가</button><button className="btn primary" type="button" disabled={busy} onClick={() => void save()}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 초안 저장</button><button className="btn" type="button" disabled={busy || (!creatingRevision && detail.allowanceStatus !== "draft")} onClick={() => void save(true)}><Send size={14} /> 재무 검토 제출</button></div>}
    {canEdit && detail.allowanceStatus === "confirmed" && !canCreateRevision && <p className="hint mt-12">지급 이력이 있는 확정안은 정산 이력 보존을 위해 수정하거나 새 배분안으로 대체할 수 없습니다.</p>}
    {detail.access === "global" && detail.allowanceStatus === "submitted" && <button className="btn primary mt-12" type="button" disabled={busy || overBudget} onClick={() => void confirm()}><CheckCircle2 size={14} /> 정산 확정</button>}
  </div></section>;
}

function AllowanceRow({ item, original, candidates, currency, editable, onChange, onRemove }: { item: FinanceAllowanceDraftItemInput; original?: FinanceAllowanceItem; candidates: FinanceMemberCandidate[]; currency: FinanceProjectDetail["currency"]; editable: boolean; onChange: (patch: Partial<FinanceAllowanceDraftItemInput>) => void; onRemove: () => void }) {
  const recipientName = original?.recipientName ?? candidates.find((candidate) => candidate.userId === item.recipientUserId)?.name ?? "참여자 정보 확인";
  const deductionAmount = original?.deductionAmount ?? (original?.incomeTaxAmount != null || original?.localIncomeTaxAmount != null ? (original.incomeTaxAmount ?? 0) + (original.localIncomeTaxAmount ?? 0) : null);
  if (!editable) return <div className="finance-allowance-row"><strong>{recipientName}</strong><span>{item.category} · {item.reason || "사유 미입력"}</span>{item.requestedAmountRaw && <span>메일 요청액 · {item.requestedAmountRaw}</span>}<span>세전 {formatWon(original?.grossAmount ?? item.grossAmount ?? null, false, currency)}</span><span>공제 {formatWon(deductionAmount, false, currency)}</span><span>실지급 예정 {formatWon(original?.netAmount ?? null, false, currency)}</span><span>실지급 {formatWon(original?.paidAmount ?? null, false, currency)}</span><span>미지급 {formatWon(original?.outstandingAmount ?? null, false, currency)}</span></div>;
  const memberOptions = !candidates.some((candidate) => candidate.userId === item.recipientUserId) && item.recipientUserId ? [{ id: item.recipientUserId, name: original?.recipientName ?? "현재 참여자" }, ...candidates.map((candidate) => ({ id: candidate.userId, name: candidate.name }))] : candidates.map((candidate) => ({ id: candidate.userId, name: candidate.name }));
  return <div className="finance-allowance-editor"><div className="finance-form-grid"><Field label="참여자"><SearchableMemberDropdown ariaLabel="수당 참여자 선택" dataTestId="finance-allowance-member-picker" onSelect={(recipientUserId) => onChange({ recipientUserId })} options={memberOptions} placeholder="이름으로 참여자 선택" value={item.recipientUserId} /></Field><Field label="수당 항목"><input className="input" value={item.category} onChange={(e) => onChange({ category: e.target.value })} placeholder="리허설, 공연, 교통비" /></Field><Field label="메일 요청액·기준"><input className="input" value={item.requestedAmountRaw ?? ""} onChange={(e) => onChange({ requestedAmountRaw: e.target.value || null })} placeholder="세무 기준 미확정 요청액" /></Field><Field label="세전액"><input className="input" inputMode="decimal" value={item.grossAmount ?? ""} onChange={(e) => onChange({ grossAmount: numeric(e.target.value) })} placeholder="금액 미확정" /></Field><Field label="세무 유형"><select className="select" value={item.taxType} onChange={(e) => onChange({ taxType: e.target.value as FinanceAllowanceDraftItemInput["taxType"] })}><option value="undecided">미정</option><option value="business_income_3_3">사업소득 3.3%</option><option value="invoice">세금계산서</option><option value="foreign">외국인</option><option value="none">공제 없음</option></select></Field><Field label="지급 예정일"><input className="input" type="date" value={item.scheduledPaymentDate ?? ""} onChange={(e) => onChange({ scheduledPaymentDate: e.target.value || null })} /></Field><Field label="증빙 참조"><input className="input" value={item.evidenceRef ?? ""} onChange={(e) => onChange({ evidenceRef: e.target.value || null })} placeholder="문서 또는 거래 참조" /></Field><Field label="사유" full><input className="input" value={item.reason} onChange={(e) => onChange({ reason: e.target.value })} placeholder="수당 산정 근거" /></Field></div><button className="btn ghost danger sm" type="button" onClick={onRemove}>항목 삭제</button></div>;
}

function Transactions({ detail, isGlobal, onMutate }: { detail: FinanceProjectDetail; isGlobal: boolean; onMutate: FinanceMutation }) {
  const [receipt, setReceipt] = useState({ amount: "", sourceSystem: "", sourceAccountRef: "", sourceTransactionId: "", receivedAt: "", counterparty: "", evidenceRef: "" });
  const [payment, setPayment] = useState({ amount: "", sourceSystem: "", sourceAccountRef: "", sourceTransactionId: "", paidAt: "", recipientUserId: detail.allowances[0]?.recipientUserId ?? "", allowanceItemId: detail.allowances[0]?.id ?? "", evidenceRef: "" });
  const [busy, setBusy] = useState(false);
  async function addReceipt() { setBusy(true); try { const body: FinanceReceiptInput = { idempotencyKey: crypto.randomUUID(), sourceSystem: receipt.sourceSystem, sourceAccountRef: receipt.sourceAccountRef, sourceTransactionId: receipt.sourceTransactionId, amount: numeric(receipt.amount) ?? 0, currency: detail.currency, receivedAt: dateAtKst(receipt.receivedAt), counterparty: receipt.counterparty || null, status: "executed", evidenceRef: receipt.evidenceRef || null }; await onMutate("/receipts", "POST", body, "수금 증빙을 등록했습니다."); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "등록하지 못했습니다."); } finally { setBusy(false); } }
  async function addPayment() { if (!payment.recipientUserId.trim() || !payment.allowanceItemId) { toast.error("배부할 수당 항목을 선택해주세요."); return; } setBusy(true); try { const amount = numeric(payment.amount) ?? 0; const body: FinancePaymentInput = { idempotencyKey: crypto.randomUUID(), sourceSystem: payment.sourceSystem, sourceAccountRef: payment.sourceAccountRef, sourceTransactionId: payment.sourceTransactionId, amount, currency: detail.currency, paidAt: dateAtKst(payment.paidAt), recipientUserId: payment.recipientUserId.trim(), status: "executed", evidenceRef: payment.evidenceRef || null, allocations: [{ allowanceItemId: payment.allowanceItemId, amount }] }; await onMutate("/payments", "POST", body, "지급 증빙을 등록했습니다."); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "등록하지 못했습니다."); } finally { setBusy(false); } }
  const paymentTitle = (recipientUserId: string | null) => {
    const allowance = detail.allowances.find((item) => item.recipientUserId === recipientUserId);
    if (!allowance) return "수취인 정보 확인";
    return [allowance.recipientName, allowance.category, allowance.reason].filter(Boolean).join(" · ");
  };
  return <div className="finance-stack"><section className="card finance-section"><div className="card-head"><h2>수금 내역</h2><span className="hint">실제 입금 확인분만 누계에 반영됩니다.</span></div><TransactionList rows={detail.receipts.map((row) => ({ id: row.id, title: row.counterparty ?? "거래처 미입력", date: row.receivedAt, amount: row.amount, status: row.status, evidencePresent: row.evidencePresent }))} empty="등록된 수금 내역이 없습니다." />{isGlobal && <TransactionForm kind="receipt" values={receipt} setValues={setReceipt} onSubmit={addReceipt} busy={busy} />}</section><section className="card finance-section"><div className="card-head"><h2>지급 내역</h2><span className="hint">실제 이체 완료분만 지급 누계에 반영됩니다.</span></div><TransactionList rows={detail.payments.map((row) => ({ id: row.id, title: paymentTitle(row.recipientUserId), date: row.paidAt, amount: row.amount, status: row.status, evidencePresent: row.evidencePresent }))} empty="등록된 지급 내역이 없습니다." />{isGlobal && <PaymentForm values={payment} setValues={setPayment} allowances={detail.allowances} onSubmit={addPayment} busy={busy} />}</section></div>;
}

function TransactionList({ rows, empty }: { rows: Array<{ id: string; title: string; date: string | null; amount: number; status: string; evidencePresent: boolean }>; empty: string }) { return rows.length ? <div className="finance-transaction-list">{rows.map((row) => <div key={row.id}><div><strong>{row.title}</strong><small>{formatDate(row.date)} · {row.evidencePresent ? "증빙 연결" : "증빙 확인 필요"}</small></div><span className="tabnum">{formatWon(row.amount)}</span><FinanceStatus status={row.status} /></div>)}</div> : <p className="finance-empty-copy">{empty}</p>; }

function TransactionForm({ kind, values, setValues, onSubmit, busy }: { kind: "receipt"; values: { amount: string; sourceSystem: string; sourceAccountRef: string; sourceTransactionId: string; receivedAt: string; counterparty: string; evidenceRef: string }; setValues: (next: typeof values) => void; onSubmit: () => Promise<void>; busy: boolean }) { return <div className="finance-edit-block"><h3>수금 증빙 등록</h3><div className="finance-form-grid"><Field label="금액 (프로젝트 통화)"><input className="input" inputMode="decimal" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} /></Field><Field label="입금일"><input className="input" type="date" value={values.receivedAt} onChange={(e) => setValues({ ...values, receivedAt: e.target.value })} /></Field><Field label="원천 시스템"><input className="input" value={values.sourceSystem} onChange={(e) => setValues({ ...values, sourceSystem: e.target.value })} /></Field><Field label="계좌 참조"><input className="input" value={values.sourceAccountRef} onChange={(e) => setValues({ ...values, sourceAccountRef: e.target.value })} /></Field><Field label="거래 ID"><input className="input" value={values.sourceTransactionId} onChange={(e) => setValues({ ...values, sourceTransactionId: e.target.value })} /></Field><Field label="거래처"><input className="input" value={values.counterparty} onChange={(e) => setValues({ ...values, counterparty: e.target.value })} /></Field><Field label="증빙 참조" full><input className="input" value={values.evidenceRef} onChange={(e) => setValues({ ...values, evidenceRef: e.target.value })} /></Field></div><button className="btn" type="button" disabled={busy} onClick={() => void onSubmit()}><FileCheck2 size={14} /> 수금 등록</button></div>; }

function PaymentForm({ values, setValues, allowances, onSubmit, busy }: { values: { amount: string; sourceSystem: string; sourceAccountRef: string; sourceTransactionId: string; paidAt: string; recipientUserId: string; allowanceItemId: string; evidenceRef: string }; setValues: (next: typeof values) => void; allowances: FinanceAllowanceItem[]; onSubmit: () => Promise<void>; busy: boolean }) { const selected = allowances.find((allowance) => allowance.id === values.allowanceItemId); return <div className="finance-edit-block"><h3>지급 증빙 등록</h3><div className="finance-form-grid"><Field label="금액"><input className="input" inputMode="decimal" value={values.amount} onChange={(e) => setValues({ ...values, amount: e.target.value })} /></Field><Field label="지급일"><input className="input" type="date" value={values.paidAt} onChange={(e) => setValues({ ...values, paidAt: e.target.value })} /></Field><Field label="원천 시스템"><input className="input" value={values.sourceSystem} onChange={(e) => setValues({ ...values, sourceSystem: e.target.value })} /></Field><Field label="계좌 참조"><input className="input" value={values.sourceAccountRef} onChange={(e) => setValues({ ...values, sourceAccountRef: e.target.value })} /></Field><Field label="거래 ID"><input className="input" value={values.sourceTransactionId} onChange={(e) => setValues({ ...values, sourceTransactionId: e.target.value })} /></Field><Field label="수취인"><input className="input" value={selected?.recipientName ?? "수당 항목을 선택하세요"} readOnly /></Field><Field label="배부할 수당 항목" full><select className="select" value={values.allowanceItemId} onChange={(e) => { const allowance = allowances.find((candidate) => candidate.id === e.target.value); setValues({ ...values, allowanceItemId: e.target.value, recipientUserId: allowance?.recipientUserId ?? "" }); }}><option value="" disabled>선택</option>{allowances.map((allowance) => <option key={allowance.id} value={allowance.id}>{allowance.recipientName} · {allowance.category} · {formatWon(allowance.outstandingAmount)}</option>)}</select></Field><Field label="증빙 참조" full><input className="input" value={values.evidenceRef} onChange={(e) => setValues({ ...values, evidenceRef: e.target.value })} /></Field></div><button className="btn" type="button" disabled={busy || !allowances.length} onClick={() => void onSubmit()}><FileCheck2 size={14} /> 지급 등록</button></div>; }

function AuditLog({ projectId }: { projectId: string }) { const [rows, setRows] = useState<Array<{ id: string; action: string; entityType: string; occurredAt: string; reason: string | null }> | null>(null); const [error, setError] = useState<string | null>(null); useEffect(() => { void (async () => { try { const response = await fetch(`/api/finance/projects/${encodeURIComponent(projectId)}/audit`, { cache: "no-store" }); const payload = await response.json().catch(() => null); if (!response.ok) throw new Error(apiErrorMessage(payload, "변경 이력을 불러오지 못했습니다.")); setRows((payload as { data: typeof rows }).data ?? []); } catch (cause) { setError(cause instanceof Error ? cause.message : "변경 이력을 불러오지 못했습니다."); } })(); }, [projectId]); if (error) return <FinanceError message={error} />; if (!rows) return <FinanceLoading label="변경 이력을 불러오는 중입니다" />; return <section className="card finance-section"><div className="card-head"><h2>변경 이력</h2></div>{rows.length ? <div className="finance-audit-list">{rows.map((row) => <div key={row.id}><strong>{row.action}</strong><span>{row.entityType} · {formatDate(row.occurredAt)}</span>{row.reason && <small>{row.reason}</small>}</div>)}</div> : <FinanceEmpty title="변경 이력이 없습니다" description="예산, 배분, 증빙 변경 내역이 이곳에 표시됩니다." />}</section>; }

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) { return <label className={full ? "finance-field finance-field-full" : "finance-field"}><span>{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
