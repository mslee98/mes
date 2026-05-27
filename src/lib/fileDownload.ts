import { API_BASE } from "../api/apiBase";

interface DownloadFileWithAuthArgs {
  fileUrl: string;
  fileName: string;
  accessToken: string;
}

/** `/api` 같은 상대 base와 `http://host/api` 절대 base 모두 지원 */
export function resolveApiOrigin(apiBase: string): string {
  const base = String(apiBase ?? "").trim();
  if (!base) {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  if (/^https?:\/\//i.test(base)) {
    return new URL(base).origin;
  }
  if (typeof window === "undefined") {
    throw new Error("상대 API base URL은 브라우저 환경에서만 해석할 수 있습니다.");
  }
  return new URL(base, window.location.origin).origin;
}

export function buildApiFileUrl(filePath: string, apiBase: string): string {
  const raw = String(filePath ?? "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  const apiOrigin = resolveApiOrigin(apiBase);
  if (raw.startsWith("/")) return `${apiOrigin}${raw}`;
  return `${apiOrigin}/${raw}`;
}

/** 현재 앱 `API_BASE`로 첨부 다운로드 URL 조립 */
export function buildAppApiFileUrl(filePath: string): string {
  return buildApiFileUrl(filePath, API_BASE);
}

export async function downloadFileWithAuth({
  fileUrl,
  fileName,
  accessToken,
}: DownloadFileWithAuthArgs): Promise<void> {
  const res = await fetch(fileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("첨부파일 다운로드에 실패했습니다.");
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
