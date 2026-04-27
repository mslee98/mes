export interface RequiredFieldRule {
  value: string | number | null | undefined;
  message: string;
}

export function validateRequiredFields(
  rules: RequiredFieldRule[],
  onError: (message: string) => void
): boolean {
  for (const rule of rules) {
    const value = rule.value;
    const missing =
      value == null ||
      (typeof value === "string" && value.trim() === "") ||
      (typeof value === "number" && !Number.isFinite(value));
    if (missing) {
      onError(rule.message);
      return false;
    }
  }
  return true;
}
