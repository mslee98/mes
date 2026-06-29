import { COMMON_CODE_GROUP_COUNTRY } from "../api/commonCode";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";

/** 국가(COUNTRY) 공통코드 — 거래처·납품·생산 등 여러 화면에서 공유 */
export function useCountryCodes(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled }
  );

  return { countryCodes };
}
