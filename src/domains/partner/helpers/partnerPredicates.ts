import type { Partner } from "../../../api/purchaseOrder";

export const PARTNER_TYPE_SUPPLIER = "SUPPLIER";
export const PARTNER_SUPPLIER_SEGMENT_OTHER = "OTHER";

function normalizedPartnerType(partner: Partner): string {
  return String(partner.type ?? "").trim().toUpperCase();
}

function normalizedSupplierSegment(partner: Partner): string {
  return String(partner.supplierSegmentCode ?? partner.supplierSegment ?? "")
    .trim()
    .toUpperCase();
}

export function isSupplierPartner(partner: Partner): boolean {
  return normalizedPartnerType(partner) === PARTNER_TYPE_SUPPLIER;
}

export function isSupplierSegmentPartner(
  partner: Partner,
  supplierSegmentCode: string
): boolean {
  return (
    isSupplierPartner(partner) &&
    normalizedSupplierSegment(partner) ===
      String(supplierSegmentCode).trim().toUpperCase()
  );
}

export function isOtherSupplierPartner(partner: Partner): boolean {
  return isSupplierSegmentPartner(partner, PARTNER_SUPPLIER_SEGMENT_OTHER);
}
