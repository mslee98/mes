import type {
  PartnerCreatePayload,
  PartnerUpdatePayload,
} from "../../../api/purchaseOrder";
import {
  PARTNER_TYPE_SUPPLIER,
  phoneDialForCountry,
  type PartnerCountryCode,
} from "./phoneUtils";

export type PartnerFormFields = {
  code: string;
  name: string;
  countryCode: string;
  partnerType: string;
  supplierSegment: string;
  businessRegistrationNo: string;
  contactPerson: string;
  phoneCountryCode: PartnerCountryCode;
  phoneNational: string;
  contactEmail: string;
  address: string;
  memo: string;
  isActive: boolean;
};

export function buildPartnerCreatePayload(
  fields: PartnerFormFields
): PartnerCreatePayload {
  const pt = fields.partnerType.trim();
  const phoneDialActive = phoneDialForCountry(fields.phoneCountryCode);
  const contactPhoneCombined =
    [phoneDialActive, fields.phoneNational.trim()].filter(Boolean).join(" ").trim() ||
    null;
  const contactCombined =
    [fields.contactPerson.trim(), contactPhoneCombined ?? ""]
      .filter((v) => String(v).trim() !== "")
      .join(" ")
      .trim() || null;

  return {
    code: fields.code.trim().toUpperCase(),
    name: fields.name.trim(),
    defenseMarket: "CIVILIAN",
    countryCode: fields.countryCode.trim(),
    type: pt,
    supplierSegmentCode:
      pt === PARTNER_TYPE_SUPPLIER ? fields.supplierSegment.trim() : null,
    supplierSegment:
      pt === PARTNER_TYPE_SUPPLIER ? fields.supplierSegment.trim() : null,
    businessRegistrationNo: fields.businessRegistrationNo.trim() || null,
    contactPerson: fields.contactPerson.trim() || null,
    contactPhone: contactPhoneCombined,
    contactEmail: fields.contactEmail.trim() || null,
    contact: contactCombined,
    address: fields.address.trim() || null,
    memo: fields.memo.trim() || null,
  };
}

export function buildPartnerUpdatePayload(
  fields: PartnerFormFields
): PartnerUpdatePayload {
  return {
    ...buildPartnerCreatePayload(fields),
    isActive: fields.isActive,
  };
}
