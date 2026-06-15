import { compactYmd } from "./dateFormat";

/** UI·툴팁용 시리얼 패턴 설명 (년도코드 1자) */
export const LT_SERIAL_PATTERN_DESCRIPTION =
  "LT-yyyyMMdd-년도코드1자+업체코드+일련번호(0001)";

export function ltSerialSequenceKey(
  deliveryDate: string,
  yearCode: string,
  partnerCode: string
): string {
  const ymd = compactYmd(deliveryDate) || "";
  const year = String(yearCode ?? "").trim().toUpperCase();
  const partner = String(partnerCode ?? "").trim().toUpperCase();
  return `LT-${ymd}-${year}${partner}`;
}

export function buildLtSerialNo(opts: {
  deliveryDate: string;
  yearCode: string;
  partnerCode: string;
  sequenceNo: number;
}): string {
  const ymd =
    compactYmd(opts.deliveryDate) ||
    compactYmd(new Date().toISOString().slice(0, 10)) ||
    "";
  const year = String(opts.yearCode ?? "").trim().toUpperCase();
  const partner = String(opts.partnerCode ?? "").trim().toUpperCase();
  const seq = String(Math.max(1, Math.trunc(opts.sequenceNo))).padStart(4, "0");
  return `LT-${ymd}-${year}${partner}${seq}`;
}

export function ltSerialExample(
  deliveryDate: string,
  yearCode: string,
  partnerCode: string
): string {
  return buildLtSerialNo({
    deliveryDate,
    yearCode,
    partnerCode,
    sequenceNo: 1,
  });
}
