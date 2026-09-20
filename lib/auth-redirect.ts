/** Only navigate to a path on the current application origin after authentication. */
export function safeAuthRedirect(value: string | null, origin: string): string {
  if (!value?.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/dashboard";
  try {
    const destination = new URL(value, origin);
    if (destination.origin !== origin || destination.pathname === "/") return "/dashboard";
    return destination.pathname + destination.search + destination.hash;
  } catch { return "/dashboard"; }
}
