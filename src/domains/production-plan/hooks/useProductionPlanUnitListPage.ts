import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useCommonCodesByGroup } from "../../../hooks/useCommonCodesByGroup";
import { useServerListPagination } from "../../../hooks/useServerListPagination";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_UNIT_PROCESS_STEP,
} from "../../../api/commonCode";
import { todayYmdInTimeZone } from "../../../lib/format/dateFormat";
import {
  PRODUCTION_PLAN_UNIT_TABS,
  tabLabel,
  type UnitListMode,
  perspectiveForUnitListMode,
} from "../helpers/unitListPerspective";
import { resolveUnitListSort } from "../helpers/unitListSort";
import {
  unitListTabBadgeTone,
  unitListTabCount,
} from "../helpers/unitListTabBadges";
import {
  DELAYED_SOURCE_TABS,
  DELAYED_TAB_SOURCE_PAGE_SIZE,
  mergeDelayedTabItems,
  normalizeUnitListMonthInput,
} from "../helpers/unitListDelayedMerge";
import { PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS } from "../queries/unitListQueryOptions";
import {
  getProductionPlanUnitOverview,
  getProductionPlanUnits,
  type DeliveryPlanAssignmentFilter,
  type ProductionPlanUnitDateBasis,
  type ProductionPlanUnitListParams,
  type ProductionPlanUnitListResponse,
  type ProductionPlanUnitTab,
} from "../../../api/purchaseOrder";
import type { ListTabBadgeTone } from "../../../components/list/ListTabCountBadge";

export type UnitListTabOption = {
  value: ProductionPlanUnitTab;
  label: string;
  badgeCount: number;
  badgeTone: ListTabBadgeTone;
};

const DEFAULT_PAGE_SIZE = 20;

const DELIVERY_PLAN_ASSIGNMENT_LABELS: Record<
  DeliveryPlanAssignmentFilter | "all",
  string
> = {
  unassigned: "미배정",
  assigned: "배정됨",
  all: "전체",
};

type ProductionAssignmentView = DeliveryPlanAssignmentFilter | "all";

export function dateBasisLabel(v: ProductionPlanUnitDateBasis): string {
  if (v === "delivery") return "납품일";
  if (v === "coalesce") return "계획우선(보정)";
  return "계획일";
}

type UseProductionPlanUnitListPageOptions = {
  mode: UnitListMode;
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
};

export function useProductionPlanUnitListPage({
  mode,
  accessToken,
  isAuthLoading,
}: UseProductionPlanUnitListPageOptions) {
  const perspective = perspectiveForUnitListMode(mode);
  const isOverviewUnits = mode === "overview-units";
  const isDelivery = mode === "delivery";

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
  const [tab, setTab] = useState<ProductionPlanUnitTab>("ALL");
  const [assignmentView, setAssignmentView] =
    useState<ProductionAssignmentView>("all");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");
  const [dateBasis, setDateBasis] = useState<ProductionPlanUnitDateBasis>("planned");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const safeFromMonth = normalizeUnitListMonthInput(fromMonth);
  const safeToMonth = normalizeUnitListMonthInput(toMonth);
  const hasMonthRange = safeFromMonth !== "" && safeToMonth !== "";

  const assignmentParams = useMemo(() => {
    if (isOverviewUnits) return {};
    if (perspective === "production" && assignmentView !== "all") {
      return { deliveryPlanAssignment: assignmentView };
    }
    return {};
  }, [isOverviewUnits, perspective, assignmentView]);

  const overviewParams = useMemo(
    () => ({
      perspective,
      ...assignmentParams,
      ...(hasMonthRange
        ? {
            fromMonth: safeFromMonth,
            toMonth: safeToMonth,
          }
        : {}),
      dateBasis,
      tz: "Asia/Seoul",
    }),
    [
      perspective,
      assignmentParams,
      hasMonthRange,
      safeFromMonth,
      safeToMonth,
      dateBasis,
    ]
  );

  const listParams = useMemo(() => {
    const sort = resolveUnitListSort(tab, perspective);
    return {
      ...overviewParams,
      tab,
      page,
      pageSize,
      q: searchKeyword.trim() || undefined,
      ...sort,
    };
  }, [overviewParams, tab, page, pageSize, searchKeyword, perspective]);

  const delayedMergeFetchParams = useMemo((): Omit<
    ProductionPlanUnitListParams,
    "tab"
  > => {
    const sort = resolveUnitListSort("DELAYED", perspective);
    return {
      ...overviewParams,
      page: 1,
      pageSize: DELAYED_TAB_SOURCE_PAGE_SIZE,
      q: searchKeyword.trim() || undefined,
      ...sort,
    };
  }, [overviewParams, searchKeyword, perspective]);

  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ["productionPlanUnitOverview", overviewParams],
    queryFn: () => getProductionPlanUnitOverview(accessToken!, overviewParams),
    enabled: !!accessToken && !isAuthLoading,
    staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
  });

  const {
    data: serverListData,
    isLoading: isServerListLoading,
    error: serverListError,
  } = useQuery({
    queryKey: ["productionPlanUnits", listParams],
    queryFn: () => getProductionPlanUnits(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading && tab !== "DELAYED",
    staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
  });

  const delayedSourceQueries = useQueries({
    queries: DELAYED_SOURCE_TABS.map((sourceTab) => ({
      queryKey: [
        "productionPlanUnits",
        "DELAYED_MERGE",
        sourceTab,
        delayedMergeFetchParams,
      ],
      queryFn: () =>
        getProductionPlanUnits(accessToken!, {
          ...delayedMergeFetchParams,
          tab: sourceTab,
        }),
      enabled: !!accessToken && !isAuthLoading,
      staleTime: PRODUCTION_PLAN_UNIT_LIST_STALE_TIME_MS,
    })),
  });

  const todaySeoulYmd = todayYmdInTimeZone();
  const delayedMergeReady = delayedSourceQueries.every((q) => q.isFetched);

  const calendarDelayedMerged = useMemo(() => {
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
      assignmentView,
      perspective,
    ],
  });

  const tabOptions = useMemo(
    () =>
      PRODUCTION_PLAN_UNIT_TABS.map((tabValue) => {
        const badgeCount =
          tabValue === "DELAYED"
            ? calendarDelayedMerged !== null
              ? calendarDelayedMerged.length
              : Number(overviewData?.summary?.delayed) || 0
            : unitListTabCount(tabValue, overviewData?.summary);
        return {
          value: tabValue,
          label: tabLabel(perspective, tabValue),
          badgeCount,
          badgeTone: unitListTabBadgeTone(tabValue),
        };
      }),
    [overviewData?.summary, calendarDelayedMerged, perspective]
  );

  const assignmentOptions = useMemo(
    () =>
      (["unassigned", "assigned", "all"] as const).map((value) => ({
        value,
        label: DELIVERY_PLAN_ASSIGNMENT_LABELS[value],
      })),
    []
  );

  const handleSearchReset = () => {
    setSearchKeyword("");
    setFromMonth("");
    setToMonth("");
    setDateBasis("planned");
    setTab("ALL");
    setAssignmentView("all");
    setPage(1);
  };

  const isLoading =
    isAuthLoading ||
    isOverviewLoading ||
    (tab === "DELAYED" ? isDelayedSourcesLoading : isServerListLoading);
  const error = overviewError ?? (tab === "DELAYED" ? delayedSourcesError : serverListError);

  const showAssignmentFilter = perspective === "production" && !isOverviewUnits;
  const statusSectionTitle = isDelivery ? "납품 상태" : "생산 상태";
  const listItems = listData?.items ?? [];

  return {
    mode,
    perspective,
    isOverviewUnits,
    isDelivery,
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
    fromMonth,
    setFromMonth,
    toMonth,
    setToMonth,
    dateBasis,
    setDateBasis,
    page,
    setPage,
    safeFromMonth,
    safeToMonth,
    hasMonthRange,
    overviewData,
    listData,
    listItems,
    tabOptions,
    assignmentOptions,
    listPagination,
    isLoading,
    error,
    todaySeoulYmd,
    calendarDelayedMerged,
    handleSearchReset,
    showAssignmentFilter,
    statusSectionTitle,
  };
}
