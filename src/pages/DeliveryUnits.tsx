import { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import SegmentedControl from "../components/common/SegmentedControl";
import DatePicker from "../components/form/date-picker";
import Select from "../components/form/Select";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
  ListTabCountBadge,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import Button from "../components/ui/button/Button";
import { DeliveryPlanCreateModal } from "../components/delivery/DeliveryPlanCreateModal";
import { DeliveryUnitListRow } from "../components/production/DeliveryUnitListRow";
import { useAuth } from "../hooks/useAuth";
import { useDeliveryPermissions } from "../hooks/useDeliveryPermissions";
import { useDeliveryPlanUnitSelection } from "../hooks/useDeliveryPlanUnitSelection";
import {
  type UnitListMode,
  unitListBreadcrumbTitle,
  unitListMetaDescription,
  unitListPageTitle,
} from "../domains/production-plan/helpers/unitListPerspective";
import {
  dateBasisLabel,
  useProductionPlanUnitListPage,
} from "../domains/production-plan/hooks/useProductionPlanUnitListPage";
import {
  DELIVERY_UNIT_COLUMN_ALIGN,
  DELIVERY_UNIT_TABLE_MIN_WIDTH_PX,
  deliveryUnitTableGridTemplate,
  deliveryUnitTableLayout,
  deliveryUnitTableTrackCount,
} from "../domains/delivery/layout/deliveryUnitDataTableLayout";
import type { ProductionPlanUnitPerspective } from "../api/purchaseOrder";

type DeliveryUnitsProps = {
  /** @deprecated perspective 대신 mode 사용 */
  perspective?: ProductionPlanUnitPerspective;
  mode?: UnitListMode;
  embedded?: boolean;
};

export default function DeliveryUnits({
  perspective: perspectiveProp,
  mode: modeProp,
  embedded = false,
}: DeliveryUnitsProps) {
  const mode: UnitListMode =
    modeProp ??
    (perspectiveProp === "delivery" ? "delivery" : "overview-units");

  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canCreateDelivery } = useDeliveryPermissions();

  const {
    selectedItems,
    selectedCount,
    toggle,
    clear,
    isSelected,
    isRowCheckboxDisabled,
    getRowCheckboxOrderMismatchHint,
  } = useDeliveryPlanUnitSelection();

  const [createPlanOpen, setCreatePlanOpen] = useState(false);

  const {
    perspective,
    isOverviewUnits,
    unitProcessStepCodes,
    countryCodes,
    searchOptionsOpen,
    setSearchOptionsOpen,
    searchKeyword,
    setSearchKeyword,
    tab,
    setTab,
    assignmentView,
    setAssignmentView,
    setFromMonth,
    setToMonth,
    dateBasis,
    setDateBasis,
    page,
    setPage,
    safeFromMonth,
    safeToMonth,
    hasMonthRange,
    overviewData,
    listItems,
    tabOptions,
    assignmentOptions,
    listPagination,
    isLoading,
    error,
    handleSearchReset,
    showAssignmentFilter,
    statusSectionTitle,
  } = useProductionPlanUnitListPage({
    mode,
    accessToken,
    isAuthLoading,
  });

  const reserveCheckboxColumn = isOverviewUnits && canCreateDelivery;
  const showCheckboxColumn = reserveCheckboxColumn;

  const unitTableLayout = useMemo(
    () => deliveryUnitTableLayout({ showCheckbox: reserveCheckboxColumn }),
    [reserveCheckboxColumn]
  );

  const unitTableGridColumns = useMemo(
    () => deliveryUnitTableGridTemplate({ showCheckbox: reserveCheckboxColumn }),
    [reserveCheckboxColumn]
  );

  const tableTrackCount = deliveryUnitTableTrackCount();

  useEffect(() => {
    clear();
  }, [assignmentView, tab, perspective, clear]);

  const segmentedTabOptions = useMemo(
    () =>
      tabOptions.map((option) => ({
        value: option.value,
        label: (
          <span className="inline-flex items-center gap-2">
            <span>{option.label}</span>
            <ListTabCountBadge count={option.badgeCount} tone={option.badgeTone} />
          </span>
        ),
      })),
    [tabOptions]
  );

  const onSearchReset = () => {
    handleSearchReset();
    clear();
  };

  const pageDesc = isOverviewUnits
    ? "생산 진행과 납품 등록 상태를 확인하고, 유닛을 선택해 납품 계획을 등록합니다."
    : "납품 계획에 포함된 유닛만 표시됩니다.";

  const pageTitle = unitListPageTitle(mode);
  const showStatusTabs = true;

  return (
    <>
      {!embedded ? (
        <>
          <PageMeta
            title={`아이쓰리시스템(주) | ${pageTitle}`}
            description={unitListMetaDescription(mode)}
          />
          <PageBreadcrumb pageTitle={unitListBreadcrumbTitle(mode)} />
        </>
      ) : null}
      <div className={embedded ? "" : "space-y-6"}>
        <ListPageLayout
          title={pageTitle}
          desc={pageDesc}
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="delivery-unit-search"
                  placeholder="계획·유닛·시리얼·사업명·제품명·공정·업체 검색"
                  value={searchKeyword}
                  onChange={(v) => {
                    setSearchKeyword(v);
                    setPage(1);
                  }}
                />
              }
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  {showCheckboxColumn && selectedCount > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {selectedCount}건 선택
                      </span>
                      <Button
                        size="sm"
                        onClick={() => setCreatePlanOpen(true)}
                      >
                        납품 계획 만들기
                      </Button>
                    </>
                  ) : null}
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((open) => !open)}
                  />
                </div>
              }
            />
          }
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div className="min-w-0 flex-1 sm:max-w-[10rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  시작 월
                </label>
                <DatePicker
                  id="delivery-units-from-month"
                  value={safeFromMonth ? `${safeFromMonth}-01` : ""}
                  monthOnly
                  onValueChange={(v) => {
                    setFromMonth(String(v ?? "").slice(0, 7));
                    setPage(1);
                  }}
                  compact
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[10rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  종료 월
                </label>
                <DatePicker
                  id="delivery-units-to-month"
                  value={safeToMonth ? `${safeToMonth}-01` : ""}
                  monthOnly
                  onValueChange={(v) => {
                    setToMonth(String(v ?? "").slice(0, 7));
                    setPage(1);
                  }}
                  compact
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  기준일
                </label>
                <Select
                  size="sm"
                  options={[
                    { value: "planned", label: dateBasisLabel("planned") },
                    { value: "delivery", label: dateBasisLabel("delivery") },
                    { value: "coalesce", label: dateBasisLabel("coalesce") },
                  ]}
                  placeholder="기준일"
                  defaultValue={dateBasis}
                  onChange={(v) => {
                    setDateBasis(v as typeof dateBasis);
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={onSearchReset}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  초기화
                </button>
              </div>
            </>
          }
          belowSearchOptions={
            <div className="space-y-2 border-b border-gray-100 pt-2 pb-3 dark:border-white/[0.05]">
              {showStatusTabs ? (
                <>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {statusSectionTitle}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
                    <SegmentedControl
                      ariaLabel="유닛 상태 탭"
                      value={tab}
                      onChange={(nextTab) => {
                        setTab(nextTab);
                        setPage(1);
                      }}
                      options={segmentedTabOptions}
                      className="min-w-0 flex-1"
                    />
                    {showAssignmentFilter ? (
                      <div className="flex w-full shrink-0 flex-col gap-1 sm:w-auto sm:min-w-[16rem]">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          납품 배정
                        </p>
                        <SegmentedControl
                          ariaLabel="납품 계획 배정 필터"
                          value={assignmentView}
                          onChange={(next) => {
                            setAssignmentView(next);
                            setPage(1);
                          }}
                          options={assignmentOptions}
                          className="w-full"
                        />
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  생산 상태는 각 행의 뱃지로 표시됩니다. 상태별로 좁히려면 검색
                  옵션을 사용하세요.
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                조회 범위:{" "}
                {hasMonthRange ? `${safeFromMonth} ~ ${safeToMonth}` : "전체 기간"} / 기준일:{" "}
                {dateBasisLabel(dateBasis)} / 총{" "}
                {overviewData?.summary?.all ??
                  overviewData?.summary?.total ??
                  0}
                건
              </p>
            </div>
          }
          pagination={!isLoading && !error ? <TablePagination {...listPagination} /> : null}
        >
          {isLoading ? (
            <ListPageLoading
              message="생산 유닛 목록을 불러오는 중입니다."
              skeletonRows={8}
              minHeight={320}
            />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <DataTable
              fillWidth
              minWidth={DELIVERY_UNIT_TABLE_MIN_WIDTH_PX}
            >
              <DataTableHeader
                gridTemplateColumns={unitTableGridColumns}
              >
                {reserveCheckboxColumn ? (
                  <DataTableHeaderCell
                    colSpan={unitTableLayout.checkbox}
                    compact
                    sortable={false}
                    align={DELIVERY_UNIT_COLUMN_ALIGN.checkbox}
                  >
                    {showCheckboxColumn ? (
                      <span className="sr-only">선택</span>
                    ) : null}
                  </DataTableHeaderCell>
                ) : null}
                <DataTableHeaderCell
                  colSpan={unitTableLayout.no}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.no}
                >
                  <DataTableHeaderLabel align="center">No.</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.lot}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.lot}
                >
                  <DataTableHeaderLabel>LOT</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.item}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.item}
                >
                  <DataTableHeaderLabel>품목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.serial}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.serial}
                >
                  <DataTableHeaderLabel>S/N</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.partner}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.partner}
                >
                  <DataTableHeaderLabel>고객</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.operator}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.operator}
                >
                  <DataTableHeaderLabel align="center">생산 담당</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.process}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.process}
                >
                  <DataTableHeaderLabel align="center">공정</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.status}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.status}
                >
                  <DataTableHeaderLabel align="center">상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.orderPlan}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.orderPlan}
                >
                  <DataTableHeaderLabel>발주·계획</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.dates}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.dates}
                >
                  <DataTableHeaderLabel>일정</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={unitTableLayout.delay}
                  compact
                  sortable={false}
                  align={DELIVERY_UNIT_COLUMN_ALIGN.delay}
                >
                  <DataTableHeaderLabel align="center">지연</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {(listItems ?? []).length === 0 ? (
                  <DataTableRow
                    gridTemplateColumns={unitTableGridColumns}
                  >
                    <DataTableCell
                      colSpan={tableTrackCount}
                      compact
                      align="center"
                      className="py-4 text-theme-xs text-gray-500 dark:text-gray-400"
                    >
                      조건에 맞는 유닛이 없습니다.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  listItems.map((row, index) => (
                    <DeliveryUnitListRow
                      key={row.unitId}
                      row={row}
                      index={index}
                      page={page}
                      pageSize={listPagination.pageSize}
                      tab={tab}
                      perspective={perspective}
                      mode={mode}
                      unitProcessStepCodes={unitProcessStepCodes}
                      countryCodes={countryCodes}
                      layout={unitTableLayout}
                      gridTemplateColumns={unitTableGridColumns}
                      showCheckbox={showCheckboxColumn}
                      reserveCheckboxColumn={reserveCheckboxColumn}
                      checked={isSelected(row.unitId)}
                      checkboxDisabled={isRowCheckboxDisabled(row)}
                      checkboxOrderMismatchHint={getRowCheckboxOrderMismatchHint(row)}
                      onToggle={toggle}
                    />
                  ))
                )}
              </DataTableBody>
            </DataTable>
          )}
        </ListPageLayout>
      </div>

      {isOverviewUnits ? (
        <DeliveryPlanCreateModal
          isOpen={createPlanOpen}
          onClose={() => setCreatePlanOpen(false)}
          selectedUnits={selectedItems}
          onSuccess={() => {
            clear();
            setCreatePlanOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
