import { useMemo, useState } from "react";
import { usePartnersQuery } from "./usePartnersQuery";
import type { CommonCodeItem } from "../api/commonCode";
import { toPartnerSelectOptions } from "../lib/partnerSelectOptions";

export interface UsePartnerListFilterOptions {
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
  countryCodes: CommonCodeItem[];
  /** 기본: `!!accessToken && !isAuthLoading` */
  enabled?: boolean;
}

/**
 * 목록 화면용 거래처 필터 — 파트너 쿼리, 셀렉트 옵션, 등록 모달 열림 상태.
 */
export function usePartnerListFilter({
  accessToken,
  isAuthLoading,
  countryCodes,
  enabled: enabledOption,
}: UsePartnerListFilterOptions) {
  const [partnerId, setPartnerId] = useState("");
  const [partnerCreateOpen, setPartnerCreateOpen] = useState(false);
  const [partnerFieldKey, setPartnerFieldKey] = useState(0);

  const queryEnabled =
    enabledOption !== undefined
      ? enabledOption && !!accessToken
      : !!accessToken && !isAuthLoading;

  const { data: partners = [] } = usePartnersQuery(accessToken, undefined, {
    enabled: queryEnabled,
  });

  const partnerFilterOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [
      { value: "", label: "전체" },
    ];
    list.push(...toPartnerSelectOptions(partners, countryCodes));
    return list;
  }, [partners, countryCodes]);

  const remountPartnerField = () =>
    setPartnerFieldKey((k) => k + 1);

  return {
    partnerId,
    setPartnerId,
    partnerCreateOpen,
    setPartnerCreateOpen,
    partnerFilterOptions,
    partnerFieldKey,
    remountPartnerField,
  };
}
