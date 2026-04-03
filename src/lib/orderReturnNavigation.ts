/** 제품 상세로 보낼 때 붙이는 쿼리 — open redirect 방지를 위해 값은 숫자 발주 id만 사용 */

export const RETURN_ORDER_ID_QUERY_KEY = "returnOrderId";

/**
 * 납품 모달 → 제품 화면(정의 등록) 링크. `purchaseOrderId`가 없으면 쿼리 생략.
 */
export function productDetailHrefForDeliveryReturn(
  productId: number,
  purchaseOrderId: number
): string {
  const p = Number(productId);
  const o = Number(purchaseOrderId);
  if (!Number.isFinite(p) || p <= 0) return "/products";
  if (!Number.isFinite(o) || o <= 0) return `/products/${p}`;
  return `/products/${p}?${RETURN_ORDER_ID_QUERY_KEY}=${encodeURIComponent(String(o))}`;
}

/**
 * 발주 상세 경로만 반환 (`/order/:숫자`). 그 외는 null.
 */
export function safeReturnOrderPathFromSearchParams(
  params: URLSearchParams
): `/order/${number}` | null {
  const raw = params.get(RETURN_ORDER_ID_QUERY_KEY)?.trim() ?? "";
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `/order/${n}`;
}
