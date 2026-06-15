import type { SearchableSelectOption } from "./SearchableSelectWithCreate";
import { partnerCountryFlagUrl } from "../../domains/partner/helpers/partnerCountryOptions";

export function renderPartnerOptionLabel(
  option: SearchableSelectOption
) {
  const flagUrl = option.countryCode
    ? partnerCountryFlagUrl(option.countryCode)
    : undefined;
  return (
    <div className="flex items-center gap-2">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : null}
      <span>{option.label}</span>
    </div>
  );
}
