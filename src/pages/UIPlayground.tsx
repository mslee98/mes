import { useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import { useAuth } from "../hooks/useAuth";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { PARTNER_TYPE_SUPPLIER, PARTNER_SUPPLIER_SEGMENT_OTHER } from "../domains/partner/helpers/partnerPredicates";
import { partnerSelectLabel } from "../domains/partner/display/partnerDisplay";
import { UiPlaygroundTabNav } from "./ui-playground/UiPlaygroundTabNav";
import { UiPlaygroundGeneralTab } from "./ui-playground/UiPlaygroundGeneralTab";
import { UiPlaygroundFormTab } from "./ui-playground/UiPlaygroundFormTab";
import { UiPlaygroundTableTab } from "./ui-playground/UiPlaygroundTableTab";
import type { UiPlaygroundTab } from "./ui-playground/types";

export default function UIPlayground() {
  const [activeTab, setActiveTab] = useState<UiPlaygroundTab>("general");
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const queryEnabled = !!accessToken && !isAuthLoading;
  const { countryCodes } = usePartnerCommonCodes(accessToken, queryEnabled);
  const {
    data: otherSuppliers = [],
    isLoading: isPartnerQueryLoading,
    error: partnerQueryError,
  } = usePartnersQuery(
    accessToken,
    {
      type: PARTNER_TYPE_SUPPLIER,
      supplierSegmentCode: PARTNER_SUPPLIER_SEGMENT_OTHER,
    },
    { enabled: queryEnabled }
  );

  const supplierPreview = useMemo(
    () =>
      otherSuppliers
        .slice(0, 5)
        .map((partner) => partnerSelectLabel(partner, countryCodes)),
    [otherSuppliers, countryCodes]
  );

  return (
    <>
      <PageMeta title="UI 디자인 시스템" description="UI 디자인 시스템" />
      <PageBreadcrumb pageTitle="UI 디자인 시스템" />

      <div className="space-y-6">
        <ComponentCard
          title="UI Playground"
          desc="General · Form · Table 탭으로 공통 컴포넌트를 섹션별로 확인합니다."
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            URL: <code>/ui</code>
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <strong>General</strong> — Button, Badge, Modal, Tooltip, Query
              패턴
            </li>
            <li>
              <strong>Form</strong> — Input, 서브텍스트(helpText), FormField,
              Radio, Checkbox, DatePicker 등
            </li>
            <li>
              <strong>Table</strong> — Table primitives, CollapsibleDataTable,
              DataTable (grid)
            </li>
          </ul>
        </ComponentCard>

        <UiPlaygroundTabNav activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "general" ? (
            <UiPlaygroundGeneralTab
              supplierPreview={supplierPreview}
              isPartnerQueryLoading={isPartnerQueryLoading}
              partnerQueryError={
                partnerQueryError instanceof Error ? partnerQueryError : null
              }
              otherSuppliersCount={otherSuppliers.length}
            />
          ) : null}
          {activeTab === "form" ? <UiPlaygroundFormTab /> : null}
          {activeTab === "table" ? <UiPlaygroundTableTab /> : null}
        </UiPlaygroundTabNav>
      </div>
    </>
  );
}
