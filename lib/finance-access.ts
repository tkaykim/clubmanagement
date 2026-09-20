export type FinanceAccess = {
  isGlobal: boolean;
  isOperator: boolean;
  managedProjectIds: string[];
};

export function isActiveFinanceOperator(
  member: { role?: string | null; is_active?: boolean | null } | null
): boolean {
  return member?.is_active === true && (member.role === "admin" || member.role === "owner");
}

/** Page entry does not grant access to any project's private ledger. */
export function canEnterFinance(access: FinanceAccess | null): boolean {
  return Boolean(access && (access.isGlobal || access.isOperator || access.managedProjectIds.length > 0));
}

export function canReadFinanceProject(access: FinanceAccess, projectId: string): boolean {
  return access.isGlobal || access.managedProjectIds.includes(projectId);
}
