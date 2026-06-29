import { useState, useRef } from "react";
import { useParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import LoadingLottie from "../components/common/LoadingLottie";
import { OrderReceiveConfirmModal } from "../components/order/OrderReceiveConfirmModal";
import { OrderDetailLinkUnitsModal } from "../components/order/OrderDetailLinkUnitsModal";
import { useAuth } from "../hooks/useAuth";
import {
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type Partner,
  type Delivery,
  type ProductionPlan,
} from "../api/purchaseOrder";
import type { OrderDetailDeliveryMutationVars } from "../features/order-detail/hooks/useOrderDetailMutations";
import { partnerSelectLabel } from "../domains/partner/display/partnerDisplay";
import { partnerCountryFlagUrl } from "../domains/partner/helpers/partnerCountryOptions";
import { useOrderDetailQueries } from "../features/order-detail/hooks/useOrderDetailQueries";
import { useOrderDetailDeliveryModal } from "../features/order-detail/hooks/useOrderDetailDeliveryModal";
import { useOrderDetailMutations } from "../features/order-detail/hooks/useOrderDetailMutations";
import { OrderDetailHeaderSection } from "../features/order-detail/sections/OrderDetailHeaderSection";
import { OrderDetailLinesSection } from "../features/order-detail/sections/OrderDetailLinesSection";
import { OrderDetailProductionSection } from "../features/order-detail/sections/OrderDetailProductionSection";
import { OrderDetailDeliveryModalSection } from "../features/order-detail/sections/OrderDetailDeliveryModalSection";
import { LEGACY_USER_PREFIX } from "../lib/legacySelectValue";

function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const t = selectValue.trim();
  if (!t || t.startsWith(LEGACY_USER_PREFIX)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * 접수 / 생산 계획 / 실제 생산
 * -----------------------------------------------------------------
 * - 접수: PUT `.../purchase-orders/:id` (status=PO_CLOSED) — 발주 즉시 종결.
 * - 생산 계획: POST `.../production-plans` — `ProductionPlanCreatePayload`, 종결 후 등록, 상세는 `/order/:id/plan/:planId`.
 * - 실제 생산: POST `.../deliveries` — `PO_CLOSED` 일 때만 허용; 저장 후 Unit 연결 모달에서 `delivery-items/:id/units`.
 *
 * UI: 과거 테이블형 상세(`?layout=classic`)는 제거됨 — 카드형 요약 레이아웃만 유지합니다.
 */
export default function OrderDetail() {
  const { orderId } = useParams();
  const id = String(orderId ?? "").trim();
  const { user: authUser, accessToken, isLoading: isAuthLoading } = useAuth();

  const [receiveConfirmOpen, setReceiveConfirmOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const onDeliverySuccessRef = useRef<
    (data: ProductionPlan | Delivery, vars: OrderDetailDeliveryMutationVars) => void
  >(() => {});

  const queries = useOrderDetailQueries({
    orderId: id,
    accessToken,
    isAuthLoading,
    authUser,
    deliveryModalOpen,
  });

  const {
    order,
    orderLoading,
    orderError,
    files,
    deliveries,
    poProductionPlans,
    nextProductionPlanSeq,
    deliveredByOrderItemId,
    registeredByOrderItemId,
    countryCodes,
    lotYearCodes,
    users,
    currentUserId,
    departmentOptionsFromTree,
    orderLineSummaries,
    orderLines,
  } = queries;

  const { receiveMutation, deliveryMutation } = useOrderDetailMutations({
    orderId: id,
    accessToken,
    onReceiveSuccess: () => setReceiveConfirmOpen(false),
    onDeliverySuccess: (data, vars) => onDeliverySuccessRef.current(data, vars),
  });

  const deliveryModal = useOrderDetailDeliveryModal({
    orderId: id,
    accessToken,
    order: order as PurchaseOrderDetail | undefined,
    orderLines,
    deliveries: deliveries as Delivery[],
    nextProductionPlanSeq,
    deliveredByOrderItemId,
    registeredByOrderItemId,
    lotYearCodes,
    departmentOptionsFromTree,
    users,
    deliveryMutation,
    deliveryModalOpen,
    setDeliveryModalOpen,
  });

  onDeliverySuccessRef.current = deliveryModal.handleDeliveryMutationSuccess;

  if (orderLoading || !order) {
    return (
      <>
        <PageMeta title="발주 상세" description="발주 상세" />
        <PageBreadcrumb pageTitle="발주 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          {orderLoading && <LoadingLottie />}
          {!orderLoading && orderError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              발주를 불러오지 못했습니다.
            </p>
          )}
        </div>
      </>
    );
  }

  const po = order as PurchaseOrderDetail;
  const createdById = po.createdBy?.id;
  const isPoClosed =
    String(po.status ?? po.orderStatus ?? "").trim() === "PO_CLOSED";
  const canRegisterDelivery = isPoClosed;
  const isAuthor =
    createdById == null ||
    (currentUserId != null && createdById === currentUserId);
  const canEditOrder = !isPoClosed && isAuthor;
  const canShowReceiveButton = !isPoClosed && isAuthor;

  const partnerName = partnerSelectLabel(
    po.partner as Partner | undefined,
    countryCodes
  );
  const partnerFlagUrl = partnerCountryFlagUrl(
    String((po.partner as Partner | undefined)?.countryCode ?? "")
  );
  const partnerNameWithFlag = (
    <span className="inline-flex items-center gap-2">
      {partnerFlagUrl ? (
        <img
          src={partnerFlagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : null}
      <span className="min-w-0">{partnerName}</span>
    </span>
  );

  const orderTotalQty = orderLines.reduce(
    (sum, line) => sum + (Number(line.qty) || 0),
    0
  );
  const orderRegisteredQty = orderLines.reduce(
    (sum, line) => sum + (registeredByOrderItemId.get(line.id) ?? 0),
    0
  );

  const submitDisabled =
    deliveryMutation.isPending ||
    !deliveryModal.hasDeliveryTargets ||
    (deliveryModal.deliveryModalPurpose === "plan"
      ? deliveryModal.thisProductionQty <= 0 ||
        !deliveryModal.deliveryDate.trim() ||
        !deliveryModal.plannedDeliveryDate.trim() ||
        deliveryModal.deliveryLotPreviewRows.length === 0
      : deliveryModal.deliverySerialPreviewRows.length === 0);

  return (
    <>
      <PageMeta title={`발주 ${po.orderNo}`} description={`발주 ${po.orderNo} 상세`} />
      <PageBreadcrumb pageTitle={`발주 상세 · ${po.orderNo}`} />

      <div className="space-y-4">
        <OrderDetailHeaderSection
          orderId={id}
          po={po}
          partnerNameWithFlag={partnerNameWithFlag}
          files={files as PurchaseOrderFile[]}
          accessToken={accessToken!}
          canShowReceiveButton={canShowReceiveButton}
          canEditOrder={canEditOrder}
          canRegisterDelivery={canRegisterDelivery}
          orderTotalQty={orderTotalQty}
          orderRegisteredQty={orderRegisteredQty}
          planCount={poProductionPlans.length}
          onReceiveClick={() => setReceiveConfirmOpen(true)}
          onOpenPlanModal={() => deliveryModal.openDeliveryRegistrationModal("plan")}
        />

        <OrderDetailLinesSection
          orderLines={orderLines}
          defaultCurrencyCode={po.currencyCode ?? "KRW"}
          orderLineSummaries={orderLineSummaries}
          registeredQtyByOrderItemId={registeredByOrderItemId}
        />

        <OrderDetailProductionSection
          purchaseOrderId={id}
          accessToken={accessToken ?? ""}
          isAuthLoading={isAuthLoading}
          canCreate={canRegisterDelivery}
          onOpenPlanModal={() => deliveryModal.openDeliveryRegistrationModal("plan")}
        />
      </div>

      <OrderReceiveConfirmModal
        isOpen={receiveConfirmOpen}
        isConfirming={receiveMutation.isPending}
        onClose={() => setReceiveConfirmOpen(false)}
        onConfirm={() => receiveMutation.mutate()}
      />

      <OrderDetailDeliveryModalSection
        isOpen={deliveryModal.deliveryModalOpen}
        onClose={deliveryModal.closeDeliveryModal}
        purpose={deliveryModal.deliveryModalPurpose}
        po={po}
        partnerNameWithFlag={partnerNameWithFlag}
        orderLines={orderLines}
        isAuthLoading={isAuthLoading}
        deliveryDate={deliveryModal.deliveryDate}
        onDeliveryDateChange={deliveryModal.setDeliveryDate}
        plannedDeliveryDate={deliveryModal.plannedDeliveryDate}
        onPlannedDeliveryDateChange={deliveryModal.setPlannedDeliveryDate}
        deliveryManagerUserSelectValue={deliveryModal.deliveryManagerUserSelectValue}
        onDeliveryManagerUserSelectValueChange={
          deliveryModal.setDeliveryManagerUserSelectValue
        }
        deliveryManagerUserOptions={deliveryModal.deliveryManagerUserOptions}
        deliveryRemark={deliveryModal.deliveryRemark}
        onDeliveryRemarkChange={deliveryModal.setDeliveryRemark}
        deliverySerialQtyInput={deliveryModal.deliverySerialQtyInput}
        onDeliverySerialQtyInputChange={deliveryModal.setDeliverySerialQtyInput}
        orderTotalQty={deliveryModal.orderTotalQty}
        orderConsumedQty={deliveryModal.orderConsumedQty}
        thisProductionQty={deliveryModal.thisProductionQty}
        orderRemainingQty={deliveryModal.orderRemainingQty}
        displayedRemainingQty={deliveryModal.displayedRemainingQty}
        hasDeliveryTargets={deliveryModal.hasDeliveryTargets}
        deliveryLotPreviewRows={deliveryModal.deliveryLotPreviewRows}
        deliverySerialPreviewRows={deliveryModal.deliverySerialPreviewRows}
        isLotBulkOperatorPopoverOpen={deliveryModal.isLotBulkOperatorPopoverOpen}
        onToggleLotBulkOperatorPopover={() =>
          deliveryModal.setIsLotBulkOperatorPopoverOpen((prev) => !prev)
        }
        lotBulkOperatorPopoverRef={deliveryModal.lotBulkOperatorPopoverRef}
        deliveryLotBulkOperatorUserValue={deliveryModal.deliveryLotBulkOperatorUserValue}
        onDeliveryLotBulkOperatorUserValueChange={
          deliveryModal.setDeliveryLotBulkOperatorUserValue
        }
        operatorUserOptions={deliveryModal.operatorUserOptions}
        onApplyBulkOperatorUser={deliveryModal.applyBulkOperatorUserToLotPreviewRows}
        onCloseLotBulkOperatorPopover={() =>
          deliveryModal.setIsLotBulkOperatorPopoverOpen(false)
        }
        canApplyBulkOperator={
          deliveryManagerUserIdFromSelect(
            deliveryModal.deliveryLotBulkOperatorUserValue
          ) != null
        }
        isLotRulePopoverOpen={deliveryModal.isLotRulePopoverOpen}
        onToggleLotRulePopover={() =>
          deliveryModal.setIsLotRulePopoverOpen((v) => !v)
        }
        onUpdateLotPreviewOperatorUser={
          deliveryModal.updateDeliveryLotPreviewOperatorUser
        }
        isSerialRulePopoverOpen={deliveryModal.isSerialRulePopoverOpen}
        onToggleSerialRulePopover={() =>
          deliveryModal.setIsSerialRulePopoverOpen((v) => !v)
        }
        lotYearCodes={lotYearCodes}
        onUpdateSerialPreviewSerialNo={
          deliveryModal.updateDeliverySerialPreviewSerialNo
        }
        isSubmitPending={deliveryMutation.isPending}
        onSubmit={deliveryModal.submitDeliveryModal}
        onCancel={() => {
          deliveryModal.closeDeliveryModal();
        }}
        submitDisabled={submitDisabled}
      />

      <OrderDetailLinkUnitsModal
        isOpen={deliveryModal.linkUnitsModalOpen}
        onClose={() => {
          deliveryModal.setLinkUnitsModalOpen(false);
          deliveryModal.setLinkUnitsDelivery(null);
        }}
        delivery={deliveryModal.linkUnitsDelivery}
        purchaseOrderId={id}
        accessToken={accessToken ?? ""}
      />
    </>
  );
}
