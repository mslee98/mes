import { useMemo } from "react";
import Label from "../../../components/form/Label";
import FormField from "../../../components/form/FormField";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import Select from "../../../components/form/Select";
import CountrySelect from "../../../components/form/CountrySelect";
import Toggle from "../../../components/form/Toggle";
import { InformationCircleIcon } from "../../../icons";
import {
  PARTNER_CODE_REGEX,
  PARTNER_CODE_SLOT_CANDIDATES,
  PARTNER_TYPE_SUPPLIER,
} from "../utils/phoneUtils";
import type { Partner } from "../../../api/purchaseOrder";

type PartnerBasicInfoSectionProps = {
  isNew: boolean;
  code: string;
  onCodeChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  countryCode: string;
  onCountryCodeChange: (v: string) => void;
  partnerType: string;
  onPartnerTypeChange: (v: string) => void;
  supplierSegment: string;
  onSupplierSegmentChange: (v: string) => void;
  businessRegistrationNo: string;
  onBusinessRegistrationNoChange: (v: string) => void;
  address: string;
  onAddressChange: (v: string) => void;
  memo: string;
  onMemoChange: (v: string) => void;
  isActive: boolean;
  onIsActiveChange: (v: boolean) => void;
  partnerTypeOptions: { value: string; label: string }[];
  supplierSegmentOptions: { value: string; label: string }[];
  isCodeInputReady: boolean;
  codePlaceholder: string;
  codeGuideText: string;
  onOpenCodeRuleModal: () => void;
};

export function PartnerBasicInfoSection({
  isNew,
  code,
  onCodeChange,
  name,
  onNameChange,
  countryCode,
  onCountryCodeChange,
  partnerType,
  onPartnerTypeChange,
  supplierSegment,
  onSupplierSegmentChange,
  businessRegistrationNo,
  onBusinessRegistrationNoChange,
  address,
  onAddressChange,
  memo,
  onMemoChange,
  isActive,
  onIsActiveChange,
  partnerTypeOptions,
  supplierSegmentOptions,
  isCodeInputReady,
  codePlaceholder,
  codeGuideText,
  onOpenCodeRuleModal,
}: PartnerBasicInfoSectionProps) {
  const handlePartnerTypeChange = (next: string) => {
    onPartnerTypeChange(next);
    if (next !== PARTNER_TYPE_SUPPLIER) {
      onSupplierSegmentChange("");
    }
  };

  return (
    <>
      <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 sm:col-span-2">
            <Label htmlFor="partner-partner-type" required>
              업체 유형
            </Label>
            <Select
              id="partner-partner-type"
              className="mt-1"
              value={partnerType}
              onChange={handlePartnerTypeChange}
              options={partnerTypeOptions}
              size="md"
            />
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              고객사(CUSTOMER) 또는 협력사(SUPPLIER)
            </p>
          </div>
          {partnerType === PARTNER_TYPE_SUPPLIER ? (
            <div className="min-w-0 sm:col-span-2 border-l-4 border-brand-500 pl-4">
              <Label htmlFor="partner-supplier-segment" required>
                협력사 부문
              </Label>
              <Select
                id="partner-supplier-segment"
                className="mt-1"
                value={supplierSegment}
                onChange={onSupplierSegmentChange}
                options={supplierSegmentOptions}
                size="md"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="partner-code" required>
            업체 코드
          </Label>
          <button
            type="button"
            onClick={onOpenCodeRuleModal}
            className="inline-flex items-center gap-1 text-theme-xs font-medium text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
            aria-label="업체 코드 규칙 보기"
          >
            <InformationCircleIcon className="h-4 w-4" aria-hidden />
            코드 조회
          </button>
        </div>
        <Input
          id="partner-code"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder={codePlaceholder}
          maxLength={2}
          className="mt-1"
          disabled={!isCodeInputReady}
        />
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          {codeGuideText}
        </p>
      </div>
      <div className="min-w-0">
        <Label htmlFor="partner-name" required>
          업체명
        </Label>
        <Input
          id="partner-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1"
        />
      </div>
      <div className="min-w-0">
        <FormField
          id="partner-form-country"
          label="업체 국가"
          required
          reserveHelpSpace
          control={
            <CountrySelect
              id="partner-form-country"
              label=""
              showLabel={false}
              value={countryCode}
              onChange={onCountryCodeChange}
            />
          }
        />
      </div>
      <div className="min-w-0">
        <FormField
          id="partner-address"
          label="주소"
          reserveHelpSpace
          control={
            <Input
              id="partner-address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="선택"
            />
          }
        />
      </div>
      <div className="min-w-0">
        <FormField
          id="partner-business-no"
          label="사업자등록번호"
          reserveHelpSpace
          control={
            <Input
              id="partner-business-no"
              value={businessRegistrationNo}
              onChange={(e) => onBusinessRegistrationNoChange(e.target.value)}
              placeholder="선택"
            />
          }
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="partner-memo">메모</Label>
        <TextArea
          id="partner-memo"
          value={memo}
          onChange={onMemoChange}
          rows={3}
          placeholder="선택"
        />
      </div>
      {!isNew ? (
        <div className="sm:col-span-2 flex items-center pt-1">
          <Toggle
            id="partner-active-toggle"
            checked={isActive}
            onChange={onIsActiveChange}
          />
        </div>
      ) : null}
    </>
  );
}

export function usePartnerCodeSlotRows(
  codeRulePartners: Partner[],
  selectedTypeCode: string,
  selectedSegmentCode: string
) {
  return useMemo(() => {
    const filteredPartners = codeRulePartners.filter((partner) => {
      const partnerTypeCode = String(partner.type ?? "")
        .trim()
        .toUpperCase();
      const partnerSegmentCode = String(
        partner.supplierSegmentCode ?? partner.supplierSegment ?? ""
      )
        .trim()
        .toUpperCase();
      const currentTypeCode = selectedTypeCode.toUpperCase();
      const currentSegmentCode = selectedSegmentCode.toUpperCase();

      if (partnerTypeCode !== currentTypeCode) return false;
      if (currentTypeCode === PARTNER_TYPE_SUPPLIER) {
        return partnerSegmentCode === currentSegmentCode;
      }
      return true;
    });

    const namesByCode = new Map<string, string[]>();
    filteredPartners.forEach((partner) => {
      const partnerCode = String(partner.code ?? "")
        .trim()
        .toUpperCase();
      if (!PARTNER_CODE_SLOT_CANDIDATES.includes(partnerCode)) return;
      const current = namesByCode.get(partnerCode) ?? [];
      current.push(String(partner.name ?? "").trim() || "(이름 없음)");
      namesByCode.set(partnerCode, current);
    });
    return PARTNER_CODE_SLOT_CANDIDATES.map((slotCode) => {
      const names = namesByCode.get(slotCode) ?? [];
      return {
        code: slotCode,
        names,
        label: names.length > 0 ? names.join(", ") : "-",
      };
    });
  }, [codeRulePartners, selectedSegmentCode, selectedTypeCode]);
}

export { PARTNER_CODE_REGEX };
