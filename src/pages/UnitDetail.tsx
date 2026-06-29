import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import DetailPageState from "../components/common/DetailPageState";
import LoadingLottie from "../components/common/LoadingLottie";
import { useAuth } from "../hooks/useAuth";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { useRmaPermissions } from "../hooks/useRmaPermissions";
import { useProductionPlanCommonCodes } from "../hooks/useProductionPlanCommonCodes";
import { ProductionPlanUnitEditModal } from "../components/production-plan/ProductionPlanUnitEditModal";
import { UnitDetailHeaderCard } from "../components/unit/detail/UnitDetailHeaderCard";
import { UnitDetailBodyCard } from "../components/unit/detail/UnitDetailBodyCard";
import { UnitOverviewTab } from "../components/unit/detail/UnitOverviewTab";
import { UnitProcessHistoryTab } from "../components/unit/detail/UnitProcessHistoryTab";
import { UnitRmaTab } from "../components/unit/detail/UnitRmaTab";
import { UnitDetailDeliverModal } from "../components/unit/detail/UnitDetailDeliverModal";
import { UnitDetailProcessGateModal } from "../components/unit/detail/UnitDetailProcessGateModal";
import { unitDisplayLot } from "../domains/production-plan/mappers/unitMappers";
import { DELIVERY_UNIT_DETAIL_PAGE_LABEL } from "../domains/delivery/labels/pageLabels";
import { useUnitDetailMutations } from "../domains/production-plan/hooks/useUnitDetailMutations";
import { useUnitDetailProcessGate } from "../domains/production-plan/hooks/useUnitDetailProcessGate";
import { useUnitDetailQueries } from "../domains/production-plan/hooks/useUnitDetailQueries";
import { useUnitDetailPage } from "../domains/production-plan/hooks/useUnitDetailPage";
import { canShowUnitDetailProcessGate } from "../domains/delivery/policy/unitDetailDeliveryPolicy";

export default function UnitDetail() {
  const { unitId: unitIdParam } = useParams();
  const unitId = String(unitIdParam ?? "").trim();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadDelivery, canCreateDelivery } = useDeliveryPermissions();
  const { canReadRma, canCreateRma } = useRmaPermissions();

  const { unitProcessStepCodes } = useProductionPlanCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const queries = useUnitDetailQueries({
    unitId,
    accessToken,
    isAuthLoading,
    canReadDelivery,
    canReadRma,
    canCreateDelivery,
    unitProcessStepCodes,
  });

  const page = useUnitDetailPage({
    unit: queries.unit,
    purchaseOrder: queries.purchaseOrder,
    unitId,
    accessToken,
    isAuthLoading,
  });

  const processGate = useUnitDetailProcessGate({
    unitId,
    orderId: queries.orderId,
    planId: queries.planId,
    accessToken,
    processUnit: queries.processUnit,
    flatRow: queries.flatRow,
    visibleStepCodes: queries.visibleStepCodes,
    unitCustomerCode: queries.unitCustomerCode,
    planDeliveryDate: page.planDeliveryDate,
    queryClient,
    onPassReadyForDeliver: page.openDeliverModal,
  });

  const { deliverMutation, handleUploadProcessRecordFiles } =
    useUnitDetailMutations({
      unitId,
      orderId: queries.orderId,
      deliveryPlanId: queries.deliveryPlanId,
      accessToken,
      processUnit: queries.processUnit,
      flatRow: queries.flatRow,
      purchaseOrderItemId: queries.purchaseOrderItemId,
      deliverDate: page.deliverDate,
      deliverRemark: page.deliverRemark,
      onDeliverSuccess: page.closeDeliverModal,
    });

  const onUploadAttachments = (recordId: string, files: File[]) =>
    handleUploadProcessRecordFiles(
      unitId,
      recordId,
      files,
      page.setUploadingProcessRecordKey
    );

  const showProcessGateButton = canShowUnitDetailProcessGate(queries.deliveryCtx);

  if (!canReadDelivery) {
    return (
      <DetailPageState
        title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        invalidMessage={`${DELIVERY_UNIT_DETAIL_PAGE_LABEL} 조회 권한(delivery.read)이 없습니다.`}
      />
    );
  }

  if (!unitId) {
    return (
      <DetailPageState
        title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        invalidMessage="잘못된 Unit ID입니다."
      />
    );
  }

  if (isAuthLoading || queries.isLoading) {
    return (
      <>
        <PageMeta
          title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
          description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        />
        <PageBreadcrumb pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL} />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="Unit 정보를 불러오는 중입니다." />
        </div>
      </>
    );
  }

  const { unit, processUnit, flatRow, error, isError } = queries;
  if (isError || !unit || !processUnit || !flatRow) {
    return (
      <DetailPageState
        title={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        description={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        pageTitle={DELIVERY_UNIT_DETAIL_PAGE_LABEL}
        errorMessage={
          error instanceof Error
            ? error.message
            : "Unit 정보를 불러오지 못했습니다."
        }
      />
    );
  }

  const pageTitle = `${DELIVERY_UNIT_DETAIL_PAGE_LABEL} · ${unitDisplayLot(unit)}`;
  const isDelivered = unit.isDelivered === true;
  const showRmaRegister = isDelivered && canCreateRma && !queries.hasActiveRma;

  return (
    <>
      <PageMeta title={pageTitle} description={DELIVERY_UNIT_DETAIL_PAGE_LABEL} />
      <PageBreadcrumb pageTitle={pageTitle} />

      <div className="space-y-4">
        <UnitDetailHeaderCard
          unit={unit}
          stepCodes={unitProcessStepCodes}
          purchaseOrder={queries.purchaseOrder}
          orderId={queries.orderId}
          planId={queries.planId}
          unitId={unitId}
          canDeliver={queries.canDeliver}
          showResidualUndeliveredBadge={queries.showResidualUndeliveredBadge}
          showRmaRegister={showRmaRegister}
          onOpenProcessGate={processGate.openProcessGate}
          onOpenDeliver={page.openDeliverModal}
          onOpenEdit={() => page.setEditUnitModalOpen(true)}
        />

        <UnitDetailBodyCard
          activeTab={page.activeTab}
          onTabChange={page.setActiveTab}
          tabOptions={queries.tabOptions}
        >
          {page.activeTab === "overview" ? (
            <UnitOverviewTab
              unit={unit}
              stepCodes={unitProcessStepCodes}
              purchaseOrder={queries.purchaseOrder}
              purchaseOrderItem={queries.purchaseOrderItem}
              flatRow={flatRow}
              orderId={queries.orderId}
              planId={queries.planId}
              onNavigateTab={page.setActiveTab}
              deliveryHint={queries.deliveryHint}
              showResidualUndeliveredBadge={queries.showResidualUndeliveredBadge}
            />
          ) : null}
          {page.activeTab === "process" ? (
            <UnitProcessHistoryTab
              unit={unit}
              stepCodes={queries.visibleStepCodes}
              showProcessActions={showProcessGateButton}
              onOpenProcessGate={processGate.openProcessGate}
              onUploadAttachments={onUploadAttachments}
              uploadingRecordKey={page.uploadingProcessRecordKey}
            />
          ) : null}
          {page.activeTab === "rma" ? <UnitRmaTab unit={unit} /> : null}
        </UnitDetailBodyCard>
      </div>

      <UnitDetailDeliverModal
        isOpen={page.deliverModalOpen}
        unit={unit}
        processUnit={processUnit}
        accessToken={accessToken}
        deliverDate={page.deliverDate}
        onDeliverDateChange={page.setDeliverDate}
        deliverRemark={page.deliverRemark}
        onDeliverRemarkChange={page.setDeliverRemark}
        onClose={page.closeDeliverModal}
        deliverMutation={deliverMutation}
        sortedDeliverRecords={page.sortedDeliverRecords}
        deliverRecordsLoading={page.deliverRecordsLoading}
        unitId={unitId}
        onUploadAttachments={onUploadAttachments}
        uploadingRecordKey={page.uploadingProcessRecordKey}
      />

      <UnitDetailProcessGateModal
        processGate={processGate}
        visibleStepCodes={queries.visibleStepCodes}
      />

      {accessToken ? (
        <ProductionPlanUnitEditModal
          isOpen={page.editUnitModalOpen}
          onClose={() => page.setEditUnitModalOpen(false)}
          unit={processUnit}
          lineLabel={flatRow.lineLabel}
          flatRow={flatRow}
          accessToken={accessToken}
          operatorUserOptions={queries.operatorUserOptions}
          onSaved={() => {
            queryClient.invalidateQueries({
              queryKey: ["productionPlanUnit", unitId],
            });
            if (queries.planId) {
              queryClient.invalidateQueries({
                queryKey: ["productionPlan", queries.planId],
              });
            }
          }}
        />
      ) : null}
    </>
  );
}
