/** `YYYY-MM` 월 입력 정규화 */
export function normalizeMonthInput(v: string): string {
  if (!/^\d{4}-\d{2}$/.test(v)) return "";
  const [yearText, monthText] = v.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  if (month < 1 || month > 12) return "";
  return `${yearText}-${monthText}`;
}

export function hasValidMonthRange(fromMonth: string, toMonth: string): boolean {
  return normalizeMonthInput(fromMonth) !== "" && normalizeMonthInput(toMonth) !== "";
}
