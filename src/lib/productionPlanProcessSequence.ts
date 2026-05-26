import type { CommonCodeItem } from "../api/commonCode";

/** 활성 공정 단계만 `sortOrder` 기준 오름차순 */
export function orderedUnitProcessSteps(codes: CommonCodeItem[]): CommonCodeItem[] {
  return [...codes]
    .filter((c) => c.isActive !== false)
    .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
}

/** `currentCode`가 표준 순서에서 몇 번째인지. 없으면 `-1` */
export function findProcessStepIndex(
  currentCode: string | null | undefined,
  ordered: CommonCodeItem[]
): number {
  const cur = String(currentCode ?? "").trim().toUpperCase();
  if (!cur || ordered.length === 0) return -1;
  return ordered.findIndex(
    (x) => String(x.code ?? "").trim().toUpperCase() === cur
  );
}

/**
 * 공통코드 `UNIT_PROCESS_STEP` 순서에서 `currentCode` 다음 단계.
 * 매칭 실패 시 `null`.
 */
export function nextProcessStepAfter(
  currentCode: string | null | undefined,
  codes: CommonCodeItem[]
): CommonCodeItem | null {
  const ordered = orderedUnitProcessSteps(codes);
  if (ordered.length === 0) return null;
  const cur = String(currentCode ?? "").trim().toUpperCase();
  if (!cur) return ordered[0] ?? null;
  const idx = ordered.findIndex(
    (x) => String(x.code ?? "").trim().toUpperCase() === cur
  );
  if (idx < 0) return null;
  return ordered[idx + 1] ?? null;
}
