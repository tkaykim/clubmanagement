import { financeJson, getFinanceIdentity } from "@/lib/finance-server";

export async function GET() {
  const identity = await getFinanceIdentity();
  if (!identity) {
    return financeJson({ data: { authenticated: false, canAccessFinance: false } });
  }
  return financeJson({
    data: {
      authenticated: true,
      canAccessFinance: identity.isGlobal || identity.managedProjectIds.length > 0,
      isGlobal: identity.isGlobal,
      managedProjectIds: identity.managedProjectIds,
    },
  });
}
