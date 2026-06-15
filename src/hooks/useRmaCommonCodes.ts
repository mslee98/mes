import { useMemo } from "react";
import { useCommonCodesByGroup } from "./useCommonCodesByGroup";
import {
  COMMON_CODE_GROUP_RMA_ACTION_RESULT,
  COMMON_CODE_GROUP_RMA_ACTION_TYPE,
  COMMON_CODE_GROUP_RMA_AS_TYPE,
  COMMON_CODE_GROUP_RMA_CATEGORY,
  COMMON_CODE_GROUP_RMA_COMPONENT_TYPE,
  COMMON_CODE_GROUP_RMA_RETURN_STATUS,
  COMMON_CODE_GROUP_RMA_RETURN_TYPE,
  COMMON_CODE_GROUP_RMA_STATUS,
  COMMON_CODE_GROUP_RMA_SYMPTOM,
} from "../api/commonCode";

/** RMA 화면 공통코드 9개 그룹 일괄 조회 */
export function useRmaCommonCodes(
  accessToken: string | null | undefined,
  enabled = true
) {
  const opts = { enabled: !!accessToken && enabled };

  const status = useCommonCodesByGroup(COMMON_CODE_GROUP_RMA_STATUS, accessToken, opts);
  const category = useCommonCodesByGroup(COMMON_CODE_GROUP_RMA_CATEGORY, accessToken, opts);
  const symptom = useCommonCodesByGroup(COMMON_CODE_GROUP_RMA_SYMPTOM, accessToken, opts);
  const asType = useCommonCodesByGroup(COMMON_CODE_GROUP_RMA_AS_TYPE, accessToken, opts);
  const actionType = useCommonCodesByGroup(COMMON_CODE_GROUP_RMA_ACTION_TYPE, accessToken, opts);
  const componentType = useCommonCodesByGroup(
    COMMON_CODE_GROUP_RMA_COMPONENT_TYPE,
    accessToken,
    opts
  );
  const returnStatus = useCommonCodesByGroup(
    COMMON_CODE_GROUP_RMA_RETURN_STATUS,
    accessToken,
    opts
  );
  const returnType = useCommonCodesByGroup(COMMON_CODE_GROUP_RMA_RETURN_TYPE, accessToken, opts);
  const actionResult = useCommonCodesByGroup(
    COMMON_CODE_GROUP_RMA_ACTION_RESULT,
    accessToken,
    opts
  );

  const isLoading = useMemo(
    () =>
      status.isLoading ||
      category.isLoading ||
      symptom.isLoading ||
      asType.isLoading ||
      actionType.isLoading ||
      componentType.isLoading ||
      returnStatus.isLoading ||
      returnType.isLoading ||
      actionResult.isLoading,
    [
      status.isLoading,
      category.isLoading,
      symptom.isLoading,
      asType.isLoading,
      actionType.isLoading,
      componentType.isLoading,
      returnStatus.isLoading,
      returnType.isLoading,
      actionResult.isLoading,
    ]
  );

  return {
    rmaStatusCodes: status.data ?? [],
    rmaCategoryCodes: category.data ?? [],
    rmaSymptomCodes: symptom.data ?? [],
    rmaAsTypeCodes: asType.data ?? [],
    rmaActionTypeCodes: actionType.data ?? [],
    rmaComponentTypeCodes: componentType.data ?? [],
    rmaReturnStatusCodes: returnStatus.data ?? [],
    rmaReturnTypeCodes: returnType.data ?? [],
    rmaActionResultCodes: actionResult.data ?? [],
    isLoading,
  };
}
