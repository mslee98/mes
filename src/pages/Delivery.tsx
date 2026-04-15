import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { usePartnerListFilter } from "../hooks/usePartnerListFilter";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { Link } from "react-router";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Input from "../components/form/input/InputField";
import Select from "../components/form/Select";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import PartnerQuickCreateModal from "../components/form/PartnerQuickCreateModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Badge from "../components/ui/badge/Badge";
import {
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import ListPageLoading from "../components/common/ListPageLoading";
import { useAuth } from "../hooks/useAuth";
import { getDeliveriesList, type Delivery, type Partner } from "../api/purchaseOrder";
import {
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  COMMON_CODE_GROUP_COUNTRY,
  commonCodesToSelectOptions,
  type CommonCodeItem,
} from "../api/commonCode";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { badgeColorFromKoStatusLabel } from "../lib/badgeStatusColor";

const DEFAULT_PAGE_SIZE = 20;

function deliveryOrderId(d: Delivery): number | undefined {
  const o = d.order;
  if (o && typeof o.id === "number" && Number.isFinite(o.id)) return o.id;
  if (typeof d.purchaseOrderId === "number" && Number.isFinite(d.purchaseOrderId)) {
    return d.purchaseOrderId;
  }
  const ext = d as { orderId?: number };
  return typeof ext.orderId === "number" ? ext.orderId : undefined;
}

function deliveryOrderNo(d: Delivery): string {
  const o = d.order;
  if (o?.orderNo?.trim()) return o.orderNo.trim();
  return String((d as { orderNo?: string }).orderNo ?? "-");
}

function deliveryOrderTitle(d: Delivery): string {
  return d.order?.title?.trim() || "-";
}

function partnerLabel(d: Delivery, countryCodes: CommonCodeItem[]): string {
  const p = (d.partner ?? d.order?.partner) as Partner | undefined;
  if (p) return partnerSelectLabel(p, countryCodes);
  return "-";
}

export default function Delivery() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [orderIdFilter, setOrderIdFilter] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [searchKey, setSearchKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

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

  const listParams = useMemo(() => {
    const oid = orderIdFilter.trim();
    const orderIdParsed = oid ? Number(oid) : NaN;
    return {
      page,
      pageSize,
      partnerId: partnerId ? Number(partnerId) : undefined,
      orderId: Number.isFinite(orderIdParsed) ? orderIdParsed : undefined,
      status: deliveryStatus || undefined,
    };
  }, [page, pageSize, partnerId, orderIdFilter, deliveryStatus]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deliveriesList", listParams],
    queryFn: () => getDeliveriesList(accessToken!, listParams),
    enabled: !!accessToken && !isAuthLoading,
  });

  const totalCount = data?.total ?? 0;

  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [partnerId, orderIdFilter, deliveryStatus],
  });

  const { data: deliveryStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DELIVERY_STATUS,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const deliveryStatusOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "전체" }];
    commonCodesToSelectOptions(deliveryStatusCodes).forEach((o) => list.push(o));
    return list;
  }, [deliveryStatusCodes]);

  const displayRows = useMemo(() => {
    const items = data?.items ?? [];
    const kw = searchKeyword.trim().toLowerCase();
    if (!kw) return items;
    return items.filter((d) => {
      const title = (d.title ?? "").toLowerCase();
      const no = (d.deliveryNo ?? "").toLowerCase();
      const orderNo = deliveryOrderNo(d).toLowerCase();
      const orderTitle = deliveryOrderTitle(d).toLowerCase();
      const partner = partnerLabel(d, countryCodes).toLowerCase();
      return (
        title.includes(kw) ||
        no.includes(kw) ||
        orderNo.includes(kw) ||
        orderTitle.includes(kw) ||
        partner.includes(kw) ||
        String(d.id).includes(kw)
      );
    });
  }, [data?.items, searchKeyword, countryCodes]);

  const handleSearchReset = () => {
    setSearchKeyword("");
    setPartnerId("");
    setOrderIdFilter("");
    setDeliveryStatus("");
    setPage(1);
    remountPartnerField();
    setSearchKey((k) => k + 1);
  };

  const getDeliveryStatusName = (code: string | undefined) => {
    const c = code?.trim();
    if (!c) return "미지정";
    return deliveryStatusCodes.find((x) => x.code === c)?.name ?? c;
  };

  const keywordActive = searchKeyword.trim().length > 0;

  return (
    <>
      <PageMeta
        title="아이쓰리시스템(주) | 납품 목록"
        description="아이쓰리시스템(주) | 납품 목록 페이지"
      />
      <PageBreadcrumb pageTitle="납품 목록" />
      <div className="space-y-6">
        <ListPageLayout
          title="납품 목록"
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="delivery-simple-search"
                  placeholder="납품번호·제목·발주·거래처 (현재 페이지만)"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
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
              <div key={`partner-${partnerFieldKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <SearchableSelectWithCreate
                  id={`delivery-list-partner-${partnerFieldKey}`}
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
              <div key={`orderId-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[10rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  발주 ID
                </label>
                <Input
                  type="text"
                  placeholder="전체"
                  value={orderIdFilter}
                  onChange={(e) => {
                    setOrderIdFilter(e.target.value.replace(/[^\d]/g, ""));
                    setPage(1);
                  }}
                  className="h-9"
                />
              </div>
              <div key={`deliveryStatus-${searchKey}`} className="min-w-0 flex-1 sm:max-w-[12rem]">
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  납품 상태
                </label>
                <Select
                  size="sm"
                  options={deliveryStatusOptions}
                  placeholder="전체"
                  defaultValue={deliveryStatus}
                  onChange={(v) => {
                    setDeliveryStatus(v);
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
            keywordActive ? (
              <p className="pt-2 text-xs text-gray-500 dark:text-gray-400">
                검색어는 서버 필터가 아닌 <strong className="font-medium">현재 페이지</strong> 결과에만 적용됩니다.
              </p>
            ) : undefined
          }
          pagination={!isLoading && !error ? <TablePagination {...listPagination} /> : null}
        >
          {isLoading ? (
            <ListPageLoading message="납품 목록을 불러오는 중입니다." skeletonRows={8} minHeight={320} />
          ) : error ? (
            <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
              목록을 불러오는 중 오류가 발생했습니다.
            </div>
          ) : (
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    납품
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    발주번호
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    발주 제목
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    거래처
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    납품일
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
                  >
                    납품 상태
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                    >
                      {(data?.items ?? []).length === 0
                        ? "조건에 맞는 납품이 없습니다."
                        : "현재 페이지에서 검색 결과가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row) => {
                    const oid = deliveryOrderId(row);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="px-5 py-4 text-start text-theme-sm sm:px-6">
                          <Link
                            to={`/delivery/${row.id}`}
                            className="block rounded-md outline-offset-2 hover:text-brand-600 focus-visible:ring-2 focus-visible:ring-brand-400 dark:hover:text-brand-400"
                          >
                            <div className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                              {row.deliveryNo?.trim() || `#${row.id}`}
                            </div>
                            <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                              {row.title?.trim() || "-"}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-start text-theme-sm">
                          {oid != null ? (
                            <Link
                              to={`/order/${oid}`}
                              className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {deliveryOrderNo(row)}
                            </Link>
                          ) : (
                            <span className="text-gray-500">{deliveryOrderNo(row)}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-700 text-start text-theme-sm dark:text-gray-300">
                          {oid != null ? (
                            <Link
                              to={`/order/${oid}`}
                              className="hover:text-brand-600 hover:underline dark:hover:text-brand-400"
                            >
                              {deliveryOrderTitle(row)}
                            </Link>
                          ) : (
                            deliveryOrderTitle(row)
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {partnerLabel(row, countryCodes)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                          {row.deliveryDate?.trim() ? row.deliveryDate : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <Badge
                            size="sm"
                            color={badgeColorFromKoStatusLabel(getDeliveryStatusName(row.status))}
                          >
                            {getDeliveryStatusName(row.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </ListPageLayout>
      </div>

      <PartnerQuickCreateModal
        isOpen={partnerCreateOpen}
        onClose={() => setPartnerCreateOpen(false)}
        onCreated={(p) => setPartnerId(String(p.id))}
      />
    </>
  );
}
