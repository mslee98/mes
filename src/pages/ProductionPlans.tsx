import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import { ProductionPlanListView } from "../components/production/ProductionPlanListView";

export default function ProductionPlans() {
  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 생산 계획"
        description="아이쓰리시스템(주) | 생산 계획"
      />
      <PageBreadcrumb pageTitle="생산 계획" />
      <div className="space-y-6">
        <ProductionPlanListView />
      </div>
    </>
  );
}
