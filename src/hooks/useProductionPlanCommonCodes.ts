import {
  COMMON_CODE_GROUP_PRODUCTION_PLAN_STATUS,
  COMMON_CODE_GROUP_UNIT_PROCESS_STATUS,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
} from "../api/commonCode";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";
import { useCountryCodes } from "./useCountryCodes";

/** 생산계획·유닛 공정 화면 공통코드 묶음 */
export function useProductionPlanCommonCodes(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { countryCodes } = useCountryCodes(accessToken, enabled);

  const { data: productionPlanStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PRODUCTION_PLAN_STATUS,
    accessToken,
    { enabled }
  );
  const { data: unitProcessStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled }
  );
  const { data: unitProcessStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STATUS,
    accessToken,
    { enabled }
  );

  return {
    countryCodes,
    productionPlanStatusCodes,
    unitProcessStepCodes,
    unitProcessStatusCodes,
  };
}
