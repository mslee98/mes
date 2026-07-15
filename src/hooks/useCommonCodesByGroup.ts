import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getCommonCodesByGroup,
  type CommonCodeItem,
} from "../api/commonCode";

/**
 * 공통코드 그룹별 목록 — `queryKey: ["commonCodes", groupCode]` 통일.
 * 백엔드: 그룹 없음·활성 코드 0건 → `200` + `[]`. `data ?? []` 기본값이면 충분합니다.
 */
export function useCommonCodesByGroup(
  groupCode: string,
  accessToken: string | null | undefined,
  options?: { enabled?: boolean }
): UseQueryResult<CommonCodeItem[], Error> {
  const extraEnabled = options?.enabled ?? true;
  return useQuery({
    queryKey: ["commonCodes", groupCode],
    queryFn: () => getCommonCodesByGroup(groupCode, accessToken!),
    enabled: !!accessToken && extraEnabled,
  });
}
