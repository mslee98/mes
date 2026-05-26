export type ItemRow = {
  lineId?: number;
  productId: string;
  /** 활성 렌즈 마스터 UUID. 빈 문자열이면 미지정 */
  lensId: string;
  /** 검출기 마스터 id — SearchableSelect value(문자열) */
  detectorId: string;
  /** UI 미노출 — API·응답 동기화용 */
  detectorElementCode: string;
  /** UI 미노출 — API·응답 동기화용 */
  wavelengthCode: string;
  unitCode: string;
  qty: number;
  unitPrice: string;
  currencyCode: string;
  requestDeliveryDate: string;
  remark: string;
};
