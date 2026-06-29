import type { ReactNode } from "react";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { ProductionPlan, ProductionPlanUnit } from "../../../api/purchaseOrder";
import type { FlatPlanUnitRow } from "../../../domains/production-plan/helpers/detailHelpers";
import type { ProductionPlanDetailTab } from "../../../components/production-plan/productionPlanDetailTabTypes";
import { ProductionPlanDetailOverviewTab } from "../../../components/production-plan/ProductionPlanDetailOverviewTab";

type ProductionPlanOverviewSectionProps = {
  plan: ProductionPlan;
  orderId: string;
  orderNo?: string;
  partnerLabel: ReactNode;
  flatUnits: FlatPlanUnitRow[];
  unitProcessStepCodes: CommonCodeItem[];
  selectedUnitIds: Set<string>;
  onSelectedUnitIdsChange: (ids: Set<string>) => void;
  splitDisabledReason: string | null;
  onSplitClick: () => void;
  onProcess: (unit: ProductionPlanUnit) => void;
  onDeliver: (args: {
    unit: ProductionPlanUnit;
    purchaseOrderItemId?: number | null;
  }) => void;
  onRecords: (unitId: string) => void;
  onNavigateTab: (tab: ProductionPlanDetailTab) => void;
};

export function ProductionPlanOverviewSection({
  plan,
  orderId,
  orderNo,
  partnerLabel,
  flatUnits,
  unitProcessStepCodes,
  selectedUnitIds,
  onSelectedUnitIdsChange,
  splitDisabledReason,
  onSplitClick,
  onProcess,
  onDeliver,
  onRecords,
  onNavigateTab,
}: ProductionPlanOverviewSectionProps) {
  return (
    <ProductionPlanDetailOverviewTab
      plan={plan}
      orderId={orderId}
      orderNo={orderNo}
      partnerLabel={partnerLabel}
      flatUnits={flatUnits}
      unitProcessStepCodes={unitProcessStepCodes}
      selectedUnitIds={selectedUnitIds}
      onSelectedUnitIdsChange={onSelectedUnitIdsChange}
      splitDisabledReason={splitDisabledReason}
      onSplitClick={onSplitClick}
      onProcess={onProcess}
      onDeliver={onDeliver}
      onRecords={onRecords}
      onNavigateTab={onNavigateTab}
    />
  );
}
