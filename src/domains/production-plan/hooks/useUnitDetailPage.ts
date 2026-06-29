import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getProductionPlanUnitProcessRecords } from "../../../api/purchaseOrder";
import { formatDateYmd } from "../../../lib/format/dateFormat";
import {
  parseUnitDetailTab,
  type UnitDetailTab,
} from "../../../components/unit/unitDetailTabTypes";
import type { ProductionPlanUnitDetail } from "../../../api/purchaseOrder";
import type { PurchaseOrderDetail } from "../../../api/purchaseOrder";

type UseUnitDetailPageParams = {
  unit: ProductionPlanUnitDetail | undefined;
  purchaseOrder: PurchaseOrderDetail | undefined;
  unitId: string;
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
};

export function useUnitDetailPage({
  unit,
  purchaseOrder,
  unitId,
  accessToken,
  isAuthLoading,
}: UseUnitDetailPageParams) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseUnitDetailTab(searchParams.get("tab"));

  const setActiveTab = useCallback(
    (tab: UnitDetailTab) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      if (tab !== "rma") next.delete("rmaId");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const [editUnitModalOpen, setEditUnitModalOpen] = useState(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverDate, setDeliverDate] = useState("");
  const [deliverRemark, setDeliverRemark] = useState("");
  const [uploadingProcessRecordKey, setUploadingProcessRecordKey] = useState<
    string | null
  >(null);

  const planDeliveryDate = useMemo(() => {
    if (!unit) return new Date().toISOString().slice(0, 10);
    return (
      [
        unit.plan?.deliveryDate,
        unit.plan?.plannedDate,
        unit.dueDate,
        purchaseOrder?.requestDeliveryDate,
        purchaseOrder?.dueDate,
      ]
        .map((x) => formatDateYmd(x, { emptyFallback: "" }))
        .find((s) => s && s !== "-") ?? new Date().toISOString().slice(0, 10)
    );
  }, [unit, purchaseOrder]);

  const openDeliverModal = useCallback(() => {
    setDeliverModalOpen(true);
    setDeliverDate(planDeliveryDate);
  }, [planDeliveryDate]);

  const closeDeliverModal = useCallback(() => {
    setDeliverModalOpen(false);
    setDeliverRemark("");
  }, []);

  const { data: deliverRecords = [], isLoading: deliverRecordsLoading } = useQuery({
    queryKey: ["productionPlanUnitProcessRecords", unitId, "deliver"],
    queryFn: () => getProductionPlanUnitProcessRecords(unitId, accessToken!),
    enabled:
      deliverModalOpen && !!accessToken && !isAuthLoading && !!unitId,
  });

  const sortedDeliverRecords = useMemo(() => {
    return [...deliverRecords].sort((a, b) => (a.processSeq ?? 0) - (b.processSeq ?? 0));
  }, [deliverRecords]);

  return {
    activeTab,
    setActiveTab,
    editUnitModalOpen,
    setEditUnitModalOpen,
    deliverModalOpen,
    deliverDate,
    setDeliverDate,
    deliverRemark,
    setDeliverRemark,
    uploadingProcessRecordKey,
    setUploadingProcessRecordKey,
    planDeliveryDate,
    openDeliverModal,
    closeDeliverModal,
    sortedDeliverRecords,
    deliverRecordsLoading,
  };
}
