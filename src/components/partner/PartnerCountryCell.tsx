import type { CommonCodeItem } from "../../api/commonCode";
import { labelForCommonCode } from "../../api/commonCode";
import type { Partner, PartnerSummary } from "../../api/purchaseOrder";
import { partnerCountryFlagUrl } from "../../domains/partner/helpers/partnerCountryOptions";

export type PartnerCountryCellPartner =
  | Partner
  | PartnerSummary
  | null
  | undefined;

type Props = {
  partner: PartnerCountryCellPartner;
  countryCodes: CommonCodeItem[];
  /**
   * `orderList`: 발주 목록 — 1행 업체명(메인), 2행 업체코드·국가·국기(서브).
   * `default`: 국기+국가 한 줄, 보조 줄에 코드·상호 (`Partners` 등).
   */
  variant?: "default" | "orderList";
};

/**
 * `default`: 국기 + 국가명, 보조 줄에 업체코드 · 상호.
 * `orderList`: 1행 업체명, 2행 코드·국가·소형 국기.
 */
export function PartnerCountryCell({
  partner,
  countryCodes,
  variant = "default",
}: Props) {
  if (
    !partner ||
    (!String(partner.countryCode ?? "").trim() &&
      !String(partner.code ?? "").trim() &&
      !String(partner.name ?? "").trim())
  ) {
    return <span className="text-gray-500 dark:text-gray-400">—</span>;
  }

  const countryCode = String(partner.countryCode ?? "").trim().toUpperCase();
  const countryLabel = labelForCommonCode(countryCodes, partner.countryCode);
  const flagUrl = countryCode ? partnerCountryFlagUrl(countryCode) : undefined;
  const code = String(partner.code ?? "").trim();
  const name = String(partner.name ?? "").trim();
  const subline =
    code || name ? `${code || "—"} · ${name || "—"}` : null;

  const flagImg = flagUrl ? (
    <img
      src={flagUrl}
      alt=""
      className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
      decoding="async"
    />
  ) : (
    <span
      className="inline-flex h-5 w-[1.375rem] shrink-0 items-center justify-center rounded-sm bg-gray-100 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      aria-hidden
    >
      ···
    </span>
  );

  const flagImgOrderList = flagUrl ? (
    <img
      src={flagUrl}
      alt=""
      className="h-3.5 w-[0.95rem] shrink-0 rounded-[3px] object-cover sm:h-4 sm:w-[1.05rem]"
      decoding="async"
    />
  ) : (
    <span
      className="inline-flex h-3.5 w-[0.95rem] shrink-0 items-center justify-center rounded-[3px] bg-gray-100 text-[8px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400 sm:h-4 sm:w-[1.05rem]"
      aria-hidden
    >
      ···
    </span>
  );

  if (variant === "orderList") {
    const showName = Boolean(name);
    const mainLine = showName ? name : code || null;
    const subHasCode = showName && Boolean(code);

    if (!mainLine) {
      return (
        <div className="flex min-w-0 flex-col gap-0.5 text-start">
          <span className="truncate text-theme-xs font-medium text-gray-400 dark:text-gray-500">
            —
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="min-w-0 max-w-[min(100%,10rem)] shrink truncate text-theme-xs text-gray-500 dark:text-gray-400">
              {countryLabel?.trim() ? countryLabel : "—"}
            </span>
            {flagImgOrderList}
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-w-0 flex-col gap-0.5 text-start">
        <span className="min-w-0 truncate text-theme-xs font-medium text-gray-800 dark:text-gray-200">
          {mainLine}
        </span>
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {subHasCode ? (
            <span className="min-w-0 max-w-[min(100%,7rem)] shrink truncate text-theme-xs text-gray-600 dark:text-gray-400">
              {code}
            </span>
          ) : null}
          <span className="min-w-0 max-w-[min(100%,10rem)] shrink truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {countryLabel?.trim() ? countryLabel : "—"}
          </span>
          {flagImgOrderList}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        {flagImg}
        <span className="text-theme-sm text-gray-700 dark:text-gray-300">
          {countryLabel}
        </span>
      </div>
      {subline ? (
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">
          {subline}
        </span>
      ) : null}
    </div>
  );
}
