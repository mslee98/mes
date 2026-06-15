import type { CommonCodeItem } from "../../../api/commonCode";
import type { Partner } from "../../../api/purchaseOrder";
import type { SearchableSelectOption } from "../../../components/form/SearchableSelectWithCreate";
import { partnerSelectLabel } from "../display/partnerDisplay";

export function toPartnerSearchableSelectOptions(
  partners: Partner[],
  countryCodes: CommonCodeItem[]
): SearchableSelectOption[] {
  return partners.map((partner) => ({
    value: String(partner.id),
    label: partnerSelectLabel(partner, countryCodes),
    countryCode: String(partner.countryCode ?? "").trim().toUpperCase(),
  }));
}

export function toPartnerSelectOptions(
  partners: Partner[],
  countryCodes: CommonCodeItem[]
): { value: string; label: string }[] {
  return toPartnerSearchableSelectOptions(partners, countryCodes).map((option) => ({
    value: option.value,
    label: option.label,
  }));
}
