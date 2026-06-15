import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import LoadingLottie from "../components/common/LoadingLottie";
import ConfirmModal from "../components/common/ConfirmModal";
import { DeliveryPlanDetailHeader } from "../components/delivery/deliveryPlanDetail/DeliveryPlanDetailHeader";
import { DeliveryPlanDetailSummaryRow } from "../components/delivery/deliveryPlanDetail/DeliveryPlanDetailSummaryRow";
import { DeliveryPlanDetailUnitsPanel } from "../components/delivery/deliveryPlanDetail/DeliveryPlanDetailUnitsPanel";
import { DeliveryPlanEditModal } from "../components/delivery/deliveryPlanDetail/DeliveryPlanEditModal";
import { DeliveryPlanAddUnitsModal } from "../components/delivery/deliveryPlanDetail/DeliveryPlanAddUnitsModal";
import { DeliveryPlanDeliverModal } from "../components/delivery/deliveryPlanDetail/DeliveryPlanDeliverModal";
import { useAuth } from "../hooks/useAuth";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_DELIVERY_PLAN_STATUS,
  COMMON_CODE_GROUP_UNIT_PROCESS_STATUS,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
} from "../api/commonCode";
import {
  getDeliveryPlan,
  removeUnitFromDeliveryPlan,
  type DeliveryPlanGroup,
  type DeliveryPlanUnitSummary,
} from "../api/purchaseOrder";
import { getUsers } from "../api/user";
import { notify } from "../lib/notify";
import { invalidateDeliveryPlanListQueries } from "../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import {
  canRegisterBulkDelivery,
  flattenDeliveryPlanUnits,
  isDeliveryPlanEditable,
  listReadyUndeliveredDeliveryPlanUnits,
  listSkippedForPlanDeliver,
  resolveDeliveryPlanOrderId,
  resolveReadyUndeliveredUnitCount,
  resolveUndeliveredUnitCount,
} from "../domains/delivery/helpers/deliveryPlanDetailHelpers";

export default function DeliveryPlanDetail() {
  const { planId } = useParams();
  const id = String(planId ?? "").trim();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadDelivery, canCreateDelivery } = useDeliveryPermissions();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addUnitsModalOpen, setAddUnitsModalOpen] = useState(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<DeliveryPlanUnitSummary | null>(
    null
  );

  const {
    data: plan,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["deliveryPlan", id],
    queryFn: () => getDeliveryPlan(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery && id !== "",
  });

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadDelivery }
  );

  const { data: deliveryPlanStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_PLAN_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadDelivery }
  );

  const { data: processStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadDelivery }
  );

  const { data: processStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadDelivery }
  );

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading && canReadDelivery,
  });

  const usersById = useMemo(() => {
    const map = new Map<number, string>();
    for (const user of users) {
      if (user.id != null) map.set(user.id, user.name);
    }
    return map;
  }, [users]);

  const managerName = useMemo(() => {
    if (!plan) return "-";
    const nested = plan.deliveryManager?.name?.trim();
    if (nested) return nested;
    const managerId = plan.deliveryManagerId;
    if (managerId != null && usersById.has(managerId)) {
      return usersById.get(managerId) ?? "-";
    }
    return "-";
  }, [plan, usersById]);

  const existingUnitIds = useMemo(() => {
    if (!plan) return new Set<string>();
    return new Set(
      flattenDeliveryPlanUnits(plan).map(({ unit }) => String(unit.id).trim())
    );
  }, [plan]);

  const purchaseOrderId = plan ? resolveDeliveryPlanOrderId(plan) : "";

  const readyUnitsToDeliver = useMemo(
    () => (plan ? listReadyUndeliveredDeliveryPlanUnits(plan) : []),
    [plan]
  );

  const skippedUnitsForDeliver = useMemo(
    () => (plan ? listSkippedForPlanDeliver(plan) : []),
    [plan]
  );

  const undeliveredUnitCount = plan ? resolveUndeliveredUnitCount(plan) : 0;
  const readyUnitCount = plan ? resolveReadyUndeliveredUnitCount(plan) : 0;
  const canDeliver = plan ? canRegisterBulkDelivery(plan) : false;

  const groupByUnitId = useMemo(() => {
    if (!plan) return undefined;
    const map = new Map<string, DeliveryPlanGroup>();
    for (const { unit, group } of flattenDeliveryPlanUnits(plan)) {
      map.set(String(unit.id).trim(), group);
    }
    return map;
  }, [plan]);

  const openDeliverModal = useCallback(() => {
    setDeliverModalOpen(true);
  }, []);

  const removeMutation = useMutation({
    mutationFn: async (unit: DeliveryPlanUnitSummary) => {
      return removeUnitFromDeliveryPlan(
        id,
        String(unit.id).trim(),
        accessToken!
      );
    },
    onSuccess: () => {
      notify.success("품목이 납품 계획에서 제거되었습니다.");
      setRemoveTarget(null);
      queryClient.invalidateQueries({ queryKey: ["deliveryPlan", id] });
      void invalidateDeliveryPlanListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["productionPlanUnits"] });
    },
    onError: (e: Error) => {
      notify.error(e.message || "품목 제거에 실패했습니다.");
    },
  });

  if (!canReadDelivery) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400/90">
        납품 계획 조회 권한이 없습니다.
      </p>
    );
  }

  if (isLoading || isAuthLoading) {
    return <LoadingLottie message="납품 계획을 불러오는 중입니다." />;
  }

  if (isError || !plan) {
    return (
      <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
        {error instanceof Error
          ? error.message
          : "납품 계획을 불러오지 못했습니다."}
      </div>
    );
  }

  const editable = isDeliveryPlanEditable(plan.status);

  return (
    <>
      <PageMeta
        title={`아이쓰리시스템(주) | 납품 계획 ${plan.planNo ?? id}`}
        description="아이쓰리시스템(주) | 납품 계획 상세"
      />
      <PageBreadcrumb pageTitle="납품 계획 상세" />

      <div className="min-w-0 space-y-6">
        <DeliveryPlanDetailHeader
          plan={plan}
          countryCodes={countryCodes}
          deliveryPlanStatusCodes={deliveryPlanStatusCodes}
          managerName={managerName}
          canCreateDelivery={canCreateDelivery}
          canDeliver={canDeliver}
          undeliveredUnitCount={undeliveredUnitCount}
          readyUnitCount={readyUnitCount}
          skippedUnitCount={skippedUnitsForDeliver.length}
          onEditClick={() => setEditModalOpen(true)}
          onAddUnitsClick={() => setAddUnitsModalOpen(true)}
          onDeliverClick={openDeliverModal}
        />

        <section className="rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-white/[0.06] dark:bg-white/[0.03]">
          <DeliveryPlanDetailSummaryRow plan={plan} />
        </section>

        <DeliveryPlanDetailUnitsPanel
          plan={plan}
          processStatusCodes={processStatusCodes}
          processStepCodes={processStepCodes}
          editable={editable}
          onRemove={(unit) => {
            if (!editable) return;
            setRemoveTarget(unit);
          }}
        />
      </div>

      <DeliveryPlanEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        plan={plan}
        planId={id}
      />

      <DeliveryPlanAddUnitsModal
        isOpen={addUnitsModalOpen}
        onClose={() => setAddUnitsModalOpen(false)}
        planId={id}
        purchaseOrderId={purchaseOrderId}
        existingUnitIds={existingUnitIds}
      />

      {canCreateDelivery ? (
        <DeliveryPlanDeliverModal
          isOpen={deliverModalOpen}
          onClose={() => setDeliverModalOpen(false)}
          planId={id}
          purchaseOrderId={purchaseOrderId}
          readyUnitsToDeliver={readyUnitsToDeliver}
          skippedUnits={skippedUnitsForDeliver}
          undeliveredUnitCount={undeliveredUnitCount}
          groupByUnitId={groupByUnitId}
        />
      ) : null}

      <ConfirmModal
        isOpen={removeTarget != null}
        title="품목 제거"
        message={`${removeTarget?.unitCode?.trim() || removeTarget?.id || "선택한 품목"}을(를) 이 납품 계획에서 제거할까요?`}
        confirmText="제거"
        confirmVariant="danger"
        isConfirming={removeMutation.isPending}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeMutation.mutate(removeTarget);
        }}
      />
    </>
  );
}
