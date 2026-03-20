/**
 * 단가/금액을 통화별로 포맷합니다.
 * 제품·발주 등에서 원(KRW), 달러(USD), 엔(JPY) 등 다통화 지원 시 사용합니다.
 * API에 currencyCode 필드가 생기면 해당 값을 넘기면 됩니다.
 */
const DEFAULT_CURRENCY = "KRW";

const CURRENCY_CONFIG: Record<
  string,
  { locale: string; symbol: string; decimals: number; prefix: boolean }
> = {
  KRW: { locale: "ko-KR", symbol: "원", decimals: 0, prefix: false },
  USD: { locale: "en-US", symbol: "$", decimals: 2, prefix: true },
  JPY: { locale: "ja-JP", symbol: "¥", decimals: 0, prefix: true },
};

function getConfig(currencyCode: string) {
  const code = (currencyCode || DEFAULT_CURRENCY).toUpperCase();
  return CURRENCY_CONFIG[code] ?? CURRENCY_CONFIG[DEFAULT_CURRENCY];
}

/** 통화 코드별 기호(원, $, ¥). Select+Input 등 공통 UI에서 사용 */
export function getCurrencySymbol(currencyCode: string): string {
  return getConfig(currencyCode).symbol;
}

/**
 * 금액을 통화 코드에 맞춰 문자열로 포맷합니다.
 * @param amount - 금액 (null/undefined면 "-" 반환)
 * @param currencyCode - 통화 코드 (KRW, USD, JPY). 생략 시 KRW
 * @param options.withSymbol - true면 "1,234원", false면 "1,234" (기본 true)
 */
export function formatCurrency(
  amount: number | null | undefined,
  currencyCode: string = DEFAULT_CURRENCY,
  options?: { withSymbol?: boolean }
): string {
  if (amount == null) return "-";
  const config = getConfig(currencyCode);
  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
  }).format(amount);
  const withSymbol = options?.withSymbol !== false;
  if (!withSymbol) return formatted;
  return config.prefix
    ? `${config.symbol}${formatted}`
    : `${formatted}${config.symbol}`;
}
