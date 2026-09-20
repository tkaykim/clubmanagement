export type FinanceSettlementDateFilter = {
  year?: string | null;
  month?: string | null;
};

type DatedSettlement = { eventDate: string | null };

function normalizeLegacyMonth(month: string): string | null {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return month;
  if (/^(0?[1-9]|1[0-2])$/.test(month)) return month.padStart(2, "0");
  return null;
}

/**
 * Applies the same event-date policy to the JSON and CSV settlement exports.
 * `month=YYYY-MM` is an exact calendar-month match, while legacy `month=MM`
 * spans matching months across years. Supplying `year` adds an intersection.
 */
export function filterFinanceSettlementsByEventDate<T extends DatedSettlement>(
  settlements: T[],
  { year, month }: FinanceSettlementDateFilter
): T[] {
  const normalizedMonth = month ? normalizeLegacyMonth(month) : null;
  if (!year && !month) return settlements;

  return settlements.filter((settlement) => {
    const eventDate = settlement.eventDate;
    // Unknown dates are useful in an unfiltered settlement history, but cannot
    // truthfully satisfy any requested date filter.
    if (!eventDate) return false;
    if (year && eventDate.slice(0, 4) !== year) return false;
    if (!month) return true;
    if (month?.includes("-")) return eventDate.slice(0, 7) === normalizedMonth;
    return normalizedMonth !== null && eventDate.slice(5, 7) === normalizedMonth;
  });
}
