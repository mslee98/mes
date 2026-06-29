import { useMemo } from "react";
import FormField from "../../../components/form/FormField";
import Input from "../../../components/form/input/InputField";
import SelectInput from "../../../components/form/SelectInput";
import { ReactComponent as MailLineIcon } from "../../../icons/mail-line.svg?react";
import {
  EMAIL_REGEX,
  isPartnerCountryCode,
  PHONE_COUNTRY_ROWS,
  formatPartnerNationalPhone,
  type PartnerCountryCode,
} from "../utils/phoneUtils";

type PartnerContactSectionProps = {
  contactPerson: string;
  onContactPersonChange: (v: string) => void;
  phoneCountryCode: PartnerCountryCode;
  onPhoneCountryCodeChange: (v: PartnerCountryCode) => void;
  phoneNational: string;
  onPhoneNationalChange: (v: string) => void;
  contactEmail: string;
  onContactEmailChange: (v: string) => void;
};

export function PartnerContactSection({
  contactPerson,
  onContactPersonChange,
  phoneCountryCode,
  onPhoneCountryCodeChange,
  phoneNational,
  onPhoneNationalChange,
  contactEmail,
  onContactEmailChange,
}: PartnerContactSectionProps) {
  const phoneSelectOptions = useMemo(
    () =>
      PHONE_COUNTRY_ROWS.map((row) => ({
        value: row.countryCode,
        label: row.labelLine,
        symbol: row.dial,
      })),
    []
  );

  const normalizedContactEmail = contactEmail.trim();
  const hasContactEmail = normalizedContactEmail.length > 0;
  const isValidContactEmail =
    !hasContactEmail || EMAIL_REGEX.test(normalizedContactEmail);
  const emailHint = hasContactEmail
    ? isValidContactEmail
      ? "올바른 이메일 형식입니다."
      : "이메일 형식이 올바르지 않습니다."
    : undefined;

  return (
    <>
      <div className="min-w-0">
        <FormField
          id="partner-contact-person"
          label="담당자명"
          reserveHelpSpace
          control={
            <Input
              id="partner-contact-person"
              value={contactPerson}
              onChange={(e) => onContactPersonChange(e.target.value)}
              placeholder="선택"
            />
          }
        />
      </div>

      <div className="min-w-0">
        <FormField
          id="partner-contact-email-input"
          label="담당자 이메일"
          reserveHelpSpace
          helpText={emailHint}
          control={
            <div className="relative">
              <span
                className="pointer-events-none absolute top-1/2 left-0 z-10 flex h-11 -translate-y-1/2 items-center border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400"
                aria-hidden
              >
                <MailLineIcon className="h-5 w-5 shrink-0 text-[#667085] dark:text-gray-400" />
              </span>
              <Input
                id="partner-contact-email-input"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => onContactEmailChange(e.target.value)}
                placeholder="info@gmail.com"
                className="pl-[62px]"
                error={hasContactEmail && !isValidContactEmail}
                success={hasContactEmail && isValidContactEmail}
              />
            </div>
          }
        />
      </div>

      <div className="min-w-0">
        <FormField
          id="partner-phone-input"
          label="담당자 연락처"
          reserveHelpSpace
          control={
            <div className="flex justify-start">
              <SelectInput
                id="partner-phone"
                size="md"
                selectOptions={phoneSelectOptions}
                selectValue={phoneCountryCode}
                onSelectChange={(v) => {
                  if (isPartnerCountryCode(v)) onPhoneCountryCodeChange(v);
                }}
                inputValue={phoneNational}
                onInputChange={(v) =>
                  onPhoneNationalChange(formatPartnerNationalPhone(v))
                }
                inputType="tel"
                inputTextAlign="left"
                inputPlaceholder="010-1234-5678"
                inputSuffix=""
                selectPlaceholder=""
                withShadow
                showDivider
                className="w-full"
                selectClassName="min-w-[8rem] max-w-[12rem] pl-3 pr-8"
              />
            </div>
          }
        />
      </div>
    </>
  );
}
