import { COMMON_CODE_GROUP_DETECTOR_TYPE } from "../api/commonCode";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";
import { useCountryCodes } from "./useCountryCodes";

/** 검출기·제품 마스터 화면 공통코드 묶음 */
export function useProductCommonCodes(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { countryCodes } = useCountryCodes(accessToken, enabled);

  const { data: detectorTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DETECTOR_TYPE,
    accessToken,
    { enabled }
  );

  return {
    countryCodes,
    detectorTypeCodes,
  };
}
