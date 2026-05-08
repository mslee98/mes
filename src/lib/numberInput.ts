export function normalizeDecimalInput(raw: string): string {
  const sanitized = String(raw ?? "").replace(/[^\d.]/g, "");
  const [intPart, ...decimalParts] = sanitized.split(".");
  const decimal = decimalParts.join("");
  return decimalParts.length > 0 ? `${intPart}.${decimal}` : intPart;
}
