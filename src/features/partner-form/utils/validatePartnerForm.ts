import { validateRequiredFields } from "../../../lib/formValidation";
import {
  buildPartnerCreatePayload,
  type PartnerFormFields,
} from "./buildPartnerPayload";
import type { PartnerCreatePayload } from "../../../api/purchaseOrder";
import {
  EMAIL_REGEX,
  isPartnerCountryCode,
  PARTNER_CODE_REGEX,
  PARTNER_TYPE_SUPPLIER,
  PHONE_NATIONAL_REGEX,
  phoneDialForCountry,
} from "./phoneUtils";

export type PartnerFormValidationResult =
  | { ok: true; payload: PartnerCreatePayload }
  | { ok: false };

export function validatePartnerForm(
  fields: PartnerFormFields,
  onError: (message: string) => void
): PartnerFormValidationResult {
  if (
    !validateRequiredFields(
      [{ value: fields.name, message: "업체명을 입력하세요." }],
      onError
    )
  ) {
    return { ok: false };
  }

  const cc = fields.countryCode.trim();
  if (!cc || !isPartnerCountryCode(cc)) {
    onError("국가를 선택하세요.");
    return { ok: false };
  }

  const pt = fields.partnerType.trim();
  if (
    !validateRequiredFields(
      [{ value: pt, message: "업체 유형(고객 유형)을 선택하세요." }],
      onError
    )
  ) {
    return { ok: false };
  }

  if (pt === PARTNER_TYPE_SUPPLIER) {
    const seg = fields.supplierSegment.trim();
    if (!seg) {
      onError("협력사 부문을 선택하세요.");
      return { ok: false };
    }
  }

  const normalizedCode = fields.code.trim().toUpperCase();
  if (!PARTNER_CODE_REGEX.test(normalizedCode)) {
    onError("업체 코드는 대문자 1~2자리만 가능합니다. (예: A, ZZ)");
    return { ok: false };
  }

  const phoneDialActive = phoneDialForCountry(fields.phoneCountryCode);
  const contactPhoneCombined =
    [phoneDialActive, fields.phoneNational.trim()].filter(Boolean).join(" ").trim() ||
    null;
  const phoneValue = fields.phoneNational.trim();

  if (phoneValue && !PHONE_NATIONAL_REGEX.test(phoneValue)) {
    onError(
      "담당자 연락처는 010-1234-5678 또는 042-123-4567 형식으로 입력하세요."
    );
    return { ok: false };
  }

  const emailValue = fields.contactEmail.trim();
  if (emailValue && !EMAIL_REGEX.test(emailValue)) {
    onError("담당자 이메일 형식이 올바르지 않습니다.");
    return { ok: false };
  }

  if (!contactPhoneCombined && !phoneValue) {
    // phone optional — validation only when filled
  }

  return {
    ok: true,
    payload: buildPartnerCreatePayload({
      ...fields,
      code: normalizedCode,
      countryCode: cc,
      partnerType: pt,
    }),
  };
}
