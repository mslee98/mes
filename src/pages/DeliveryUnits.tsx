import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import SegmentedControl from "../components/common/SegmentedControl";
import DatePicker from "../components/form/date-picker";
import Select from "../components/form/Select";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Badge from "../components/ui/badge/Badge";
import { ProductionPlanProcessStageBadge } from "../components/delivery/ProductionPlanProcessStageBadge";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { useServerListPagination } from "../hooks/useServerListPagination";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
  labelForCommonCode,
  type CommonCodeItem,
} from "../api/commonCode";
import { formatDateYmd, todayYmdInTimeZone } from "../lib/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../lib/dueDateDisplay";
import { labelForProcessCode } from "../lib/productionPlanProcessLabels";
import { partnerCountryFlagUrl } from "../lib/partnerCountryOptions";
import {
  getProductionPlanUnitOverview,
  getProductionPlanUnits,
  type ProductionPlanUnit,
  type ProductionPlanUnitCounts,
  type ProductionPlanUnitDateBasis,
  type ProductionPlanUnitListParams,
  type ProductionPlanUnitListResponse,
  type ProductionPlanUnitTab,
} from "../api/purchaseOrder";

const DEFAULT_PAGE_SIZE = 20;
/** 지연 탭: 서버 `DELAYED` 외 대기·진행 중 달력 지연 유닛 포함 — 소스 탭별 상한(백엔드와 동일 범위·검색 조건) */
const DELAYED_TAB_SOURCE_PAGE_SIZE = 500;
const DELIVERY_UNIT_TABS: Array<{ value: ProductionPlanUnitTab; label: string }> = [
  { value: "WAITING", label: "대기" },
  { value: "IN_PROGRESS", label: "진행" },
  { value: "COMPLETED", label: "완료" },
  { value: "DELAYED", label: "지연" },
];

function normalizeMonthInput(v: string): string {
  if (!/^\d{4}-\d{2}$/.test(v)) return "";
  const [yearText, monthText] = v.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return "";
  if (month < 1 || month > 12) return "";
  return `${yearText}-${monthText}`;
}

type ProductionPlanUnitListRow = ProductionPlanUnitListResponse["items"][number];

function listUnitLotDisplay(row: ProductionPlanUnitListRow): string {
  const lot = String(row.unitCode ?? "").trim();
  if (lot) return lot;
  return row.unitId;
}

function listProductSerialDisplay(row: ProductionPlanUnitListRow): string {
  const sn = String(row.serialNo ?? "").trim();
  return sn || "미할당";
}

function listOperatorDisplay(row: ProductionPlanUnitListRow): string {
  const name = String(row.operatorNameSnapshot ?? "").trim();
  if (name) return name;
  const employeeNo = String(row.operatorEmployeeNoSnapshot ?? "").trim();
  if (employeeNo) return `사번 ${employeeNo}`;
  return "미지정";
}

function toProcessBadgeUnit(
  row: ProductionPlanUnitListRow
): Pick<
  ProductionPlanUnit,
  "processStatus" | "currentProcessCode" | "isDeliveryReady" | "isDelivered"
> {
  return {
    processStatus: row.processStatus ?? null,
    currentProcessCode: row.currentProcessCode ?? null,
    isDeliveryReady: row.isDeliveryReady === true,
    isDelivered: row.isDelivered === true,
  };
}

function tabBadgeCount(
  tab: ProductionPlanUnitTab,
  summary?: ProductionPlanUnitCounts
): number {
  if (!summary) return 0;
  if (tab === "WAITING") return Number(summary.waiting) || 0;
  if (tab === "IN_PROGRESS") return Number(summary.inProgress) || 0;
  if (tab === "COMPLETED") return Number(summary.completed) || 0;
  return Number(summary.delayed) || 0;
}

function tabCountBadge(tab: ProductionPlanUnitTab, count: number) {
  if (tab === "WAITING") {
    return (
      <Badge size="sm" variant="solid" color="dark">
        {count}
      </Badge>
    );
  }
  if (tab === "COMPLETED") {
    return (
      <Badge size="sm" color="success">
        {count}
      </Badge>
    );
  }
  if (tab === "DELAYED") {
    return (
      <Badge size="sm" color="warning">
        {count}
      </Badge>
    );
  }
  return (
    <Badge size="sm" color="primary">
      {count}
    </Badge>
  );
}

function toDateBasisLabel(v: ProductionPlanUnitDateBasis): string {
  if (v === "delivery") return "납품일";
  if (v === "coalesce") return "계획우선(보정)";
  return "계획일";
}

function currentProcessDisplay(
  row: {
    currentProcessName?: string | null;
    currentProcessCode?: string | null;
  },
  stepCodes: CommonCodeItem[]
): string {
  const name = String(row.currentProcessName ?? "").trim();
  if (name) return name;
  const code = String(row.currentProcessCode ?? "").trim();
  if (!code) return "-";
  return labelForProcessCode(code, stepCodes);
}

/** 거래처 아래 국가 서브줄 — 국기(SVG URL) + COUNTRY 공통코드 표시명(`partner.countryCode` 등) */
function partnerCountrySubline(
  countryCode: string | null | undefined,
  countryCodes: CommonCodeItem[]
): { label: string; flagUrl?: string } | null {
  const raw = String(countryCode ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const fromApi = labelForCommonCode(countryCodes, upper);
  const label = fromApi !== "—" ? fromApi : upper;
  return { label, flagUrl: partnerCountryFlagUrl(upper) };
}

/** 서울 달력 기준: 미납품이고 발주 최종 납기가 오늘보다 이전이면 지연 */
function isRowCalendarDelayed(
  row: ProductionPlanUnitListRow,
  todayYmd: string
): boolean {
  if (row.isDelivered === true) return false;
  const rel = getDueDateRelative(row.dueDate, { todayYmd });
  return rel != null && rel.diff < 0;
}

function mergeDelayedTabItems(
  responses: Array<ProductionPlanUnitListResponse | undefined>,
  todayYmd: string
): ProductionPlanUnitListRow[] {
  const byId = new Map<string, ProductionPlanUnitListRow>();
  for (const res of responses) {
    for (const item of res?.items ?? []) {
      byId.set(item.unitId, item);
    }
  }
  const merged = [...byId.values()].filter((row) => isRowCalendarDelayed(row, todayYmd));
  merged.sort((a, b) => {
    const da = formatDateYmd(a.dueDate, { emptyFallback: "" }) || "9999-12-31";
    const db = formatDateYmd(b.dueDate, { emptyFallback: "" }) || "9999-12-31";
    return da.localeCompare(db);
  });
  return merged;
}

export default function DeliveryUnits() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const { data: unitProcessStepCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [tab, setTab] = useState<ProductionPlanUnitTab>("WAITING");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [dateBasis, setDateBasis] = useState<ProductionPlanUnitDateBasis>("planned");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const safeFromMonth = normalizeMonthInput(fromMonth);
  const safeToMonth = normalizeMonthInput(toMonth);
  const hasMonthRange = safeFromMonth !== "" && safeToMonth !== "";

  const overviewParams = useMemo(
    () => ({
      ...(hasMonthRange
        ? {
            fromMonth: safeFromMonth,
            toMonth: safeToMonth,
          }
        : {}),
      dateBasis,
      tz: "Asia/Seoul",
    }),
    [hasMonthRange, safeFromMonth, safeToMonth, dateBasis]
  );

  const listParams = useMemo(
    () => ({
      ...overviewParams,
      tab,
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      sortBy: tab === "COMPLETED" ? ("deliveredAt" as const) : ("dueDate" as const),
      sortOrder: tab === "COMPLETED" ? ("desc" as const) : ("asc" as const),
    }),
    [overviewParams, tab, page, pageSize, searchKeyword]
  );

  const delayedMergeFetchParams = useMemo((): Omit<ProductionPlanUnitListParams, "tab"> => {
    return {
      ...overviewParams,
      page: 1,
      pageSize: DELAYED_TAB_SOURCE_PAGE_SIZE,
      q: searchKeyword.trim() || undefined,
      sortBy: "dueDate",
      sortOrder: "asc",
    };
  }, [overviewParams, searchKeyword]);

  const delayedSourceTabs = useMemo(
    () => ["IN_PROGRESS", "WAITING", "DELAYED"] as const satisfies readonly ProductionPlanUnitTab[],
    []
  );

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ["productionPlanUnitOverview", overviewParams],
    queryFn: () => getProductionPlanUnitOverview(accessToken!, overviewParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const {
    data: serverListData,
    isLoading: isServerListLoading,
    error: serverListError,
  } = useQuery({
    queryKey: ["productionPlanUnits", listParams],
    queryFn: () => getProductionPlanUnits(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && tab !== "DELAYED",
  });

  const delayedSourceQueries = useQueries({
    queries: delayedSourceTabs.map((sourceTab) => ({
      queryKey: ["productionPlanUnits", "DELAYED_MERGE", sourceTab, delayedMergeFetchParams],
      queryFn: () =>
        getProductionPlanUnits(accessToken!, {
          ...delayedMergeFetchParams,
          tab: sourceTab,
        }),
      /** 다른 탭에 있어도 병합 건수(지연 뱃지)를 위해 항상 조회 — 전체 제품 기준과 탭 숫자 일치 */
      enabled: !!accessToken && !isAuthLoading,
      staleTime: 30_000,
    })),
  });

  const todaySeoulYmd = todayYmdInTimeZone();

  const delayedMergeReady = delayedSourceQueries.every((q) => q.isFetched);

  const calendarDelayedMerged = useMemo((): ProductionPlanUnitListRow[] | null => {
    if (!delayedMergeReady) return null;
    return mergeDelayedTabItems(
      delayedSourceQueries.map((q) => q.data),
      todaySeoulYmd
    );
  }, [delayedMergeReady, delayedSourceQueries, todaySeoulYmd]);

  const listData = useMemo((): ProductionPlanUnitListResponse | undefined => {
    if (tab !== "DELAYED") return serverListData;
    if (calendarDelayedMerged === null) return undefined;
    const firstMeta = delayedSourceQueries[0]?.data?.meta;
    const start = (page - 1) * pageSize;
    return {
      meta: {
        tab: "DELAYED",
        page,
        pageSize,
        total: calendarDelayedMerged.length,
        dateBasis: firstMeta?.dateBasis ?? dateBasis,
        fromMonth: firstMeta?.fromMonth ?? null,
        toMonth: firstMeta?.toMonth ?? null,
      },
      items: calendarDelayedMerged.slice(start, start + pageSize),
    };
  }, [
    tab,
    serverListData,
    calendarDelayedMerged,
    delayedSourceQueries,
    page,
    pageSize,
    dateBasis,
  ]);

  const isDelayedSourcesLoading =
    tab === "DELAYED" &&
    (delayedSourceQueries.some((q) => q.isLoading) || calendarDelayedMerged === null);
  const delayedSourcesError = delayedSourceQueries.find((q) => q.error)?.error;

  const totalCount = Number(listData?.meta?.total) || 0;
  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [
      tab,
      fromMonth,
      toMonth,
      dateBasis,
      searchKeyword,
    ],
  });

  const tabOptions = useMemo(
    () =>
      DELIVERY_UNIT_TABS.map((tabOption) => {
        const badgeCount =
          tabOption.value === "DELAYED"
            ? calendarDelayedMerged !== null
              ? calendarDelayedMerged.length
              : Number(overviewData?.summary?.delayed) || 0
            : tabBadgeCount(tabOption.value, overviewData?.summary);
        return {
          value: tabOption.value,
          label: (
            <span className="inline-flex items-center gap-2">
              <span>{tabOption.label}</span>
              {tabCountBadge(tabOption.value, badgeCount)}
            </span>
          ),
        };
      }),
    [overviewData?.summary, calendarDelayedMerged]
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setFromMonth("");
    setToMonth("");
    setDateBasis("planned");
    setTab("WAITING");
    setPage(1);
  };

  const isLoading =
    isAuthLoading ||
    isOverviewLoading ||
    (tab === "DELAYED" ? isDelayedSourcesLoading : isServerListLoading);
  const error = overviewError ?? (tab === "DELAYED" ? delayedSourcesError : serverListError);

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 생산 목록"
        description="아이쓰리시스템(주) | 생산 목록 페이지"
      />
      <PageBreadcrumb pageTitle="생산 목록" />
      <div className="space-y-6">
        <ListPageLayout
          title="생산 목록"
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
                <div className="flex items-center gap-3">
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
                    { value: "planned", label: toDateBasisLabel("planned") },
                    { value: "delivery", label: toDateBasisLabel("delivery") },
                    { value: "coalesce", label: toDateBasisLabel("coalesce") },
                  ]}
                  placeholder="기준일"
                  defaultValue={dateBasis}
                  onChange={(v) => {
                    setDateBasis(v as ProductionPlanUnitDateBasis);
                    setPage(1);
                  }}
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
                ariaLabel="유닛 납품 상태 탭"
                value={tab}
                onChange={(nextTab) => {
                  setTab(nextTab);
                  setPage(1);
                }}
                options={tabOptions}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                조회 범위:{" "}
                {hasMonthRange ? `${safeFromMonth} ~ ${safeToMonth}` : "전체 기간"} / 기준일:{" "}
                {toDateBasisLabel(dateBasis)} / 총 {overviewData?.summary?.total ?? 0}건
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
            <div className="overflow-x-auto">
              <Table className="min-w-[960px]">
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="min-w-[11rem] max-w-[14rem] px-3 py-1 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      LOT
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[12rem] max-w-[18rem] px-3 py-1 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[8rem] max-w-[12rem] px-3 py-1 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      고객
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[8rem] max-w-[10rem] px-3 py-1 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      생산 담당자
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[10rem] max-w-[16rem] px-3 py-1 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      현재 공정
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[6rem] px-3 py-1 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      공정 상태
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[8rem] max-w-[11rem] px-3 py-1 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      발주
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[8rem] max-w-[11rem] px-3 py-1 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      생산 계획
                    </TableCell>
                    <TableCell
                      isHeader
                      className="min-w-[7rem] px-3 py-1 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                    >
                      발주 기준 최종 납기
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {(listData?.items ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="px-3 py-4 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                      >
                        조건에 맞는 유닛이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (listData?.items ?? []).map((row) => {
                      const business = row.item?.businessNameSnapshot?.trim();
                      const product = row.item?.productNameSnapshot?.trim();
                      const detectorSn = row.detectorSerialNo?.trim();
                      const partnerName =
                        row.partner?.name?.trim() ||
                        row.order?.partnerName?.trim() ||
                        "-";
                      const countryCode =
                        row.partner?.countryCode ?? row.order?.partnerCountryCode;
                      const countryLine = partnerCountrySubline(
                        countryCode,
                        countryCodes
                      );
                      const dueRel =
                        row.isDelivered === true
                          ? null
                          : getDueDateRelative(row.dueDate, {
                              todayYmd: todaySeoulYmd,
                            });
                      return (
                        <TableRow key={row.unitId}>
                          <TableCell className="min-w-[11rem] max-w-[14rem] align-middle px-3 py-1 text-start text-theme-sm">
                            <div className="flex flex-col gap-0.5 leading-tight">
                              <div className="break-words font-mono font-medium text-gray-800 dark:text-white/90">
                                {listUnitLotDisplay(row)}
                              </div>
                              <div className="break-words font-mono text-theme-xs text-gray-800 dark:text-white/90">
                                <span className="text-gray-500 dark:text-gray-400">
                                  제품 S/N{" "}
                                </span>
                                {listProductSerialDisplay(row)}
                              </div>
                              <div className="break-words font-mono text-theme-xs text-gray-800 dark:text-white/90">
                                <span className="text-gray-500 dark:text-gray-400">
                                  검출기 S/N{" "}
                                </span>
                                {detectorSn || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[12rem] max-w-[18rem] align-middle px-3 py-1">
                            <div className="flex flex-col gap-0.5 leading-tight">
                              <div className="break-words text-theme-sm font-medium text-gray-800 dark:text-white/90">
                                {business || "-"}
                              </div>
                              <div className="break-words text-theme-xs text-gray-600 dark:text-gray-400">
                                {product || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[8rem] max-w-[12rem] align-middle px-3 py-1 text-start">
                            <div className="break-words text-theme-sm font-medium text-gray-800 dark:text-white/90">
                              {partnerName}
                            </div>
                            {countryLine ? (
                              <div className="mt-0.5 flex items-center gap-1.5 text-theme-xs text-gray-600 dark:text-gray-400">
                                {countryLine.flagUrl ? (
                                  <img
                                    src={countryLine.flagUrl}
                                    alt=""
                                    className="h-3.5 w-[1.125rem] shrink-0 rounded-sm object-cover"
                                    decoding="async"
                                  />
                                ) : null}
                                <span className="min-w-0 break-words">
                                  {countryLine.label}
                                </span>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="min-w-[8rem] max-w-[10rem] align-middle px-3 py-1 text-center text-theme-sm text-gray-700 dark:text-gray-300">
                            {listOperatorDisplay(row)}
                          </TableCell>
                          <TableCell className="min-w-[10rem] max-w-[16rem] align-middle px-3 py-1 text-center">
                            <div className="flex justify-center">
                              <Badge size="sm" color="light">
                                <span className="break-words text-start normal-case">
                                  {currentProcessDisplay(row, unitProcessStepCodes)}
                                </span>
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[6rem] align-middle px-3 py-1 text-center">
                            {tab === "COMPLETED" ? (
                              <div className="flex justify-center">
                                {row.isDelivered ? (
                                  <Badge size="sm" color="success">
                                    납품완료
                                  </Badge>
                                ) : (
                                  <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                                    -
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex justify-center">
                                <ProductionPlanProcessStageBadge
                                  unit={toProcessBadgeUnit(row)}
                                />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[8rem] max-w-[11rem] align-middle px-3 py-1 text-center text-theme-sm">
                            {row.order?.orderId ? (
                              <Link
                                to={`/order/${row.order.orderId}`}
                                className="inline-block break-words font-medium text-brand-600 hover:underline dark:text-brand-400"
                              >
                                {row.order.orderNo?.trim() || row.order.orderId}
                              </Link>
                            ) : (
                              <span className="break-words text-gray-700 dark:text-gray-300">
                                {row.order?.orderNo?.trim() || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[8rem] max-w-[11rem] align-middle px-3 py-1 text-center text-theme-sm">
                            {row.plan?.planId && row.order?.orderId ? (
                              <Link
                                to={`/order/${row.order.orderId}/plan/${row.plan.planId}`}
                                className="inline-block break-words font-medium text-brand-600 hover:underline dark:text-brand-400"
                              >
                                {row.plan.planNo?.trim() || row.plan.planId}
                              </Link>
                            ) : (
                              <span className="break-words text-gray-700 dark:text-gray-300">
                                {row.plan?.planNo?.trim() || "-"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="min-w-[7rem] align-middle px-3 py-1 text-center text-theme-sm text-gray-700 dark:text-gray-300">
                            <div
                              className={`flex min-h-[3.75rem] flex-col items-center justify-center ${
                                dueRel ? "gap-1" : ""
                              }`}
                            >
                              <span className="leading-tight">
                                {formatDateYmd(row.dueDate, { emptyFallback: "-" })}
                              </span>
                              {dueRel ? (
                                <div className="flex min-h-[1.75rem] w-full items-center justify-center">
                                  <span
                                    className={dueDateDdayBadgeClassName(
                                      dueRel.diff
                                    )}
                                    title={dueRel.koLabel}
                                  >
                                    {dueRel.ddayLabel}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </ListPageLayout>
      </div>
    </>
  );
}
