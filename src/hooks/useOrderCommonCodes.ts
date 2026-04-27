import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
} from "../api/commonCode";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";

export function useOrderCommonCodes(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled }
  );
  const { data: currencyCodes = [] } = useCommonCodesByGroup(
    "CURRENCY",
    accessToken,
    { enabled }
  );
  const { data: unitCodes = [] } = useCommonCodesByGroup("UNIT", accessToken, {
    enabled,
  });
  const { data: purchaseOrderTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
    accessToken,
    { enabled }
  );
  const { data: purchaseOrderStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
    accessToken,
    { enabled }
  );

  return {
    countryCodes,
    currencyCodes,
    unitCodes,
    purchaseOrderTypeCodes,
    purchaseOrderStatusCodes,
  };
}
