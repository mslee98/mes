import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import SegmentedControl from "../components/common/SegmentedControl";
import Input from "../components/form/input/InputField";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import PartnerQuickCreateModal from "../components/form/PartnerQuickCreateModal";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DataListSearchInput,
  DataListPrimaryActionButton,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
  ListTabCountBadge,
  StatusBadgeCell,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../hooks/useAuth";
import { useRmaCommonCodes } from "../hooks/useRmaCommonCodes";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { usePartnerListFilter } from "../hooks/usePartnerListFilter";
import { useRmaPermissions } from "../hooks/useRmaPermissions";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { labelForCommonCode } from "../api/commonCode";
import {
  labelForRmaReturnStatus,
  labelForRmaStatus,
} from "../domains/rma/labels/statusLabels";
import {
  rmaTabBadgeTone,
  rmaTabCount,
} from "../domains/rma/helpers/rmaListTabBadges";
import {
  getRmaRequests,
  getRmaTabCounts,
  type RmaListFilterParams,
  type RmaListParams,
  type RmaListUiTab,
} from "../api/rma";
import { formatDateTimeKo } from "../lib/format/dateFormat";

const DEFAULT_PAGE_SIZE = 20;

type RmaUiTab = RmaListUiTab;
const DEFAULT_RMA_TAB: RmaUiTab = "ALL";
const DEFAULT_RMA_SORT_BY = "receivedAt" as const;
const DEFAULT_RMA_SORT_ORDER = "desc" as const;

const RMA_TABS: Array<{ value: RmaUiTab; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "RECEIVED", label: "접수" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "COMPLETED", label: "완료" },
  { value: "RETURN", label: "반송" },
  { value: "CLOSED", label: "종료" },
];

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

export default function Rma() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadRma, canCreateRma } = useRmaPermissions();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [tab, setTab] = useState<RmaUiTab>(DEFAULT_RMA_TAB);
  const [rmaNoFilter, setRmaNoFilter] = useState("");
  const [productSerialNoFilter, setProductSerialNoFilter] = useState("");
  const [unitCodeFilter, setUnitCodeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { countryCodes } = usePartnerCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const {
    rmaStatusCodes,
    rmaSymptomCodes,
    rmaReturnStatusCodes,
  } = useRmaCommonCodes(accessToken, !isAuthLoading);

  const {
    partnerId,
    setPartnerId,
    partnerCreateOpen,
    setPartnerCreateOpen,
    partnerFilterOptions,
    partnerFieldKey,
    remountPartnerField,
  } = usePartnerListFilter({
    accessToken,
    isAuthLoading,
    countryCodes,
  });

  const rmaFilterParams = useMemo((): RmaListFilterParams => {
    return {
      q: searchKeyword.trim() || undefined,
      partnerId: partnerId || undefined,
      rmaNo: rmaNoFilter.trim() || undefined,
      productSerialNo: productSerialNoFilter.trim() || undefined,
      unitCode: unitCodeFilter.trim() || undefined,
    };
  }, [
    searchKeyword,
    partnerId,
    rmaNoFilter,
    productSerialNoFilter,
    unitCodeFilter,
  ]);

  const listParams = useMemo((): RmaListParams => {
    return {
      ...rmaFilterParams,
      tab,
      page,
      pageSize,
      sortBy: DEFAULT_RMA_SORT_BY,
      sortOrder: DEFAULT_RMA_SORT_ORDER,
    };
  }, [rmaFilterParams, tab, page, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rmaRequests", listParams],
    queryFn: () => getRmaRequests(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && canReadRma,
  });

  const { data: tabCounts } = useQuery({
    queryKey: ["rmaTabCounts", rmaFilterParams],
    queryFn: () => getRmaTabCounts(accessToken!, rmaFilterParams),
    enabled: !!accessToken && !isAuthLoading && canReadRma,
  });

  const totalCount = Number(data?.total) || 0;

  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [
      tab,
      partnerId,
      searchKeyword,
      rmaNoFilter,
      productSerialNoFilter,
      unitCodeFilter,
    ],
  });

  const tabOptions = useMemo(
    () =>
      RMA_TABS.map((tabOption) => {
        const count = rmaTabCount(tabOption.value, tabCounts);
        return {
          value: tabOption.value,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabOption.label}</span>
              <ListTabCountBadge
                count={count}
                tone={rmaTabBadgeTone(tabOption.value)}
              />
            </span>
          ),
        };
      }),
    [tabCounts]
  );

  const rows = data?.items ?? [];

  const handleSearchReset = () => {
    setSearchKeyword("");
    setTab(DEFAULT_RMA_TAB);
    setPartnerId("");
    setRmaNoFilter("");
    setProductSerialNoFilter("");
    setUnitCodeFilter("");
    setPage(1);
    remountPartnerField();
  };

  if (!canReadRma) {
    return (
      <>
        <PageMeta title="RMA 목록" description="RMA 목록" />
        <PageBreadcrumb pageTitle="RMA" />
        <div className="rounded-xl border border-gray-100 p-8 text-center text-sm text-gray-500 dark:border-white/[0.05] dark:text-gray-400">
          RMA 조회 권한(rma.read)이 없습니다.
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="아이쓰리시스템(주) | RMA 목록" description="아이쓰리시스템(주) | RMA 목록 페이지" />
      <PageBreadcrumb pageTitle="RMA" />
      <div className="space-y-6">
        <ListPageLayout
          title="RMA 목록"
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="rma-simple-search"
                  placeholder="RMA 번호, LOT, S/N 검색"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                />
              }
              actions={
                <>
                  {canCreateRma ? (
                    <DataListPrimaryActionButton onClick={() => navigate("/rma/new")}>
                      RMA 접수
                    </DataListPrimaryActionButton>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <DataListSearchOptionsButton
                      open={searchOptionsOpen}
                      onToggle={() => setSearchOptionsOpen((open) => !open)}
                    />
                  </div>
                </>
              }
            />
          }
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div key={`partner-${partnerFieldKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <SearchableSelectWithCreate
                  id={`rma-list-partner-${partnerFieldKey}`}
                  label="거래처"
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerFilterOptions}
                  placeholder="전체 또는 검색"
                  compact
                  addTrigger="popover"
                  popoverDescription="필터에 쓸 거래처가 없으면 정보 아이콘에서 등록한 뒤 목록이 갱신됩니다."
                  popoverAriaLabel="거래처 등록 안내"
                  addButtonLabel="거래처 등록"
                  onAddClick={() => setPartnerCreateOpen(true)}
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  RMA 번호
                </label>
                <Input
                  type="text"
                  placeholder="RMA-202605-0001"
                  value={rmaNoFilter}
                  onChange={(e) => {
                    setRmaNoFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9"
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  제품 S/N
                </label>
                <Input
                  type="text"
                  placeholder="SN-2026-0001"
                  value={productSerialNoFilter}
                  onChange={(e) => {
                    setProductSerialNoFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9"
                />
              </div>
              <div className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  LOT
                </label>
                <Input
                  type="text"
                  placeholder="LT-20260528-YI0001"
                  value={unitCodeFilter}
                  onChange={(e) => {
                    setUnitCodeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9"
                />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleSearchReset}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                >
                  초기화
                </button>
              </div>
            </>
          }
          belowSearchOptions={
            <div className="space-y-2 border-b border-gray-100 pt-2 pb-3 dark:border-white/[0.05]">
              <SegmentedControl
                ariaLabel="RMA 상태 탭"
                value={tab}
                onChange={(nextTab) => {
                  setTab(nextTab);
                  setPage(1);
                }}
                options={tabOptions}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                이미 접수된 RMA 건만 표시됩니다. 신규 접수는 「RMA 접수」에서 납품 완료 제품을
                선택하세요. / 현재 탭:{" "}
                {RMA_TABS.find((tabOption) => tabOption.value === tab)?.label ?? "전체"} / 총{" "}
                {tabCounts?.total ?? totalCount}건
              </p>
            </div>
          }
          pagination={!isLoading && !error ? <TablePagination {...listPagination} /> : null}
        >
          {isLoading ? (
            <ListPageLoading message="RMA 목록을 불러오는 중입니다." skeletonRows={8} minHeight={320} />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <DataTable minWidth={960}>
              <DataTableHeader>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>RMA 번호</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={1} compact sortable={false}>
                  <DataTableHeaderLabel>LOT</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>제품 S/N</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>거래처</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>증상</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={1} compact sortable={false} align="center">
                  <DataTableHeaderLabel align="center">상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={1} compact sortable={false}>
                  <DataTableHeaderLabel>접수일</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={1}
                  compact
                  sortable={false}
                  className="border-r-0"
                >
                  <DataTableHeaderLabel>반송 상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {rows.length === 0 ? (
                  <DataTableRow>
                    <DataTableCell
                      colSpan={12}
                      compact
                      align="center"
                      className="border-r-0 py-4"
                    >
                      조건에 맞는 RMA가 없습니다.
                    </DataTableCell>
                  </DataTableRow>
                ) : (
                  rows.map((row) => {
                    const statusName = labelForRmaStatus(rmaStatusCodes, row.status);
                    const rowRmaNo = toText(row.rmaNo) || `#${row.id}`;
                    const rowUnitCode =
                      toText(row.unitCode) || toText(row.productionPlanUnitId) || "-";
                    const rowProductSerial = toText(row.productSerialNoSnapshot) || "-";
                    const rowPartner = toText(row.partnerName) || "-";
                    const rowSymptom = labelForCommonCode(rmaSymptomCodes, row.symptomCode);
                    const rowReturnStatus = labelForRmaReturnStatus(row, rmaReturnStatusCodes);

                    return (
                      <DataTableRow
                        key={row.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        onClick={() =>
                          navigate(
                            `/delivery/units/${row.productionPlanUnitId}?tab=rma&rmaId=${row.id}`
                          )
                        }
                      >
                        <DataTableCell colSpan={2} compact>
                          <span className="font-medium text-gray-800 dark:text-gray-100">
                            {rowRmaNo}
                          </span>
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact className="font-mono">
                          {rowUnitCode}
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact className="font-mono">
                          {rowProductSerial}
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact>
                          {rowPartner}
                        </DataTableCell>
                        <DataTableCell colSpan={2} compact>
                          {rowSymptom}
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact align="center">
                          <StatusBadgeCell label={statusName} />
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact>
                          {formatDateTimeKo(row.receivedAt, { emptyFallback: "-" })}
                        </DataTableCell>
                        <DataTableCell colSpan={1} compact className="border-r-0">
                          {rowReturnStatus}
                        </DataTableCell>
                      </DataTableRow>
                    );
                  })
                )}
              </DataTableBody>
            </DataTable>
          )}
        </ListPageLayout>
      </div>

      <PartnerQuickCreateModal
        isOpen={partnerCreateOpen}
        onClose={() => setPartnerCreateOpen(false)}
        onCreated={(partner) => setPartnerId(String(partner.id))}
      />
    </>
  );
}
