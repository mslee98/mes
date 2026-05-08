export type ItemRow = {
  lineId?: number;
  productId: string;
  /** 활성 렌즈 마스터 UUID. 빈 문자열이면 미지정 */
  lensId: string;
  unitCode: string;
  qty: number;
  unitPrice: string;
  currencyCode: string;
  requestDeliveryDate: string;
  remark: string;
};
