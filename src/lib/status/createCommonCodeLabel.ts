import type { CommonCodeItem } from "../../api/commonCode";
import { labelForCommonCode } from "../../api/commonCode";

/** 공통코드 name → fallback map → raw code 순으로 status 라벨 반환 */
export function createStatusLabelFn(fallback: Record<string, string>) {
  return function labelForStatus(
    statusCodes: CommonCodeItem[],
    status?: string | null
  ): string {
    const code = String(status ?? "").trim();
    if (!code) return "—";
    const fromApi = labelForCommonCode(statusCodes, code);
    if (fromApi !== code) return fromApi;
    return fallback[code.toUpperCase()] ?? code;
  };
}
