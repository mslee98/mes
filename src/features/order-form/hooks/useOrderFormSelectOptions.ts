import { useMemo } from "react";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { Partner } from "../../../api/purchaseOrder";
import type { RepresentativeProduct } from "../../../api/products";
import type { LensItem } from "../../../api/lenses";
import { getCurrencySymbol } from "../../../lib/format/formatCurrency";
import { toPartnerSearchableSelectOptions } from "../../../domains/partner/helpers/partnerSelectOptions";
import { representativeProductSelectLabel } from "../../../api/products";
import { itemFormStrings as S } from "../../../pages/itemFormStrings";

type UseOrderFormSelectOptionsParams = {
  partners: Partner[];
  countryCodes: CommonCodeItem[];
  productList: RepresentativeProduct[];
  lensList: LensItem[];
  currencyCodes: CommonCodeItem[];
  unitCodes: CommonCodeItem[];
};

export function useOrderFormSelectOptions({
  partners,
  countryCodes,
  productList,
  lensList,
  currencyCodes,
  unitCodes,
}: UseOrderFormSelectOptionsParams) {
  const partnerSelectOptions = useMemo(() => {
    return toPartnerSearchableSelectOptions(partners, countryCodes);
  }, [partners, countryCodes]);

  const productSelectOptions = useMemo(
    () =>
      productList.map((p) => ({
        value: String(p.id),
        label: representativeProductSelectLabel(p),
      })),
    [productList]
  );

  const lensSelectOptions = useMemo(() => {
    return lensList.map((lens) => {
      const lensName = String(lens.lensName ?? "").trim() || `렌즈 #${lens.id}`;
      const fNumber = String(lens.fNumber ?? "").trim();
      const focalLength = String(lens.focalLength ?? "").trim();
      const detail = [fNumber, focalLength].filter(Boolean).join(" · ");
      return {
        value: String(lens.id),
        label: detail ? `${lensName} (${detail})` : lensName,
      };
    });
  }, [lensList]);

  const currencyOptions = useMemo(() => {
    const list: { value: string; label: string; symbol?: string }[] = [];
    currencyCodes.forEach((c) =>
      list.push({
        value: c.code,
        label: c.name || c.code,
        symbol: getCurrencySymbol(c.code),
      })
    );
    if (list.length === 0) {
      list.push({
        value: "KRW",
        label: S.currencyKrwLabel,
        symbol: S.currencyKrwSymbol,
      });
    }
    return list;
  }, [currencyCodes]);

  const unitOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    unitCodes.forEach((c) =>
      list.push({ value: c.code, label: c.name || c.code })
    );
    if (list.length === 0) {
      list.push({ value: "EA", label: "EA" });
    }
    return list;
  }, [unitCodes]);

  const firstUnitValue = unitOptions[0]?.value ?? "";

  return {
    partnerSelectOptions,
    productSelectOptions,
    lensSelectOptions,
    currencyOptions,
    unitOptions,
    firstUnitValue,
  };
}
