import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DeliveryUnits from "./DeliveryUnits";
import {
  unitListBreadcrumbTitle,
  unitListMetaDescription,
  unitListPageTitle,
} from "../domains/production-plan/helpers/unitListPerspective";

const MODE = "overview-units" as const;

export default function ProductionUnits() {
  const pageTitle = unitListPageTitle(MODE);

  return (
    <>
      <PageMeta
        title={`아이쓰리시스템(주) | ${pageTitle}`}
        description={unitListMetaDescription(MODE)}
      />
      <PageBreadcrumb pageTitle={unitListBreadcrumbTitle(MODE)} />
      <div className="space-y-6">
        <DeliveryUnits mode={MODE} embedded />
      </div>
    </>
  );
}
