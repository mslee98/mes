export type ItemRow = {
  lineId?: number;
  productId: string;
  unitCode: string;
  qty: number;
  unitPrice: string;
  currencyCode: string;
  requestDeliveryDate: string;
  remark: string;
};

export type LensItemRow = {
  lineId?: number;
  lensId: string;
  unitCode: string;
  qty: number;
  unitPrice: string;
  currencyCode: string;
  requestDeliveryDate: string;
  remark: string;
};
