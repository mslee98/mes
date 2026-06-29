import type { ProductionPlanItem } from "../../../api/purchaseOrder";
import { ProductionPlanDetailLinesTab } from "../../../components/production-plan/ProductionPlanDetailLinesTab";
import { ProductionPlanDetailSummaryTab } from "../../../components/production-plan/ProductionPlanDetailSummaryTab";
import type { CommonCodeItem } from "../../../api/commonCode";
import type { ProductionPlan } from "../../../api/purchaseOrder";

type ProductionPlanUnitsSectionProps = {
  items: ProductionPlanItem[];
};

export function ProductionPlanUnitsSection({
  items,
}: ProductionPlanUnitsSectionProps) {
  return <ProductionPlanDetailLinesTab items={items} />;
}

type ProductionPlanSummarySectionProps = {
  plan: ProductionPlan;
  productionPlanStatusCodes: CommonCodeItem[];
};

export function ProductionPlanSummarySection({
  plan,
  productionPlanStatusCodes,
}: ProductionPlanSummarySectionProps) {
  return (
    <ProductionPlanDetailSummaryTab
      plan={plan}
      productionPlanStatusCodes={productionPlanStatusCodes}
    />
  );
}
