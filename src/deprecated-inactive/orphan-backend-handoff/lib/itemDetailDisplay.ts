import { REVISION_STATUS_OPTIONS } from "../api/itemMaster";

export function formatItemDetailDt(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ko-KR");
}

export function revisionStatusLabel(
  apiCodes: { code: string; name?: string; isActive?: boolean }[],
  statusCode: string
): string {
  const c = String(statusCode ?? "").trim();
  if (!c) return "—";
  if (apiCodes.length) {
    const hit = apiCodes.find(
      (x) => x.code === c && x.isActive !== false
    );
    const name = (hit?.name ?? "").trim();
    if (name) return name;
  }
  const fb = REVISION_STATUS_OPTIONS.find((o) => o.value === c.toUpperCase());
  return fb?.label ?? c;
}
