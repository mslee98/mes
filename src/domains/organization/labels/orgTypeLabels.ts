import type { CommonCodeItem } from "../../../api/commonCode";

/** 조직 유형 code → 공통코드 name 맵 (트리 노드 표시용) */
export function buildOrgTypeLabelMap(
  orgTypeCodes: CommonCodeItem[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of orgTypeCodes) {
    if (item.isActive === false) continue;
    map[item.code] = (item.name ?? "").trim() || item.code;
  }
  return map;
}
