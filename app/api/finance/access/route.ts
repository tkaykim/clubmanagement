import { financeJson, getFinanceIdentity } from "@/lib/finance-server";
import { canEnterFinance } from "@/lib/finance-access";

export async function GET() {
  const identity = await getFinanceIdentity();
  if (!identity) {
    return financeJson({ data: { authenticated: false, canAccessFinance: false } });
  }
  return financeJson({
    data: {
      authenticated: true,
      canAccessFinance: canEnterFinance(identity),
      isGlobal: identity.isGlobal,
      managedProjectIds: identity.managedProjectIds,
    },
  });
}
