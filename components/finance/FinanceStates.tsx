import { AlertCircle, LoaderCircle, RefreshCw, WalletCards } from "lucide-react";

export function FinanceLoading({ label = "재무 정보를 불러오는 중입니다" }: { label?: string }) {
  return (
    <div className="card finance-state" aria-live="polite">
      <LoaderCircle className="animate-spin" size={24} />
      <strong>{label}</strong>
      <span>권한과 최신 원장을 함께 확인하고 있어요.</span>
    </div>
  );
}

export function FinanceError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card finance-state finance-state-error" role="alert">
      <AlertCircle size={24} />
      <strong>정보를 불러오지 못했습니다</strong>
      <span>{message}</span>
      {onRetry && (
        <button className="btn sm" type="button" onClick={onRetry}>
          <RefreshCw size={13} /> 다시 시도
        </button>
      )}
    </div>
  );
}

export function FinanceEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="card finance-state">
      <WalletCards size={28} />
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}
