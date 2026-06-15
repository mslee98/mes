import { buildAppApiFileUrl } from "../../../lib/fileDownload";

export type NormalizedProcessAttachment = {
  key: string;
  label: string;
  downloadUrl: string;
  /** 서버 첨부에 있을 때만 */
  createdAt?: string;
};

function basenameFromPath(path: string): string {
  const trimmed = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const seg = trimmed.split("/").pop();
  return seg && seg.length > 0 ? seg : path;
}

function pickLabel(obj: Record<string, unknown>, pathHint: string): string {
  const name =
    (typeof obj.fileName === "string" && obj.fileName) ||
    (typeof obj.name === "string" && obj.name) ||
    (typeof obj.originalName === "string" && obj.originalName) ||
    (typeof obj.originalFileName === "string" && obj.originalFileName);
  if (name) return name;

  const file = obj.file;
  if (file && typeof file === "object") {
    const f = file as Record<string, unknown>;
    const fn =
      (typeof f.originalName === "string" && f.originalName) ||
      (typeof f.fileName === "string" && f.fileName) ||
      (typeof f.name === "string" && f.name);
    if (fn) return fn;
    const fp = typeof f.filePath === "string" ? f.filePath : "";
    if (fp) return basenameFromPath(fp);
  }

  if (pathHint) return basenameFromPath(pathHint);
  return "첨부";
}

function nonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function pickPath(obj: Record<string, unknown>): string | null {
  const direct =
    nonEmptyString(obj.filePath) ??
    nonEmptyString(obj.url) ??
    nonEmptyString(obj.downloadUrl) ??
    nonEmptyString(obj.path);
  if (direct) return direct;

  const file = obj.file;
  if (file && typeof file === "object") {
    const f = file as Record<string, unknown>;
    const nested =
      nonEmptyString(f.filePath) ?? nonEmptyString(f.url);
    if (nested) return nested;
  }

  return null;
}

function pickUploadedAt(obj: Record<string, unknown>): string | undefined {
  const t =
    nonEmptyString(obj.createdAt) ??
    nonEmptyString(obj.uploadedAt) ??
    nonEmptyString(obj.updatedAt);
  return t ?? undefined;
}

function pushOne(
  out: NormalizedProcessAttachment[],
  seen: Set<string>,
  label: string,
  rawPath: string,
  createdAt?: string
): void {
  const downloadUrl = buildAppApiFileUrl(rawPath);
  const key = `${downloadUrl}\0${label}\0${createdAt ?? ""}`;
  if (seen.has(key)) return;
  seen.add(key);
  const row: NormalizedProcessAttachment = { key, label, downloadUrl };
  if (createdAt) row.createdAt = createdAt;
  out.push(row);
}

/**
 * 공정 이력(process-records) 항목에서 첨부 목록을 추출합니다.
 * 백엔드 필드명이 `attachments` / `files` / `attachmentList` 등으로 달라질 수 있어 느슨하게 파싱합니다.
 */
export function normalizeUnitProcessRecordAttachments(
  record: Record<string, unknown>
): NormalizedProcessAttachment[] {
  const out: NormalizedProcessAttachment[] = [];
  const seen = new Set<string>();

  const lists = [record.attachments, record.attachmentList, record.files].filter(
    (v) => v != null
  );

  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string") {
        const p = item.trim();
        if (!p) continue;
        pushOne(out, seen, basenameFromPath(p), p, undefined);
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      const path = pickPath(obj);
      if (!path) continue;
      const label = pickLabel(obj, path);
      const uploadedAt = pickUploadedAt(obj);
      pushOne(out, seen, label, path, uploadedAt);
    }
  }

  return out;
}
