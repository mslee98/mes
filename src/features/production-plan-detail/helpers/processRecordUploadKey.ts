export function processRecordUploadKey(
  unitId: string | null | undefined,
  recordId: string | number | null | undefined
): string {
  const uid = String(unitId ?? "").trim();
  const rid = String(recordId ?? "").trim();
  return uid && rid ? `${uid}:${rid}` : "";
}
