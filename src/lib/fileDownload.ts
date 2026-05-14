interface DownloadFileWithAuthArgs {
  fileUrl: string;
  fileName: string;
  accessToken: string;
}

export function buildApiFileUrl(filePath: string, apiBase: string): string {
  const raw = String(filePath ?? "").trim();
  if (!raw) return "#";
  if (/^https?:\/\//i.test(raw)) return raw;
  const apiOrigin = new URL(apiBase).origin;
  if (raw.startsWith("/")) return `${apiOrigin}${raw}`;
  return `${apiOrigin}/${raw}`;
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
