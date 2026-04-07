import { Fragment, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import {
  getDeliveryById,
  type Delivery,
  type DeliveryActorUserRef,
  type DeliveryOrderWithDetail,
  type Partner,
} from "../api/purchaseOrder";
import { DeliverySummaryStepper } from "../components/delivery/DeliverySummaryStepper";
import { DeliveryPlanApprovalDemoPanel } from "../components/delivery/DeliveryPlanApprovalDemoPanel";
import {
  buildDeliveryStepperDetailsFromCodes,
  computeDeliveryStatusCompletedCount,
  deliveryStatusIndexInSorted,
  sortDeliveryStatusCodes,
} from "../components/delivery/deliveryStepperUtils";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  labelForCommonCode,
  type CommonCodeItem,
} from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { formatCurrency } from "../lib/formatCurrency";
import {
  getProductDefinition,
  type ProductDefinitionDetailDto,
  type DefinitionItemRevisionLineDto,
} from "../api/products";
import { getHousingTemplate, type HousingTemplate } from "../api/housingTemplates";
import SegmentedControl from "../components/common/SegmentedControl";

const COMMON_CODE_GROUP_UNIT = "UNIT";

type DeliveryDetailTab = "overview" | "lines" | "order" | "misc";

const DELIVERY_DETAIL_TAB_OPTIONS: { value: DeliveryDetailTab; label: string }[] = [
  { value: "overview", label: "개요" },
  { value: "lines", label: "납품 품목" },
  { value: "order", label: "발주 연동" },
  { value: "misc", label: "진행·기타" },
];

type UnknownRecord = Record<string, unknown>;

function asRecord(v: unknown): UnknownRecord | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as UnknownRecord) : null;
}

function pickOrderItems(order: DeliveryOrderWithDetail | undefined): unknown[] {
  if (!order) return [];
  const raw = order.orderItems;
  if (Array.isArray(raw)) return raw;
  const o = order as UnknownRecord;
  const alt = o.order_items;
  return Array.isArray(alt) ? alt : [];
}

function pickNestedOrderItemFromLine(line: unknown): UnknownRecord | null {
  const r = asRecord(line);
  if (!r) return null;
  return asRecord(r.orderItem) ?? asRecord(r.order_item);
}

function resolveOrderItemForLine(
  line: unknown,
  order: DeliveryOrderWithDetail | undefined
): UnknownRecord | null {
  const direct = pickNestedOrderItemFromLine(line);
  if (direct) return direct;
  const r = asRecord(line);
  const idRaw = r?.orderItemId ?? r?.order_item_id ?? r?.purchaseOrderItemId;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isFinite(id)) return null;
  for (const row of pickOrderItems(order)) {
    const o = asRecord(row);
    if (!o) continue;
    const oid = o.id;
    const n = typeof oid === "number" ? oid : Number(oid);
    if (n === id) return o;
  }
  return null;
}

function parseNum(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function formatQtyDisplay(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  if (!s) return "—";
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? s : "—";
}

function productNameFromOrderItem(oi: UnknownRecord | null): string {
  if (!oi) return "";
  const snap = typeof oi.productNameSnapshot === "string" ? oi.productNameSnapshot.trim() : "";
  if (snap) return snap;
  const p = asRecord(oi.product);
  const pn =
    (typeof p?.productName === "string" && p.productName.trim()) ||
    (typeof p?.name === "string" && p.name.trim()) ||
    "";
  if (pn) return pn;
  const legacy = typeof oi.itemName === "string" ? oi.itemName.trim() : "";
  return legacy;
}

function productCodeFromOrderItem(oi: UnknownRecord | null): string {
  if (!oi) return "";
  const p = asRecord(oi.product);
  const c =
    (typeof p?.productCode === "string" && p.productCode.trim()) ||
    (typeof p?.code === "string" && p.code.trim()) ||
    "";
  return c;
}

function definitionLabelFromOrderItem(oi: UnknownRecord | null): string {
  if (!oi) return "—";
  const dSnap = typeof oi.definitionNameSnapshot === "string" ? oi.definitionNameSnapshot.trim() : "";
  const vSnap = typeof oi.versionSnapshot === "string" ? oi.versionSnapshot.trim() : "";
  const def = asRecord(oi.productDefinition);
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

function unitCodeFromOrderItem(oi: UnknownRecord | null): string | undefined {
  if (!oi) return undefined;
  const u =
    (typeof oi.quantityUnitCode === "string" && oi.quantityUnitCode.trim()) ||
    (typeof oi.unit === "string" && oi.unit.trim()) ||
    undefined;
  return u;
}

function orderLineQty(oi: UnknownRecord | null): number | undefined {
  if (!oi) return undefined;
  return parseNum(oi.quantity ?? oi.qty);
}

function unitPriceFromOrderItem(oi: UnknownRecord | null): number | undefined {
  if (!oi) return undefined;
  return parseNum(oi.unitPrice);
}

function currencyFromOrderItem(oi: UnknownRecord | null): string | undefined {
  if (!oi) return undefined;
  const c = oi.currencyCode;
  return typeof c === "string" && c.trim() ? c.trim() : undefined;
}

function lineNoteFromOrderItem(oi: UnknownRecord | null): string {
  if (!oi) return "";
  const n =
    typeof oi.note === "string"
      ? oi.note
      : typeof oi.remark === "string"
        ? oi.remark
        : "";
  return n.trim();
}

function productDefinitionIdFromOrderItem(oi: UnknownRecord | null): number {
  if (!oi) return 0;
  const def = asRecord(oi.productDefinition);
  const raw =
    oi.productDefinitionId ?? oi.definitionId ?? def?.id ?? oi.product_definition_id;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function productIdFromOrderItem(oi: UnknownRecord | null): number {
  if (!oi) return 0;
  const p = asRecord(oi.product);
  const raw = oi.productId ?? p?.id ?? oi.product_id;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** 하우징 템플릿 — 정의·라인에 붙은 요약 또는 id만 */
function housingTemplateInfoFromOrderItem(oi: UnknownRecord | null): {
  id: number;
  label: string;
} | null {
  if (!oi) return null;
  const def = asRecord(oi.productDefinition);
  const idRaw =
    def?.housingTemplateId ??
    def?.housing_template_id ??
    oi.housingTemplateId ??
    oi.housing_template_id;
  const id = typeof idRaw === "number" ? idRaw : Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return null;
  const code =
    (typeof def?.housingTemplateCode === "string" && def.housingTemplateCode.trim()) ||
    (typeof def?.housing_template_code === "string" && def.housing_template_code.trim()) ||
    "";
  const name =
    (typeof def?.housingTemplateName === "string" && def.housingTemplateName.trim()) ||
    (typeof def?.housing_template_name === "string" && def.housing_template_name.trim()) ||
    "";
  const label =
    name && code && name !== code
      ? `${name} (${code})`
      : name || code || `템플릿 #${id}`;
  return { id, label };
}

function formatLineQty(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v).trim();
  return s || "—";
}

function userDisplayName(u: DeliveryActorUserRef | null | undefined): string {
  if (!u) return "—";
  const name = typeof u.name === "string" ? u.name.trim() : "";
  if (name) return name;
  const en = u.employeeNo;
  if (en != null && String(en).trim()) return `사번 ${en}`;
  return "—";
}

function formatDateYmd(s: string | null | undefined): string {
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

function formatDate(s: string | null | undefined): string {
  return formatDateYmd(s);
}

function formatDateTimeKo(s: string | null | undefined): string {
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

/**
 * 납품 품목 목록 조회
 * @param d - 납품 정보
 * @returns 납품 품목 목록
 */
function deliveryLines(d: Delivery) {
  return d.deliveryItems ?? d.items ?? [];
}

function getBadgeColor(statusName: string): "success" | "warning" | "error" | "primary" {
  const t = statusName?.toLowerCase() ?? "";
  if (t.includes("등록")) return "primary";
  if (t.includes("완료") || t.includes("확정")) return "success";
  if (t.includes("대기") || t.includes("진행")) return "warning";
  if (t.includes("반려") || t.includes("취소")) return "error";
  return "primary";
}

const DELIVERY_STATUS_SIM_PREFIX = "deliveryStatusSim";

function deliveryStatusSimStorageKey(deliveryId: number): string {
  return `${DELIVERY_STATUS_SIM_PREFIX}:${deliveryId}`;
}

function labelForSortedDeliveryStatus(
  sortedCodes: CommonCodeItem[],
  code: string | undefined | null
): string {
  const c = String(code ?? "").trim();
  if (!c) return "미지정";
  const hit = sortedCodes.find((x) => x.code === c);
  return (hit?.name ?? "").trim() || c;
}

function DeliveryLineCompositionPanel({
  defId,
  productId,
  templateInfo,
  definition,
  definitionLoading,
  definitionError,
  housingDetail,
  housingLoading,
  housingError,
}: {
  defId: number;
  productId: number;
  templateInfo: { id: number; label: string } | null;
  definition: ProductDefinitionDetailDto | undefined;
  definitionLoading: boolean;
  definitionError: boolean;
  housingDetail: HousingTemplate | undefined;
  housingLoading: boolean;
  housingError: boolean;
}) {
  const hasDef = defId > 0;
  const hasTpl = templateInfo != null && templateInfo.id > 0;

  return (
    <div className="space-y-5 border-t border-gray-100 bg-gray-50/90 px-4 py-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
      {hasDef ? (
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">제품 정의 구성</h4>
            {productId > 0 ? (
              <Link
                to={`/products/${productId}/definitions/${defId}`}
                className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                정의 상세 →
              </Link>
            ) : null}
          </div>
          {definitionLoading ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">구성 정보를 불러오는 중…</p>
          ) : definitionError ? (
            <p className="text-theme-xs text-red-600 dark:text-red-400">제품 정의를 불러오지 못했습니다.</p>
          ) : !definition ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">정의 데이터가 없습니다.</p>
          ) : definition.lines.length === 0 ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">등록된 구성 라인이 없습니다.</p>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      역할
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      리비전
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      수량
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      비고
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definition.lines.map((row: DefinitionItemRevisionLineDto) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                        {row.itemRole?.trim() || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                        {(row.itemCode?.trim() || row.itemName?.trim())
                          ? [row.itemCode?.trim(), row.itemName?.trim()].filter(Boolean).join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs text-gray-600 dark:text-gray-300">
                        {(row.revisionCode?.trim() || row.revisionName?.trim())
                          ? [row.revisionCode?.trim(), row.revisionName?.trim()].filter(Boolean).join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-end text-theme-xs text-gray-800 dark:text-gray-200">
                        {formatLineQty(row.quantity)}
                      </TableCell>
                      <TableCell className="max-w-[12rem] px-3 py-2 text-theme-xs text-gray-600 dark:text-gray-300">
                        {row.remark?.trim() || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      {hasTpl ? (
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              하우징 템플릿 · {templateInfo.label}
            </h4>
            <Link
              to={`/housing-templates/${templateInfo.id}`}
              className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              템플릿 상세 →
            </Link>
          </div>
          {housingLoading ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">템플릿을 불러오는 중…</p>
          ) : housingError ? (
            <p className="text-theme-xs text-red-600 dark:text-red-400">하우징 템플릿을 불러오지 못했습니다.</p>
          ) : !housingDetail ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">템플릿 데이터가 없습니다.</p>
          ) : housingDetail.lines.length === 0 ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">템플릿 라인이 없습니다.</p>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      역할
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      리비전 / 도번
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      수량
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...housingDetail.lines]
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                          {row.roleCode?.trim() || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                          {row.itemCode?.trim() || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-theme-xs text-gray-600 dark:text-gray-300">
                          {[row.revisionCode?.trim(), row.revisionName?.trim(), row.drawingNo?.trim()]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-end text-theme-xs text-gray-800 dark:text-gray-200">
                          {formatLineQty(row.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      {!hasDef && !hasTpl ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          연결된 제품 정의·하우징 템플릿이 없어 구성을 표시할 수 없습니다.
        </p>
      ) : null}
    </div>
  );
}

export default function DeliveryDetail() {
  const { deliveryId } = useParams();
  const id = Number(deliveryId);
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const idOk = Number.isFinite(id) && id > 0;

  const {
    data: delivery,
    isLoading: deliveryLoading,
    error: deliveryError,
    isError: isDeliveryError,
  } = useQuery({
    queryKey: ["delivery", id],
    queryFn: () => getDeliveryById(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && idOk,
  });

  const purchaseOrderId = useMemo(() => {
    if (!delivery) return undefined;
    const a = delivery.purchaseOrderId;
    const b = delivery.order?.id;
    const c = delivery.orderId;
    if (typeof a === "number" && Number.isFinite(a)) return a;
    if (typeof b === "number" && Number.isFinite(b)) return b;
    if (typeof c === "number" && Number.isFinite(c)) return c;
    return undefined;
  }, [delivery]);

  const order = delivery?.order;

  const {
    data: deliveryStatusCodes = [],
    isLoading: deliveryStatusCodesLoading,
  } = useQuery<CommonCodeItem[]>({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_DELIVERY_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_DELIVERY_STATUS, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const sortedDeliveryStatusCodes = useMemo(
    () => sortDeliveryStatusCodes(deliveryStatusCodes),
    [deliveryStatusCodes]
  );

  const [deliveryStatusSimCode, setDeliveryStatusSimCode] = useState<string | null>(null);

  useEffect(() => {
    if (!idOk) return;
    try {
      const raw = sessionStorage.getItem(deliveryStatusSimStorageKey(id));
      setDeliveryStatusSimCode(raw?.trim() ? raw.trim() : null);
    } catch {
      setDeliveryStatusSimCode(null);
    }
  }, [id, idOk]);

  useEffect(() => {
    if (!idOk) return;
    try {
      if (deliveryStatusSimCode == null || deliveryStatusSimCode === "") {
        sessionStorage.removeItem(deliveryStatusSimStorageKey(id));
      } else {
        sessionStorage.setItem(deliveryStatusSimStorageKey(id), deliveryStatusSimCode);
      }
    } catch {
      /* ignore */
    }
  }, [deliveryStatusSimCode, id, idOk]);

  const { data: countryCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_COUNTRY],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_COUNTRY, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: poStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: poTypeCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: unitCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_UNIT],
    queryFn: () => getCommonCodesByGroup(COMMON_CODE_GROUP_UNIT, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const unitLabel = (code: string | undefined) =>
    code?.trim()
      ? labelForCommonCode(unitCodes, code) !== "—"
        ? labelForCommonCode(unitCodes, code)
        : code
      : "";

  const effectiveDeliveryStatus = deliveryStatusSimCode ?? delivery?.status;

  const statusName = (code: string | undefined) =>
    labelForSortedDeliveryStatus(sortedDeliveryStatusCodes, code);

  const stepLabels = useMemo(
    () =>
      sortedDeliveryStatusCodes.map((c) => (c.name?.trim() ? c.name : c.code)),
    [sortedDeliveryStatusCodes]
  );
  const stepperCompleted = computeDeliveryStatusCompletedCount(
    effectiveDeliveryStatus,
    sortedDeliveryStatusCodes
  );
  const stepperDetails = buildDeliveryStepperDetailsFromCodes(
    sortedDeliveryStatusCodes,
    effectiveDeliveryStatus,
    delivery ? formatDateYmd(delivery.deliveryDate) : ""
  );

  const statusProgressIndex = deliveryStatusIndexInSorted(
    effectiveDeliveryStatus,
    sortedDeliveryStatusCodes
  );
  const statusStepTotal = sortedDeliveryStatusCodes.length;
  const statusProgressPercent =
    statusStepTotal > 0 && statusProgressIndex >= 0
      ? Math.round(((statusProgressIndex + 1) / statusStepTotal) * 100)
      : 0;

  const nextDeliveryStatusHint = useMemo(() => {
    const arr = sortedDeliveryStatusCodes;
    const idx = deliveryStatusIndexInSorted(effectiveDeliveryStatus, arr);
    if (arr.length === 0) return { type: "empty" as const };
    if (idx < 0) return { type: "unknown" as const };
    if (idx >= arr.length - 1) return { type: "last" as const };
    const next = arr[idx + 1];
    return {
      type: "next" as const,
      label: (next.name ?? "").trim() || next.code,
      code: next.code,
    };
  }, [effectiveDeliveryStatus, sortedDeliveryStatusCodes]);

  const lines = delivery ? deliveryLines(delivery) : [];
  const orderItemsAll = useMemo(() => pickOrderItems(order), [order]);

  const [expandedLineKey, setExpandedLineKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeliveryDetailTab>("overview");

  useEffect(() => {
    if (activeTab !== "lines") setExpandedLineKey(null);
  }, [activeTab]);

  const definitionIds = useMemo(() => {
    if (!delivery) return [];
    const s = new Set<number>();
    for (const line of deliveryLines(delivery)) {
      const oi = resolveOrderItemForLine(line, delivery.order);
      const did = productDefinitionIdFromOrderItem(oi);
      if (did > 0) s.add(did);
    }
    return [...s].sort((a, b) => a - b);
  }, [delivery]);

  const templateIds = useMemo(() => {
    if (!delivery) return [];
    const s = new Set<number>();
    for (const line of deliveryLines(delivery)) {
      const oi = resolveOrderItemForLine(line, delivery.order);
      const ht = housingTemplateInfoFromOrderItem(oi);
      if (ht) s.add(ht.id);
    }
    return [...s].sort((a, b) => a - b);
  }, [delivery]);

  const definitionQueries = useQueries({
    queries: definitionIds.map((defId) => ({
      queryKey: ["productDefinition", defId],
      queryFn: () => getProductDefinition(defId, accessToken!),
      enabled: !!accessToken && !isAuthLoading && defId > 0,
    })),
  });

  const templateQueries = useQueries({
    queries: templateIds.map((tid) => ({
      queryKey: ["housingTemplate", tid],
      queryFn: () => getHousingTemplate(tid, accessToken!),
      enabled: !!accessToken && !isAuthLoading && tid > 0,
    })),
  });

  const loading = isAuthLoading || (idOk && deliveryLoading);

  if (!idOk) {
    return (
      <>
        <PageMeta title="납품 상세" description="납품을 찾을 수 없습니다." />
        <PageBreadcrumb pageTitle="납품 상세" />
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">잘못된 납품 ID입니다.</p>
      </>
    );
  }

  if (!isAuthLoading && !accessToken) {
    return null;
  }

  if (loading && !delivery) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingLottie />
      </div>
    );
  }

  if (isDeliveryError || (!deliveryLoading && !delivery)) {
    return (
      <>
        <PageMeta title="납품 상세" description="납품을 불러올 수 없습니다." />
        <PageBreadcrumb pageTitle="납품 상세" />
        <p className="text-theme-sm text-red-600 dark:text-red-400">
          {deliveryError instanceof Error
            ? deliveryError.message
            : "납품 정보를 불러오지 못했습니다."}
        </p>
      </>
    );
  }

  const d = delivery!;
  const title = d.deliveryNo?.trim() || `#${d.id}`;
  const partner: Partner | undefined = order?.partner ?? d.partner;
  const partnerLabel = partner ? partnerSelectLabel(partner, countryCodes) : "—";

  const orderCurrency =
    order?.currencyCode?.trim() ||
    (asRecord(order as unknown)?.currency_code as string | undefined)?.trim() ||
    "";

  return (
    <>
      <PageMeta title={`납품 ${title}`} description={`납품 ${title} 상세`} />
      <PageBreadcrumb pageTitle={`납품 상세 · ${title}`} />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-800">
            <SegmentedControl<DeliveryDetailTab>
              value={activeTab}
              onChange={setActiveTab}
              options={DELIVERY_DETAIL_TAB_OPTIONS}
              ariaLabel="납품 상세 탭"
              equalWidth
              className="w-full"
            />
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            {activeTab === "overview" ? (
              <>
                <div
                  className="rounded-xl border border-gray-100 bg-gradient-to-br from-gray-50/90 to-white px-4 py-4 dark:border-white/10 dark:from-white/[0.04] dark:to-white/[0.02] sm:px-5 sm:py-5"
                  role="region"
                  aria-label="납품 요약"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        납품
                      </p>
                      <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
                        {d.deliveryNo?.trim() || `ID ${d.id}`}
                      </p>
                      {d.title?.trim() ? (
                        <p className="mt-0.5 text-theme-sm text-gray-600 dark:text-gray-300">
                          {d.title.trim()}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge size="sm" color={getBadgeColor(statusName(effectiveDeliveryStatus))}>
                        {statusName(effectiveDeliveryStatus)}
                      </Badge>
                      {deliveryStatusSimCode?.trim() ? (
                        <span className="text-theme-xs text-amber-700 dark:text-amber-300">
                          납품 상태 시연 오버레이
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-theme-xs text-gray-500 dark:text-gray-400">
                      <span>납품 진행률 (공통코드 순)</span>
                      <span>
                        {statusStepTotal > 0 && statusProgressIndex >= 0
                          ? `${statusProgressIndex + 1} / ${statusStepTotal}`
                          : "—"}
                        {statusStepTotal > 0 && statusProgressIndex >= 0
                          ? ` · ${statusProgressPercent}%`
                          : ""}
                      </span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={statusProgressPercent}
                      aria-label="납품 상태 진행률"
                    >
                      <div
                        className="h-full rounded-full bg-brand-500 transition-[width] duration-300 dark:bg-brand-400"
                        style={{ width: `${statusProgressPercent}%` }}
                      />
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-theme-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주</dt>
                      <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                        {purchaseOrderId != null && order?.orderNo ? (
                          <Link
                            to={`/order/${purchaseOrderId}`}
                            className="text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {order.orderNo}
                          </Link>
                        ) : (
                          <span>{order?.orderNo ?? "—"}</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">거래처</dt>
                      <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{partnerLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품일 / 예정</dt>
                      <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                        {formatDate(d.deliveryDate)}
                        {d.plannedDeliveryDate?.trim() ? (
                          <span className="text-gray-500 dark:text-gray-400">
                            {" "}
                            · {formatDate(d.plannedDeliveryDate)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">이번 납품 품목</dt>
                      <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                        {lines.length}건
                        {lines.length > 0 ? (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => setActiveTab("lines")}
                              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              품목 탭으로
                            </button>
                          </>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-xl border border-dashed border-brand-300/80 bg-brand-50/40 px-4 py-3 dark:border-brand-600/40 dark:bg-brand-500/10">
                  <p className="text-theme-xs font-medium text-brand-900 dark:text-brand-100">다음 작업</p>
                  <p className="mt-1 text-theme-sm text-gray-700 dark:text-gray-200">
                    {nextDeliveryStatusHint.type === "empty" ? (
                      "납품 상태 공통코드를 불러오면 다음 단계 안내가 표시됩니다."
                    ) : nextDeliveryStatusHint.type === "unknown" ? (
                      <>
                        현재 코드가 공통코드 목록에 없습니다. 서버 상태:{" "}
                        <span className="font-mono text-theme-xs">{d.status ?? "—"}</span>
                      </>
                    ) : nextDeliveryStatusHint.type === "last" ? (
                      "공통코드 기준 마지막 단계에 도달했습니다."
                    ) : (
                      <>
                        다음 단계: <strong className="font-medium">{nextDeliveryStatusHint.label}</strong>
                        <span className="ml-1 font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                          ({nextDeliveryStatusHint.code})
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-2 text-theme-xs text-gray-600 dark:text-gray-300">
                    <strong className="font-medium text-gray-800 dark:text-gray-200">납품 진행 단계</strong> 시연(공통코드
                    순)과 <strong className="font-medium text-gray-800 dark:text-gray-200">계획·결재</strong> 와이어 시연은{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("misc")}
                      className="font-medium text-brand-600 underline hover:no-underline dark:text-brand-400"
                    >
                      진행·기타
                    </button>
                    탭에서 연동·조작할 수 있습니다.
                  </p>
                </div>

                <ComponentCard title="납품 진행 단계" collapsible>
                  <div className="min-w-0 overflow-x-auto pb-1">
                    <div className="min-w-[640px] sm:min-w-0">
                      {deliveryStatusCodesLoading ? (
                        <div className="flex min-h-[120px] items-center justify-center py-4">
                          <LoadingLottie />
                        </div>
                      ) : sortedDeliveryStatusCodes.length === 0 ? (
                        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                          납품 상태 공통 코드를 불러올 수 없어 단계를 표시하지 못했습니다.
                        </p>
                      ) : (
                        <DeliverySummaryStepper
                          stepLabels={stepLabels}
                          completedCount={stepperCompleted}
                          stepDetails={stepperDetails}
                        />
                      )}
                    </div>
                  </div>
                </ComponentCard>

                <ComponentCard title="납품 상세 정보" collapsible defaultCollapsed>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 번호</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                {d.deliveryNo?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">제목</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                {d.title?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품일</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {formatDate(d.deliveryDate)}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">예정일</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {d.plannedDeliveryDate?.trim() ? formatDate(d.plannedDeliveryDate) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">상태</dt>
              <dd className="mt-0.5 space-y-1">
                <div>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">서버</span>{" "}
                  <Badge size="sm" color={getBadgeColor(statusName(d.status))}>
                    {statusName(d.status)}
                  </Badge>
                  {d.status?.trim() ? (
                    <span className="ml-1 font-mono text-theme-xs text-gray-500">{d.status.trim()}</span>
                  ) : null}
                </div>
                {deliveryStatusSimCode?.trim() ? (
                  <div>
                    <span className="text-theme-xs text-gray-500 dark:text-gray-400">화면 반영</span>{" "}
                    <Badge size="sm" color={getBadgeColor(statusName(effectiveDeliveryStatus))}>
                      {statusName(effectiveDeliveryStatus)}
                    </Badge>
                  </div>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주</dt>
              <dd className="mt-0.5">
                {purchaseOrderId != null && order?.orderNo ? (
                  <Link
                    to={`/order/${purchaseOrderId}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {order.orderNo}
                  </Link>
                ) : (
                  <span className="text-gray-800 dark:text-gray-100">{order?.orderNo ?? "—"}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 담당자</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {userDisplayName(d.deliveryManager)}
                {d.deliveryManagerDepartment?.trim() ? (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    · {d.deliveryManagerDepartment.trim()}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">등록 / 수정</dt>
              <dd className="mt-0.5 text-theme-xs text-gray-700 dark:text-gray-200">
                <div>
                  {d.createdAt ? formatDateTimeKo(d.createdAt) : "—"}{" "}
                  {userDisplayName(d.createdBy) !== "—" ? `· ${userDisplayName(d.createdBy)}` : ""}
                </div>
                <div className="mt-0.5 text-gray-500 dark:text-gray-400">
                  {d.updatedAt ? formatDateTimeKo(d.updatedAt) : "—"}{" "}
                  {userDisplayName(d.updatedBy) !== "—" ? `· ${userDisplayName(d.updatedBy)}` : ""}
                </div>
              </dd>
            </div>
          </dl>

          {d.updateReason?.trim() ? (
            <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-theme-sm text-amber-950 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-100">
              <span className="text-theme-xs font-medium text-amber-800 dark:text-amber-200">
                수정 사유
              </span>
              <p className="mt-1 text-gray-800 dark:text-gray-100">{d.updateReason.trim()}</p>
            </div>
          ) : null}

          {d.remark?.trim() ? (
            <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
              {d.remark}
            </p>
          ) : null}
                </ComponentCard>
              </>
            ) : null}

            {activeTab === "lines" ? (
              <ComponentCard title="납품 품목">
            {lines.length === 0 ? (
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">등록된 품목이 없습니다.</p>
            ) : (
              <div className="max-w-full overflow-x-auto">
                <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
                  하우징 템플릿·제품 정의 구성은 행의 <strong className="font-medium">구성</strong>에서 펼쳐 확인할 수
                  있습니다.
                </p>
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        품목
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        제품 정의
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        하우징 템플릿
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        발주 수량
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        단가
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        이번 납품
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        비고
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-3 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        구성
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {lines.map((line, idx) => {
                      const rec = asRecord(line);
                      const oi = resolveOrderItemForLine(line, order);
                      const qtyRaw = rec?.quantity ?? rec?.delivery_qty ?? rec?.deliveryQty;
                      const pcode = productCodeFromOrderItem(oi);
                      const pname = productNameFromOrderItem(oi);
                      const productTitle =
                        pcode && pname
                          ? `${pcode} · ${pname}`
                          : pname || pcode || (rec?.orderItemId != null ? `품목 #${rec.orderItemId}` : `행 ${idx + 1}`);
                      const defLabel = definitionLabelFromOrderItem(oi);
                      const defId = productDefinitionIdFromOrderItem(oi);
                      const productId = productIdFromOrderItem(oi);
                      const htInfo = housingTemplateInfoFromOrderItem(oi);
                      const defIdx = defId > 0 ? definitionIds.indexOf(defId) : -1;
                      const tplIdx =
                        htInfo && htInfo.id > 0 ? templateIds.indexOf(htInfo.id) : -1;
                      const defQ =
                        defIdx >= 0 && defIdx < definitionQueries.length
                          ? definitionQueries[defIdx]
                          : undefined;
                      const tplQ =
                        tplIdx >= 0 && tplIdx < templateQueries.length
                          ? templateQueries[tplIdx]
                          : undefined;
                      const canExpand = defId > 0 || !!htInfo;
                      const lineKey = `${rec?.id ?? "x"}-${rec?.orderItemId ?? idx}-${idx}`;
                      const isOpen = expandedLineKey === lineKey;

                      const oQty = orderLineQty(oi);
                      const uCode = unitCodeFromOrderItem(oi);
                      const uName = uCode ? unitLabel(uCode) : "";
                      const orderQtyCell =
                        oQty != null
                          ? `${oQty}${uName ? ` ${uName}` : uCode ? ` (${uCode})` : ""}`
                          : "—";
                      const cur = currencyFromOrderItem(oi) || orderCurrency || "KRW";
                      const up = unitPriceFromOrderItem(oi);
                      const note = lineNoteFromOrderItem(oi);

                      const housingCell =
                        htInfo != null ? (
                          <Link
                            to={`/housing-templates/${htInfo.id}`}
                            className="text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {htInfo.label}
                          </Link>
                        ) : (
                          "—"
                        );

                      return (
                        <Fragment key={lineKey}>
                          <TableRow>
                            <TableCell className="max-w-[14rem] px-4 py-3 text-theme-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium text-gray-900 dark:text-white">{productTitle}</span>
                            </TableCell>
                            <TableCell className="max-w-[12rem] px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                              {defId > 0 && productId > 0 ? (
                                <Link
                                  to={`/products/${productId}/definitions/${defId}`}
                                  className="text-brand-600 hover:underline dark:text-brand-400"
                                >
                                  {defLabel}
                                </Link>
                              ) : (
                                defLabel
                              )}
                            </TableCell>
                            <TableCell className="max-w-[11rem] px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                              {housingCell}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                              {orderQtyCell}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                              {up != null ? formatCurrency(up, cur) : "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap px-4 py-3 text-end font-medium text-theme-sm text-gray-900 dark:text-white">
                              {formatQtyDisplay(qtyRaw)}
                            </TableCell>
                            <TableCell className="max-w-[10rem] px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-300">
                              {note || "—"}
                            </TableCell>
                            <TableCell className="px-2 py-3 text-center">
                              {canExpand ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedLineKey((prev) => (prev === lineKey ? null : lineKey))
                                  }
                                  className="rounded-md px-2 py-1 text-theme-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                                >
                                  {isOpen ? "접기" : "펼치기"}
                                </button>
                              ) : (
                                <span className="text-theme-xs text-gray-400">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                          {isOpen && canExpand ? (
                            <TableRow>
                              <TableCell colSpan={8} className="p-0">
                                <DeliveryLineCompositionPanel
                                  defId={defId}
                                  productId={productId}
                                  templateInfo={htInfo}
                                  definition={defQ?.data}
                                  definitionLoading={defQ?.isLoading ?? false}
                                  definitionError={defQ?.isError ?? false}
                                  housingDetail={tplQ?.data}
                                  housingLoading={tplQ?.isLoading ?? false}
                                  housingError={tplQ?.isError ?? false}
                                />
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
              </ComponentCard>
            ) : null}

            {activeTab === "order" ? (
              <>
        {order ? (
          <ComponentCard title="발주 맥락" collapsible>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주 제목</dt>
                <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                  {order.title?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">거래처</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{partnerLabel}</dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주 상태 / 유형</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {labelForCommonCode(poStatusCodes, order.status ?? undefined)}
                  {order.orderType?.trim() ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      · {labelForCommonCode(poTypeCodes, order.orderType)}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주일</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {order.orderedAt?.trim() ? formatDate(order.orderedAt) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납기 / 희망 납품일</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {order.dueDate?.trim() ? formatDate(order.dueDate) : "—"}
                  {order.requestDeliveryDate?.trim() ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      / {formatDate(order.requestDeliveryDate)}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">요청 부서 / 담당</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {(order.requestDepartment ?? order.requesterDepartment)?.trim() || "—"}
                  {order.requesterName?.trim() ? (
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      · {order.requesterName.trim()}
                    </span>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">통화</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {orderCurrency || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-theme-xs text-gray-500 dark:text-gray-400">공급가액 / 합계(부가세포함)</dt>
                <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                  {formatCurrency(order.supplyAmount ?? null, orderCurrency || "KRW")}
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    / {formatCurrency(order.totalAmountVatIncluded ?? null, orderCurrency || "KRW")}
                  </span>
                </dd>
              </div>
              {order.priority?.trim() ? (
                <div>
                  <dt className="text-theme-xs text-gray-500 dark:text-gray-400">우선순위</dt>
                  <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{order.priority.trim()}</dd>
                </div>
              ) : null}
              {order.vendorOrderNo?.trim() ? (
                <div>
                  <dt className="text-theme-xs text-gray-500 dark:text-gray-400">협력사 주문번호</dt>
                  <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{order.vendorOrderNo.trim()}</dd>
                </div>
              ) : null}
            </dl>

            {order.memo?.trim() ? (
              <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
                {order.memo.trim()}
              </p>
            ) : null}

            {purchaseOrderId != null ? (
              <p className="mt-4 text-theme-sm">
                <Link
                  to={`/order/${purchaseOrderId}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  발주 상세에서 전체 품목·첨부 확인 →
                </Link>
                {orderItemsAll.length > 0 ? (
                  <span className="ml-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    (발주 품목 {orderItemsAll.length}건)
                  </span>
                ) : null}
              </p>
            ) : null}
          </ComponentCard>
        ) : (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            연결된 발주 정보가 없습니다.
          </p>
        )}

        {orderItemsAll.length > 0 ? (
          <ComponentCard title="발주 품목 전체 (참고)" collapsible defaultCollapsed>
            <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
              동일 발주의 모든 라인입니다. 이번 납품에 포함되지 않은 품목도 표시됩니다.
            </p>
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      #
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      발주 수량
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {orderItemsAll.map((row, idx) => {
                    const oi = asRecord(row);
                    if (!oi) return null;
                    const oid = oi.id;
                    const idNum = typeof oid === "number" ? oid : Number(oid);
                    const pcode = productCodeFromOrderItem(oi);
                    const pname = productNameFromOrderItem(oi);
                    const label =
                      pcode && pname
                        ? `${pcode} · ${pname}`
                        : pname || pcode || (Number.isFinite(idNum) ? `#${idNum}` : `행 ${idx + 1}`);
                    const oQty = orderLineQty(oi);
                    const uCode = unitCodeFromOrderItem(oi);
                    const uName = uCode ? unitLabel(uCode) : "";
                    const inThisDelivery = lines.some((ln) => {
                      const r = asRecord(ln);
                      const lid = r?.orderItemId ?? r?.purchaseOrderItemId;
                      const n = typeof lid === "number" ? lid : Number(lid);
                      return Number.isFinite(idNum) && n === idNum;
                    });

                    return (
                      <TableRow key={Number.isFinite(idNum) ? idNum : idx}>
                        <TableCell className="px-4 py-2 text-theme-xs text-gray-500 dark:text-gray-400">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-theme-sm text-gray-800 dark:text-gray-200">
                          {label}
                          {inThisDelivery ? (
                            <span className="ml-2 inline-block align-middle">
                              <Badge size="sm" color="primary">
                                이번 납품
                              </Badge>
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="px-4 py-2 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                          {oQty != null
                            ? `${oQty}${uName ? ` ${uName}` : uCode ? ` (${uCode})` : ""}`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ComponentCard>
        ) : null}
              </>
            ) : null}

            {activeTab === "misc" ? (
              <DeliveryPlanApprovalDemoPanel
                deliveryId={id}
                sortedCodes={sortedDeliveryStatusCodes}
                codesLoading={deliveryStatusCodesLoading}
                serverStatus={d.status}
                simCode={deliveryStatusSimCode}
                onSimChange={setDeliveryStatusSimCode}
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
