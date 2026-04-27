import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_PARTNER_SUPPLIER_SEGMENT,
  COMMON_CODE_GROUP_PARTNER_TYPE,
} from "../api/commonCode";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";

export function usePartnerCommonCodes(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled }
  );
  const { data: partnerTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PARTNER_TYPE,
    accessToken,
    { enabled }
  );
  const { data: supplierSegmentCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PARTNER_SUPPLIER_SEGMENT,
    accessToken,
    { enabled }
  );

  return {
    countryCodes,
    partnerTypeCodes,
    supplierSegmentCodes,
  };
}
