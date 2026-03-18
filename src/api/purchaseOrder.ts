import { createApiError } from "../lib/apiError";
import { API_BASE } from "./apiBase";

function authHeaders(accessToken: string): HeadersInit {
  return { Authorization: `Bearer ${accessToken}` };
}

function jsonHeaders(accessToken: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...authHeaders(accessToken),
  };
}

// --- 타입 정의 (API 문서 기준) ---

export interface Partner {
  id: number;
  code: string;
  name: string;
  type?: string;
  contact?: string;
  address?: string;
  isActive?: boolean;
}

export interface Item {
  id: number;
  code: string;
  name: string;
  spec?: string;
  unit?: string;
  type?: string;
  isActive?: boolean;
}

export interface PurchaseOrderItemPayload {
  itemId: number;
  qty: number;
  unitPrice: number;
  currencyCode?: string | null;
  requestDeliveryDate?: string | null;
  remark?: string | null;
}

export interface PurchaseOrderCreatePayload {
  title: string;
  partnerId: number;
  orderDate: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  items: PurchaseOrderItemPayload[];
}

export interface PurchaseOrderUpdatePayload {
  title?: string;
  partnerId?: number;
  orderDate?: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  requestDeliveryDate?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
}

export interface PurchaseOrderListItem {
  id: number;
  orderNo: string;
  title: string;
  partnerId: number;
  partner?: Partner;
  orderDate: string;
  currencyCode?: string | null;
  dueDate?: string | null;
  orderStatus?: string;
  approvalStatus?: string;
  progressStatus?: string;
  totalQty?: number;
  totalAmount?: number;
  createdAt?: string;
}

export interface PurchaseOrderItem {
  id: number;
  itemId: number;
  item?: Item;
  itemName?: string;
  spec?: string;
  unit?: string;
  qty: number;
  unitPrice: number;
  amount?: number;
  currencyCode?: string | null;
  deliveredQty?: number;
  requestDeliveryDate?: string | null;
  remark?: string | null;
}

export interface PurchaseOrderDetail extends PurchaseOrderListItem {
  requestDeliveryDate?: string | null;
  vendorOrderNo?: string | null;
  vendorRequest?: string | null;
  specialNote?: string | null;
  createdBy?: { id?: number; name?: string };
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderFile {
  id: number;
  purchaseOrderId: number;
  fileName: string;
  filePath: string;
  fileType?: string;
  fileSize?: number;
  uploadedById?: number;
  uploadedAt?: string;
}

export interface PurchaseOrderApproval {
  id: number;
  approvalStep?: number;
  approverId: number;
  approver?: { id?: number; name?: string };
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "WAITING";
  approvalComment?: string | null;
  approvedAt?: string | null;
}

export interface PurchaseOrderHistory {
  id: number;
  changeType?: string;
  beforeValue?: string | null;
  afterValue?: string | null;
  changedBy?: { id?: number; name?: string };
  changedAt?: string;
}

export interface DeliveryItemPayload {
  purchaseOrderItemId: number;
  itemId: number;
  deliveryQty: number;
  lotNo?: string | null;
  remark?: string | null;
}

export interface DeliveryCreatePayload {
  deliveryDate: string;
  remark?: string | null;
  items: DeliveryItemPayload[];
}

export interface DeliveryItem {
  purchaseOrderItemId?: number;
  itemId?: number;
  itemName?: string;
  deliveryQty?: number;
  lotNo?: string | null;
  remark?: string | null;
}

export interface Delivery {
  id: number;
  deliveryNo?: string;
  partnerId?: number;
  partner?: Partner;
  deliveryDate: string;
  status?: string;
  remark?: string | null;
  items?: DeliveryItem[];
}

// --- 목록/상세/CRUD ---

export interface PurchaseOrderListParams {
  partnerId?: number;
  orderStatus?: string;
  approvalStatus?: string;
}

export async function getPurchaseOrders(
  accessToken: string,
  params?: PurchaseOrderListParams
): Promise<PurchaseOrderListItem[]> {
  const q = new URLSearchParams();
  if (params?.partnerId != null) q.set("partnerId", String(params.partnerId));
  if (params?.orderStatus) q.set("orderStatus", params.orderStatus);
  if (params?.approvalStatus) q.set("approvalStatus", params.approvalStatus);
  const query = q.toString();
  const url = query ? `${API_BASE}/purchase-orders?${query}` : `${API_BASE}/purchase-orders`;
  const res = await fetch(url, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function getPurchaseOrder(
  id: number,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 상세를 불러오지 못했습니다.");
  }
  return res.json();
}

export async function createPurchaseOrder(
  payload: PurchaseOrderCreatePayload,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetch(`${API_BASE}/purchase-orders`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주를 등록하지 못했습니다.");
  }
  return res.json();
}

export async function updatePurchaseOrder(
  id: number,
  payload: PurchaseOrderUpdatePayload,
  accessToken: string
): Promise<PurchaseOrderDetail> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}`, {
    method: "PUT",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주를 수정하지 못했습니다.");
  }
  return res.json();
}

// --- 품목 ---

export async function getPurchaseOrderItems(
  id: number,
  accessToken: string
): Promise<PurchaseOrderItem[]> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/items`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "발주 품목을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

// --- 첨부파일 ---

export async function uploadPurchaseOrderFile(
  id: number,
  file: File,
  accessToken: string
): Promise<PurchaseOrderFile> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/files`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "파일을 업로드하지 못했습니다.");
  }
  return res.json();
}

export async function getPurchaseOrderFiles(
  id: number,
  accessToken: string
): Promise<PurchaseOrderFile[]> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/files`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "첨부파일 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

// --- 결재 ---

export async function getPurchaseOrderApprovals(
  id: number,
  accessToken: string
): Promise<PurchaseOrderApproval[]> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/approvals`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "결재 라인을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function submitPurchaseOrderApproval(
  id: number,
  approverIds: number[],
  accessToken: string
): Promise<unknown> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/submit-approval`, {
    method: "POST",
    headers: jsonHeaders(accessToken),
    body: JSON.stringify({ approverIds }),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "상신하지 못했습니다.");
  }
  return res.json().catch(() => ({}));
}

export async function approvePurchaseOrderApproval(
  approvalId: number,
  comment: string | null,
  accessToken: string
): Promise<unknown> {
  const res = await fetch(
    `${API_BASE}/purchase-order-approvals/${approvalId}/approve`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(comment != null ? { comment } : {}),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "승인 처리하지 못했습니다.");
  }
  return res.json().catch(() => ({}));
}

export async function rejectPurchaseOrderApproval(
  approvalId: number,
  comment: string,
  accessToken: string
): Promise<unknown> {
  const res = await fetch(
    `${API_BASE}/purchase-order-approvals/${approvalId}/reject`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify({ comment }),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "반려 처리하지 못했습니다.");
  }
  return res.json().catch(() => ({}));
}

// --- 이력 ---

export async function getPurchaseOrderHistories(
  id: number,
  accessToken: string
): Promise<PurchaseOrderHistory[]> {
  const res = await fetch(`${API_BASE}/purchase-orders/${id}/histories`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "변경 이력을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

// --- 납품 ---

export async function createDelivery(
  purchaseOrderId: number,
  payload: DeliveryCreatePayload,
  accessToken: string
): Promise<Delivery> {
  const res = await fetch(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries`,
    {
      method: "POST",
      headers: jsonHeaders(accessToken),
      body: JSON.stringify(payload),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "납품을 등록하지 못했습니다.");
  }
  return res.json();
}

export async function getDeliveries(
  purchaseOrderId: number,
  accessToken: string
): Promise<Delivery[]> {
  const res = await fetch(
    `${API_BASE}/purchase-orders/${purchaseOrderId}/deliveries`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "납품 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

// --- 거래처·품목·공통코드 (드롭다운용, 문서상 인증 없음 가능성 있음) ---

export async function getPartners(accessToken: string): Promise<Partner[]> {
  const res = await fetch(`${API_BASE}/partners`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "거래처 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export async function getItems(accessToken: string): Promise<Item[]> {
  const res = await fetch(`${API_BASE}/items`, {
    headers: authHeaders(accessToken),
    credentials: "include",
  });
  if (!res.ok) {
    throw await createApiError(res, "품목 목록을 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}

export interface CodeItem {
  id: number;
  groupCode: string;
  code: string;
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export async function getCodeGroupCodes(
  groupCode: string,
  accessToken: string
): Promise<CodeItem[]> {
  const res = await fetch(
    `${API_BASE}/code-groups/${encodeURIComponent(groupCode)}/codes`,
    {
      headers: authHeaders(accessToken),
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw await createApiError(res, "공통코드를 불러오지 못했습니다.");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data?.data ?? [];
}
