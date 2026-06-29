import { useMemo, useState } from "react";
import { commonCodesToSelectOptions, type CommonCodeItem } from "../../../api/commonCode";
import { usePartnersQuery } from "../../../hooks/usePartnersQuery";
import { usePartnerCodeSlotRows } from "../sections/PartnerBasicInfoSection";
import {
  PARTNER_TYPE_SUPPLIER,
} from "../utils/phoneUtils";

type UsePartnerCodeRuleParams = {
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
  partnerType: string;
  supplierSegment: string;
  partnerTypeCodes: CommonCodeItem[];
  supplierSegmentCodes: CommonCodeItem[];
};

export function usePartnerCodeRule({
  accessToken,
  isAuthLoading,
  partnerType,
  supplierSegment,
  partnerTypeCodes,
  supplierSegmentCodes,
}: UsePartnerCodeRuleParams) {
  const [isCodeRuleModalOpen, setIsCodeRuleModalOpen] = useState(false);

  const selectedTypeCode = partnerType.trim();
  const selectedSegmentCode = supplierSegment.trim();
  const isCodeRuleTargetReady =
    selectedTypeCode !== "" &&
    (selectedTypeCode !== PARTNER_TYPE_SUPPLIER || selectedSegmentCode !== "");

  const { data: codeRulePartners = [], isLoading: isCodeRuleLoading } =
    usePartnersQuery(
      accessToken,
      {
        type: selectedTypeCode || undefined,
        supplierSegmentCode:
          selectedTypeCode === PARTNER_TYPE_SUPPLIER
            ? selectedSegmentCode || undefined
            : undefined,
      },
      {
        enabled:
          !!accessToken &&
          !isAuthLoading &&
          isCodeRuleModalOpen &&
          isCodeRuleTargetReady,
      }
    );

  const partnerTypeOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(partnerTypeCodes);
    return [{ value: "", label: "선택" }, ...base];
  }, [partnerTypeCodes]);

  const supplierSegmentOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(supplierSegmentCodes);
    return [{ value: "", label: "선택" }, ...base];
  }, [supplierSegmentCodes]);

  const selectedPartnerTypeLabel =
    partnerTypeOptions.find((opt) => opt.value === partnerType)?.label ?? "-";
  const selectedSupplierSegmentLabel =
    supplierSegmentOptions.find((opt) => opt.value === supplierSegment)?.label ??
    "-";

  const isCodeInputReady =
    partnerType.trim() !== "" &&
    (partnerType !== PARTNER_TYPE_SUPPLIER || supplierSegment.trim() !== "");

  const codePlaceholder = isCodeInputReady
    ? "예: A, ZZ"
    : partnerType !== PARTNER_TYPE_SUPPLIER
      ? "업체 유형을 먼저 선택하세요"
      : "협력사 부문까지 선택하세요";

  const codeGuideText = isCodeInputReady
    ? `현재 선택 기준: ${selectedPartnerTypeLabel}${
        partnerType === PARTNER_TYPE_SUPPLIER
          ? ` / ${selectedSupplierSegmentLabel}`
          : ""
      } · 대문자 영문 1~2자리`
    : "코드 체계 확인을 위해 업체 유형(협력사인 경우 부문까지)을 먼저 선택하세요.";

  const codeSlotRows = usePartnerCodeSlotRows(
    codeRulePartners,
    selectedTypeCode,
    selectedSegmentCode
  );

  return {
    isCodeRuleModalOpen,
    setIsCodeRuleModalOpen,
    partnerTypeOptions,
    supplierSegmentOptions,
    selectedPartnerTypeLabel,
    selectedSupplierSegmentLabel,
    isCodeInputReady,
    codePlaceholder,
    codeGuideText,
    isCodeRuleLoading,
    codeSlotRows,
  };
}
