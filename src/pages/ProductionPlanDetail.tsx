import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LoadingLottie from "../components/common/LoadingLottie";
import SegmentedControl from "../components/common/SegmentedControl";
import { useAuth } from "../hooks/useAuth";
import { useProductionPlanCommonCodes } from "../hooks/useProductionPlanCommonCodes";
import { getUsers } from "../api/user";
import {
  getProductionPlan,
  getProductionPlanUnitProcessRecords,
  type Partner,
  type ProductionPlanUnit,
} from "../api/purchaseOrder";
import {
  partnerFromSummary,
  partnerSelectLabel,
  partnerSummaryHasDisplayableFields,
} from "../domains/partner/display/partnerDisplay";
import { partnerCountryFlagUrl } from "../domains/partner/helpers/partnerCountryOptions";
import { flattenPlanUnits } from "../domains/production-plan/helpers/detailHelpers";
import { PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS } from "../domains/production-plan/queries/unitListQueryOptions";
import { formatDateYmd } from "../lib/format/dateFormat";
import { notify } from "../lib/notify";
import {
  PRODUCTION_PLAN_DETAIL_TAB_OPTIONS,
  type ProductionPlanDetailTab,
} from "../components/production-plan/productionPlanDetailTabTypes";
import { useProductionPlanDetailMutations } from "../features/production-plan-detail/hooks/useProductionPlanDetailMutations";
import { useProductionPlanDetailProcessGate } from "../features/production-plan-detail/hooks/useProductionPlanDetailProcessGate";
import {
  openSplitModalFromPlan,
  validateSplitSelection,
  type SplitModalContext,
} from "../features/production-plan-detail/helpers/splitHelpers";
import { ProductionPlanOverviewSection } from "../features/production-plan-detail/sections/ProductionPlanOverviewSection";
import {
  ProductionPlanSummarySection,
  ProductionPlanUnitsSection,
} from "../features/production-plan-detail/sections/ProductionPlanUnitsSection";
import { ProductionPlanProcessSection } from "../features/production-plan-detail/sections/ProductionPlanProcessSection";

export default function ProductionPlanDetail() {
  const { orderId, planId } = useParams();
  const oid = String(orderId ?? "").trim();
  const pid = String(planId ?? "").trim();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<ProductionPlanDetailTab>("overview");
  const [selectedUnitIds, setSelectedUnitIds] = useState(
    () => new Set<string>()
  );
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitModalContext, setSplitModalContext] =
    useState<SplitModalContext | null>(null);
  const [splitDeliveryDate, setSplitDeliveryDate] = useState("");
  const [splitPlannedDeliveryDate, setSplitPlannedDeliveryDate] =
    useState("");
  const [splitDeliveryManagerUserSelectValue, setSplitDeliveryManagerUserSelectValue] =
    useState("");
  const [splitTitle, setSplitTitle] = useState("");
  const [splitRemark, setSplitRemark] = useState("");
  const [recordsModalUnitId, setRecordsModalUnitId] = useState<string | null>(
    null
  );
  const [deliverModal, setDeliverModal] = useState<{
    unit: ProductionPlanUnit;
    purchaseOrderItemId: number;
  } | null>(null);
  const [deliverDate, setDeliverDate] = useState("");
  const [deliverRemark, setDeliverRemark] = useState("");

  const {
    data: plan,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["productionPlan", pid],
    queryFn: () => getProductionPlan(pid, accessToken!),
    enabled: !!accessToken && !isAuthLoading && pid !== "",
    staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
  });

  const { data: modalRecords = [], isLoading: modalRecordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", recordsModalUnitId],
    queryFn: () =>
      getProductionPlanUnitProcessRecords(recordsModalUnitId!, accessToken!),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      !!recordsModalUnitId &&
      recordsModalUnitId !== "",
    staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
  });

  const deliverRecordsUnitId = deliverModal?.unit.id ?? null;
  const { data: deliverRecords = [], isLoading: deliverRecordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", deliverRecordsUnitId],
    queryFn: () =>
      getProductionPlanUnitProcessRecords(deliverRecordsUnitId!, accessToken!),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      !!deliverRecordsUnitId &&
      deliverRecordsUnitId !== "",
  });

  const {
    countryCodes,
    unitProcessStepCodes,
    productionPlanStatusCodes,
  } = useProductionPlanCommonCodes(accessToken, !!accessToken && !isAuthLoading);

  const { data: usersForDeliveryManager = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const flatUnits = useMemo(
    () => flattenPlanUnits(plan?.items),
    [plan?.items]
  );

  const planPartnerCode =
    plan?.purchaseOrder?.partner?.code?.trim() ||
    plan?.purchaseOrder?.partnerSummary?.code?.trim() ||
    "";

  const planDeliveryDate =
    plan?.deliveryDate?.trim() ||
    plan?.plannedDeliveryDate?.trim() ||
    plan?.purchaseOrder?.requestDeliveryDate?.trim() ||
    plan?.purchaseOrder?.dueDate?.trim() ||
    "";

  const splitValidation = useMemo(
    () => validateSplitSelection(selectedUnitIds, flatUnits),
    [selectedUnitIds, flatUnits]
  );

  const splitDisabledReason =
    selectedUnitIds.size === 0
      ? null
      : splitValidation.eligible
        ? null
        : (splitValidation.reason ?? "분할할 수 없는 선택입니다.");

  const defaultDeliveryDateYmd = useMemo(() => {
    if (!plan) return new Date().toISOString().slice(0, 10);
    return (
      [plan.plannedDeliveryDate, plan.plannedDate, plan.deliveryDate]
        .map((x) => formatDateYmd(x, { emptyFallback: "" }))
        .find((s) => s && s !== "-") ?? new Date().toISOString().slice(0, 10)
    );
  }, [plan]);

  const openDeliverModalForUnit = (
    unit: ProductionPlanUnit,
    purchaseOrderItemId?: number | null
  ) => {
    if (
      purchaseOrderItemId == null ||
      !Number.isFinite(Number(purchaseOrderItemId)) ||
      Number(purchaseOrderItemId) <= 0
    ) {
      notify.error("발주 품목 정보가 없어 납품을 등록할 수 없습니다.");
      return false;
    }
    setDeliverModal({
      unit,
      purchaseOrderItemId: Number(purchaseOrderItemId),
    });
    setDeliverDate(defaultDeliveryDateYmd);
    setDeliverRemark("");
    return true;
  };

  const {
    deliverMutation,
    splitMutation,
    uploadProcessRecordFilesMutation,
  } = useProductionPlanDetailMutations({
    orderId: oid,
    planId: pid,
    accessToken,
    deliverModal,
    deliverDate,
    deliverRemark,
    onDeliverSuccess: () => {
      setDeliverModal(null);
      setDeliverRemark("");
    },
    splitModalContext,
    splitDeliveryDate,
    splitPlannedDeliveryDate,
    splitDeliveryManagerUserSelectValue,
    splitTitle,
    splitRemark,
    onSplitSuccess: () => {
      setSplitModalOpen(false);
      setSplitModalContext(null);
      setSelectedUnitIds(new Set());
    },
  });

  const processGate = useProductionPlanDetailProcessGate({
    orderId: oid,
    planId: pid,
    accessToken,
    flatUnits,
    unitProcessStepCodes,
    planPartnerCode,
    planDeliveryDate,
    queryClient,
    onOpenDeliverModal: openDeliverModalForUnit,
  });

  const sortedModalRecords = useMemo(() => {
    const list = [...modalRecords];
    list.sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
    return list;
  }, [modalRecords]);

  const sortedDeliverRecords = useMemo(() => {
    const list = [...deliverRecords];
    list.sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
    return list;
  }, [deliverRecords]);

  if (!oid || !pid) {
    return (
      <>
        <PageMeta title="생산 계획" description="생산 계획" />
        <p className="text-sm text-red-600 dark:text-red-400">
          잘못된 경로입니다.
        </p>
      </>
    );
  }

  if (isLoading || !plan) {
    return (
      <>
        <PageMeta title="생산 계획" description="생산 계획" />
        <PageBreadcrumb pageTitle="생산 계획" />
        <div className="flex min-h-[320px] items-center justify-center">
          {isLoading && <LoadingLottie />}
          {!isLoading && isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "생산 계획을 불러오지 못했습니다."}
            </p>
          )}
        </div>
      </>
    );
  }

  const purchaseOrderRaw = plan.purchaseOrder ?? undefined;
  const partner = purchaseOrderRaw?.partner ?? undefined;
  const partnerSummary = purchaseOrderRaw?.partnerSummary;
  const partnerForDisplay: Partner | undefined =
    partnerSummary != null &&
    partnerSummaryHasDisplayableFields(partnerSummary)
      ? partnerFromSummary(partnerSummary)
      : partner;
  const orderNoFromPlan = purchaseOrderRaw?.orderNo?.trim();
  const partnerLabelText = partnerForDisplay
    ? partnerSelectLabel(partnerForDisplay, countryCodes)
    : "—";
  const partnerFlagUrl = partnerCountryFlagUrl(
    String(partnerForDisplay?.countryCode ?? "")
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

  const breadcrumbTitle =
    plan.title?.trim() || plan.planNo?.trim() || "생산 계획";

  const openSplitModalFromToolbar = () => {
    if (!splitValidation.eligible || !plan) return;
    openSplitModalFromPlan(plan, splitValidation, selectedUnitIds, {
      onSplitModalContextChange: setSplitModalContext,
      onSplitDeliveryDateChange: setSplitDeliveryDate,
      onSplitPlannedDeliveryDateChange: setSplitPlannedDeliveryDate,
      onSplitDeliveryManagerUserSelectValueChange:
        setSplitDeliveryManagerUserSelectValue,
      onSplitTitleChange: setSplitTitle,
      onSplitRemarkChange: setSplitRemark,
      onSplitModalOpenChange: setSplitModalOpen,
    });
  };

  return (
    <>
      <PageMeta
        title={`생산 계획 ${plan.title?.trim() || plan.planNo || plan.id}`}
        description="생산 계획 상세"
      />
      <PageBreadcrumb pageTitle={`생산 계획 · ${breadcrumbTitle}`} />

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-800">
            <SegmentedControl<ProductionPlanDetailTab>
              value={activeTab}
              onChange={setActiveTab}
              options={PRODUCTION_PLAN_DETAIL_TAB_OPTIONS}
              ariaLabel="생산 계획 상세 탭"
              equalWidth
              className="w-full"
            />
          </div>

          <div className="space-y-6 p-4 sm:p-6">
            {activeTab === "overview" ? (
              <ProductionPlanOverviewSection
                plan={plan}
                orderId={oid}
                orderNo={orderNoFromPlan}
                partnerLabel={partnerLabel}
                flatUnits={flatUnits}
                unitProcessStepCodes={unitProcessStepCodes}
                selectedUnitIds={selectedUnitIds}
                onSelectedUnitIdsChange={setSelectedUnitIds}
                splitDisabledReason={splitDisabledReason}
                onSplitClick={openSplitModalFromToolbar}
                onProcess={processGate.openProcessGate}
                onDeliver={({ unit, purchaseOrderItemId }) => {
                  openDeliverModalForUnit(unit, purchaseOrderItemId);
                }}
                onRecords={(unitId) => setRecordsModalUnitId(unitId)}
                onNavigateTab={setActiveTab}
              />
            ) : null}
            {activeTab === "lines" ? (
              <ProductionPlanUnitsSection items={plan.items ?? []} />
            ) : null}
            {activeTab === "summary" ? (
              <ProductionPlanSummarySection
                plan={plan}
                productionPlanStatusCodes={productionPlanStatusCodes}
              />
            ) : null}
          </div>
        </div>
      </div>

      <ProductionPlanProcessSection
        accessToken={accessToken}
        isAuthLoading={isAuthLoading}
        flatUnits={flatUnits}
        unitProcessStepCodes={unitProcessStepCodes}
        usersForDeliveryManager={usersForDeliveryManager}
        processGate={processGate}
        splitModalOpen={splitModalOpen}
        onSplitModalOpenChange={setSplitModalOpen}
        splitModalContext={splitModalContext}
        onSplitModalContextChange={setSplitModalContext}
        splitDeliveryDate={splitDeliveryDate}
        onSplitDeliveryDateChange={setSplitDeliveryDate}
        splitPlannedDeliveryDate={splitPlannedDeliveryDate}
        onSplitPlannedDeliveryDateChange={setSplitPlannedDeliveryDate}
        splitDeliveryManagerUserSelectValue={splitDeliveryManagerUserSelectValue}
        onSplitDeliveryManagerUserSelectValueChange={
          setSplitDeliveryManagerUserSelectValue
        }
        splitTitle={splitTitle}
        onSplitTitleChange={setSplitTitle}
        splitRemark={splitRemark}
        onSplitRemarkChange={setSplitRemark}
        splitMutation={splitMutation}
        deliverModal={deliverModal}
        onDeliverModalChange={setDeliverModal}
        deliverDate={deliverDate}
        onDeliverDateChange={setDeliverDate}
        deliverRemark={deliverRemark}
        onDeliverRemarkChange={setDeliverRemark}
        deliverMutation={deliverMutation}
        deliverRecordsLoading={deliverRecordsLoading}
        sortedDeliverRecords={sortedDeliverRecords}
        modalRecordsLoading={modalRecordsLoading}
        sortedModalRecords={sortedModalRecords}
        recordsModalUnitId={recordsModalUnitId}
        onRecordsModalUnitIdChange={setRecordsModalUnitId}
        uploadProcessRecordFilesMutation={uploadProcessRecordFilesMutation}
      />
    </>
  );
}
