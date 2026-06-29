import {
  COMMON_CODE_GROUP_DELIVERY_PLAN_STATUS,
  COMMON_CODE_GROUP_DELIVERY_STATUS,
} from "../api/commonCode";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";
import { useCountryCodes } from "./useCountryCodes";

/** 납품·납품계획 화면 공통코드 묶음 */
export function useDeliveryCommonCodes(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { countryCodes } = useCountryCodes(accessToken, enabled);

  const deliveryStatus = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_STATUS,
    accessToken,
    { enabled }
  );
  const deliveryPlanStatus = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_PLAN_STATUS,
    accessToken,
    { enabled }
  );

  return {
    countryCodes,
    deliveryStatusCodes: deliveryStatus.data ?? [],
    deliveryPlanStatusCodes: deliveryPlanStatus.data ?? [],
    isDeliveryStatusLoading: deliveryStatus.isLoading,
    isDeliveryPlanStatusLoading: deliveryPlanStatus.isLoading,
  };
}
