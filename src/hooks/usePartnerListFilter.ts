import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPartners, type Partner } from "../api/purchaseOrder";
import type { CommonCodeItem } from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";

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

  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: () => getPartners(accessToken!),
    enabled: queryEnabled,
  });

  const partnerFilterOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [
      { value: "", label: "전체" },
    ];
    (partners as Partner[]).forEach((p) =>
      list.push({
        value: String(p.id),
        label: partnerSelectLabel(p, countryCodes),
      })
    );
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
