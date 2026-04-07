import type {
  Delivery,
  DeliveryActorUserRef,
  DeliveryOrderWithDetail,
} from "../api/purchaseOrder";
import type { CommonCodeItem } from "../api/commonCode";

export type DeliveryDetailUnknownRecord = Record<string, unknown>;

export function asDeliveryDetailRecord(
  v: unknown
): DeliveryDetailUnknownRecord | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as DeliveryDetailUnknownRecord)
    : null;
}

export function pickOrderItemsFromDeliveryOrder(
  order: DeliveryOrderWithDetail | undefined
): unknown[] {
  if (!order) return [];
  const raw = order.orderItems;
  if (Array.isArray(raw)) return raw;
  const o = order as DeliveryDetailUnknownRecord;
  const alt = o.order_items;
  return Array.isArray(alt) ? alt : [];
}

export function pickNestedOrderItemFromLine(
  line: unknown
): DeliveryDetailUnknownRecord | null {
  const r = asDeliveryDetailRecord(line);
  if (!r) return null;
  return asDeliveryDetailRecord(r.orderItem) ?? asDeliveryDetailRecord(r.order_item);
}

export function resolveOrderItemForDeliveryLine(
  line: unknown,
  order: DeliveryOrderWithDetail | undefined
): DeliveryDetailUnknownRecord | null {
  const direct = pickNestedOrderItemFromLine(line);
  if (direct) return direct;
  const r = asDeliveryDetailRecord(line);
  if (!r) return null;
  const idRaw = r?.orderItemId ?? r?.order_item_id ?? r?.purchaseOrderItemId;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isFinite(id)) return null;
  for (const row of pickOrderItemsFromDeliveryOrder(order)) {
    const o = asDeliveryDetailRecord(row);
    if (!o) continue;
    const oid = o.id;
    const n = typeof oid === "number" ? oid : Number(oid);
    if (n === id) return o;
  }
  return null;
}

export function parseDeliveryDetailNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function formatQtyDisplayForDelivery(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  if (!s) return "—";
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? s : "—";
}

export function productNameFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): string {
  if (!oi) return "";
  const snap =
    typeof oi.productNameSnapshot === "string"
      ? oi.productNameSnapshot.trim()
      : "";
  if (snap) return snap;
  const p = asDeliveryDetailRecord(oi.product);
  const pn =
    (typeof p?.productName === "string" && p.productName.trim()) ||
    (typeof p?.name === "string" && p.name.trim()) ||
    "";
  if (pn) return pn;
  const legacy = typeof oi.itemName === "string" ? oi.itemName.trim() : "";
  return legacy;
}

export function productCodeFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): string {
  if (!oi) return "";
  const p = asDeliveryDetailRecord(oi.product);
  const c =
    (typeof p?.productCode === "string" && p.productCode.trim()) ||
    (typeof p?.code === "string" && p.code.trim()) ||
    "";
  return c;
}

export function definitionLabelFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): string {
  if (!oi) return "—";
  const dSnap =
    typeof oi.definitionNameSnapshot === "string"
      ? oi.definitionNameSnapshot.trim()
      : "";
  const vSnap =
    typeof oi.versionSnapshot === "string" ? oi.versionSnapshot.trim() : "";
  const def = asDeliveryDetailRecord(oi.productDefinition);
  const dName =
    dSnap ||
    (typeof def?.definitionName === "string" && def.definitionName.trim()) ||
    (typeof def?.name === "string" && def.name.trim()) ||
    "";
  const v =
    vSnap ||
    (def?.versionNo != null ? String(def.versionNo) : "") ||
    (typeof def?.version === "string" ? def.version : "") ||
    "";
  if (!dName && !v) return "—";
  if (dName && v) return `${dName} · v${v}`;
  return dName || `v${v}`;
}

export function unitCodeFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): string | undefined {
  if (!oi) return undefined;
  const u =
    (typeof oi.quantityUnitCode === "string" && oi.quantityUnitCode.trim()) ||
    (typeof oi.unit === "string" && oi.unit.trim()) ||
    undefined;
  return u;
}

export function orderLineQtyFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): number | undefined {
  if (!oi) return undefined;
  return parseDeliveryDetailNum(oi.quantity ?? oi.qty);
}

export function unitPriceFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): number | undefined {
  if (!oi) return undefined;
  return parseDeliveryDetailNum(oi.unitPrice);
}

export function currencyFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): string | undefined {
  if (!oi) return undefined;
  const c = oi.currencyCode;
  return typeof c === "string" && c.trim() ? c.trim() : undefined;
}

export function lineNoteFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): string {
  if (!oi) return "";
  const n =
    typeof oi.note === "string"
      ? oi.note
      : typeof oi.remark === "string"
        ? oi.remark
        : "";
  return n.trim();
}

export function productDefinitionIdFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): number {
  if (!oi) return 0;
  const def = asDeliveryDetailRecord(oi.productDefinition);
  const raw =
    oi.productDefinitionId ??
    oi.definitionId ??
    def?.id ??
    oi.product_definition_id;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function productIdFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): number {
  if (!oi) return 0;
  const p = asDeliveryDetailRecord(oi.product);
  const raw = oi.productId ?? p?.id ?? oi.product_id;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function housingTemplateInfoFromOrderItem(
  oi: DeliveryDetailUnknownRecord | null
): { id: number; label: string } | null {
  if (!oi) return null;
  const def = asDeliveryDetailRecord(oi.productDefinition);
  const idRaw =
    def?.housingTemplateId ??
    def?.housing_template_id ??
    oi.housingTemplateId ??
    oi.housing_template_id;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return null;
  const code =
    (typeof def?.housingTemplateCode === "string" &&
      def.housingTemplateCode.trim()) ||
    (typeof def?.housing_template_code === "string" &&
      def.housing_template_code.trim()) ||
    "";
  const name =
    (typeof def?.housingTemplateName === "string" &&
      def.housingTemplateName.trim()) ||
    (typeof def?.housing_template_name === "string" &&
      def.housing_template_name.trim()) ||
    "";
  const label =
    name && code && name !== code
      ? `${name} (${code})`
      : name || code || `템플릿 #${id}`;
  return { id, label };
}

export function formatDeliveryLineQty(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  return s || "—";
}

export function deliveryDetailUserDisplayName(
  u: DeliveryActorUserRef | null | undefined
): string {
  if (!u) return "—";
  const name = typeof u.name === "string" ? u.name.trim() : "";
  if (name) return name;
  const en = u.employeeNo;
  if (en != null && String(en).trim()) return `사번 ${en}`;
  return "—";
}

export function formatDeliveryDetailDateYmd(s: string | null | undefined): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "-";
  const head = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1];
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return raw;
}

export function formatDeliveryDetailDate(s: string | null | undefined): string {
  return formatDeliveryDetailDateYmd(s);
}

export function formatDeliveryDetailDateTimeKo(
  s: string | null | undefined
): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }
  return raw;
}

export function deliveryLinesFromDelivery(d: Delivery) {
  return d.deliveryItems ?? d.items ?? [];
}

const DELIVERY_STATUS_SIM_PREFIX = "deliveryStatusSim";

export function deliveryStatusSimStorageKey(deliveryId: number): string {
  return `${DELIVERY_STATUS_SIM_PREFIX}:${deliveryId}`;
}

export function labelForSortedDeliveryStatus(
  sortedCodes: CommonCodeItem[],
  code: string | undefined | null
): string {
  const c = String(code ?? "").trim();
  if (!c) return "미지정";
  const hit = sortedCodes.find((x) => x.code === c);
  return (hit?.name ?? "").trim() || c;
}
