import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useQueries } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LoadingLottie from "../components/common/LoadingLottie";
import SegmentedControl from "../components/common/SegmentedControl";
import { useAuth } from "../context/AuthContext";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getDeliveryById,
  type Partner,
} from "../api/purchaseOrder";
import { DeliveryPlanApprovalDemoPanel } from "../components/delivery/DeliveryPlanApprovalDemoPanel";
import {
  buildDeliveryStepperDetailsFromCodes,
  computeDeliveryStatusCompletedCount,
  deliveryStatusIndexInSorted,
  sortDeliveryStatusCodes,
} from "../components/delivery/deliveryStepperUtils";
import {
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  labelForCommonCode,
} from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { partnerCountryFlagUrl } from "../lib/partnerCountryOptions";
import { getProductDefinition } from "../api/products";
import { getHousingTemplate } from "../api/housingTemplates";
import {
  DELIVERY_DETAIL_TAB_OPTIONS,
  type DeliveryDetailTab,
} from "../components/delivery/deliveryDetailTabTypes";
import { DeliveryDetailOverviewTab } from "../components/delivery/DeliveryDetailOverviewTab";
import { DeliveryDetailLinesTab } from "../components/delivery/DeliveryDetailLinesTab";
import { DeliveryDetailOrderTab } from "../components/delivery/DeliveryDetailOrderTab";
import {
  asDeliveryDetailRecord,
  deliveryLinesFromDelivery,
  deliveryStatusSimStorageKey,
  formatDeliveryDetailDateYmd,
  labelForSortedDeliveryStatus,
  pickOrderItemsFromDeliveryOrder,
  productDefinitionIdFromOrderItem,
  resolveOrderItemForDeliveryLine,
  housingTemplateInfoFromOrderItem,
} from "../lib/deliveryDetailHelpers";

const COMMON_CODE_GROUP_UNIT = "UNIT";

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
  } = useCommonCodesByGroup(COMMON_CODE_GROUP_DELIVERY_STATUS, accessToken, {
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

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: poStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: poTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: unitCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

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
    delivery ? formatDeliveryDetailDateYmd(delivery.deliveryDate) : ""
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

  const lines = delivery ? deliveryLinesFromDelivery(delivery) : [];
  const orderItemsAll = useMemo(
    () => pickOrderItemsFromDeliveryOrder(order),
    [order]
  );

  const [expandedLineKey, setExpandedLineKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeliveryDetailTab>("overview");

  useEffect(() => {
    if (activeTab !== "lines") setExpandedLineKey(null);
  }, [activeTab]);

  const definitionIds = useMemo(() => {
    if (!delivery) return [];
    const s = new Set<number>();
    for (const line of deliveryLinesFromDelivery(delivery)) {
      const oi = resolveOrderItemForDeliveryLine(line, delivery.order);
      const did = productDefinitionIdFromOrderItem(oi);
      if (did > 0) s.add(did);
    }
    return [...s].sort((a, b) => a - b);
  }, [delivery]);

  const templateIds = useMemo(() => {
    if (!delivery) return [];
    const s = new Set<number>();
    for (const line of deliveryLinesFromDelivery(delivery)) {
      const oi = resolveOrderItemForDeliveryLine(line, delivery.order);
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
  const partnerLabelText = partner ? partnerSelectLabel(partner, countryCodes) : "—";
  const partnerFlagUrl = partnerCountryFlagUrl(
    String(partner?.countryCode ?? "")
  );
  const partnerLabel = (
    <div className="flex items-center gap-2">
      {partnerFlagUrl ? (
        <img
          src={partnerFlagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : null}
      <span>{partnerLabelText}</span>
    </div>
  );

  const orderCurrency =
    order?.currencyCode?.trim() ||
    (asDeliveryDetailRecord(order as unknown)?.currency_code as string | undefined)?.trim() ||
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
              <DeliveryDetailOverviewTab
                delivery={d}
                order={order}
                purchaseOrderId={purchaseOrderId}
                partnerLabel={partnerLabel}
                effectiveDeliveryStatus={effectiveDeliveryStatus}
                deliveryStatusSimCode={deliveryStatusSimCode}
                statusName={statusName}
                statusStepTotal={statusStepTotal}
                statusProgressIndex={statusProgressIndex}
                statusProgressPercent={statusProgressPercent}
                nextDeliveryStatusHint={nextDeliveryStatusHint}
                sortedDeliveryStatusCodes={sortedDeliveryStatusCodes}
                deliveryStatusCodesLoading={deliveryStatusCodesLoading}
                stepLabels={stepLabels}
                stepperCompleted={stepperCompleted}
                stepperDetails={stepperDetails}
                onNavigateTab={setActiveTab}
              />
            ) : null}
            {activeTab === "lines" ? (
              <DeliveryDetailLinesTab
                lines={lines}
                order={order}
                definitionIds={definitionIds}
                templateIds={templateIds}
                definitionQueries={definitionQueries.map((q) => ({
                  data: q.data,
                  isLoading: q.isLoading,
                  isError: q.isError,
                }))}
                templateQueries={templateQueries.map((q) => ({
                  data: q.data,
                  isLoading: q.isLoading,
                  isError: q.isError,
                }))}
                expandedLineKey={expandedLineKey}
                onToggleLineKey={(lineKey) =>
                  setExpandedLineKey((prev) => (prev === lineKey ? null : lineKey))
                }
                unitLabel={unitLabel}
                orderCurrency={orderCurrency}
              />
            ) : null}
            {activeTab === "order" ? (
              <DeliveryDetailOrderTab
                order={order}
                partnerLabel={partnerLabel}
                orderCurrency={orderCurrency}
                purchaseOrderId={purchaseOrderId}
                poStatusCodes={poStatusCodes}
                poTypeCodes={poTypeCodes}
                orderItemsAll={orderItemsAll}
                deliveryLinesForMatch={lines}
                unitLabel={unitLabel}
              />
            ) : null}
            {activeTab === "progress" ? (
              <DeliveryPlanApprovalDemoPanel
                deliveryId={id}
                sortedCodes={sortedDeliveryStatusCodes}
                codesLoading={deliveryStatusCodesLoading}
                serverStatus={d.status}
                simCode={deliveryStatusSimCode}
                onSimChange={setDeliveryStatusSimCode}
                section="progress"
              />
            ) : null}
            {activeTab === "approval" ? (
              <DeliveryPlanApprovalDemoPanel
                deliveryId={id}
                sortedCodes={sortedDeliveryStatusCodes}
                codesLoading={deliveryStatusCodesLoading}
                serverStatus={d.status}
                simCode={deliveryStatusSimCode}
                onSimChange={setDeliveryStatusSimCode}
                section="approval"
              />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
