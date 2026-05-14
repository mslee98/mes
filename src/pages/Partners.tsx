import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import SegmentedControl from "../components/common/SegmentedControl";
import Badge from "../components/ui/badge/Badge";
import Select from "../components/form/Select";
import {
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../hooks/useAuth";
import { useServerListPagination } from "../hooks/useServerListPagination";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import {
  labelForCommonCode,
  type CommonCodeItem,
} from "../api/commonCode";
import { type Partner } from "../api/purchaseOrder";
import { PartnerCountryCell } from "../components/partner/PartnerCountryCell";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];
const PARTNER_TYPE_CUSTOMER = "CUSTOMER";
const PARTNER_TYPE_SUPPLIER = "SUPPLIER";
const PARTNER_TAB_ALL = "all";
const PARTNER_TAB_CUSTOMER = "type:CUSTOMER";
const PARTNER_TAB_SUPPLIER_PREFIX = "supplier:";

function formatPartnerContactCell(partner: Partner): string {
  const contactPerson = partner.contactPerson?.trim() || "-";
  const contactPhone = partner.contactPhone?.trim() || partner.contact?.trim() || "-";
  return `${contactPerson} / ${contactPhone}`;
}

function formatPartnerCoreClassificationCell(
  partner: Partner,
  partnerTypeCodes: CommonCodeItem[],
  supplierSegmentCodes: CommonCodeItem[]
): string {
  const partnerTypeLabel = labelForCommonCode(partnerTypeCodes, partner.type);
  const normalizedType = String(partner.type ?? "").trim().toUpperCase();
  if (normalizedType !== "SUPPLIER") {
    return `${partnerTypeLabel} / -`;
  }
  const supplierSegmentLabel = labelForCommonCode(
    supplierSegmentCodes,
    partner.supplierSegment
  );
  return `${partnerTypeLabel} / ${supplierSegmentLabel}`;
}

export default function Partners() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [partnerTab, setPartnerTab] = useState<string>(PARTNER_TAB_ALL);
  const [statusFilter, setStatusFilter] = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);

  const { data: partners = [], isLoading, error } = usePartnersQuery(
    accessToken,
    undefined,
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { countryCodes, partnerTypeCodes, supplierSegmentCodes } =
    usePartnerCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const partnerTabs = useMemo(() => {
    const tabs: { value: string; label: string }[] = [
      { value: PARTNER_TAB_ALL, label: "전체" },
    ];
    const customerCode = partnerTypeCodes.find(
      (c) =>
        c.isActive !== false &&
        String(c.code ?? "").trim().toUpperCase() === PARTNER_TYPE_CUSTOMER
    );
    if (customerCode) {
      tabs.push({
        value: PARTNER_TAB_CUSTOMER,
        label: customerCode.name || customerCode.code,
      });
    }
    supplierSegmentCodes
      .filter((c) => c.isActive !== false)
      .forEach((c) => {
        tabs.push({
          value: `${PARTNER_TAB_SUPPLIER_PREFIX}${String(c.code)
            .trim()
            .toUpperCase()}`,
          label: c.name || c.code,
        });
      });
    return tabs;
  }, [partnerTypeCodes, supplierSegmentCodes]);

  const filtered = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    const normalizedTab = partnerTab.trim().toUpperCase();
    return (partners as Partner[]).filter((p) => {
      if (statusFilter === "active" && p.isActive === false) return false;
      if (statusFilter === "inactive" && p.isActive !== false) return false;
      const typeCode = String(p.type ?? "").trim().toUpperCase();
      const supplierSegmentCode = String(
        p.supplierSegmentCode ?? p.supplierSegment ?? ""
      )
        .trim()
        .toUpperCase();
      if (normalizedTab === PARTNER_TAB_CUSTOMER.toUpperCase()) {
        if (typeCode !== PARTNER_TYPE_CUSTOMER) return false;
      } else if (
        normalizedTab.startsWith(PARTNER_TAB_SUPPLIER_PREFIX.toUpperCase())
      ) {
        const targetSegmentCode = normalizedTab.slice(
          PARTNER_TAB_SUPPLIER_PREFIX.length
        );
        if (typeCode !== PARTNER_TYPE_SUPPLIER) return false;
        if (supplierSegmentCode !== targetSegmentCode) return false;
      }
      if (!kw) return true;
      const hay = [
        p.code,
        p.name,
        p.businessRegistrationNo,
        p.contactPerson,
        p.contactPhone,
        p.contactEmail,
        p.contact,
      ]
        .map((s) => String(s ?? "").toLowerCase())
        .join(" ");
      return hay.includes(kw);
    });
  }, [partners, searchKeyword, statusFilter, partnerTab]);

  const totalCount = filtered.length;
  const listPagination = useServerListPagination({
    totalCount,
    listPage,
    setListPage,
    listPageSize,
    setListPageSize,
    resetPageDeps: [searchKeyword, statusFilter, partnerTab],
    emptyTotalPages: "one",
  });
  const pageItems = useMemo(() => {
    const start = (listPage - 1) * listPageSize;
    return filtered.slice(start, start + listPageSize);
  }, [filtered, listPage, listPageSize]);

  return (
    <>
      <PageMeta title="업체 관리" description="거래처 마스터 관리" />
      <PageBreadcrumb pageTitle="업체 관리" />
      <ListPageLayout
        title="업체 목록"
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <div className="w-full sm:w-[200px]">
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              활성 여부
            </p>
            <Select
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              size="md"
            />
          </div>
        }
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="partners-list-search"
                placeholder="업체코드·업체명·담당자 검색"
                value={searchKeyword}
                onChange={setSearchKeyword}
              />
            }
            actions={
              <>
                <DataListPrimaryActionButton
                  onClick={() => navigate("/partners/new")}
                >
                  업체 등록
                </DataListPrimaryActionButton>
                <div className="flex items-center gap-3">
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((o) => !o)}
                  />
                </div>
              </>
            }
          />
        }
        belowSearchOptions={
          <div className="border-b border-gray-100 pt-3 pb-3 dark:border-white/[0.05]">
            <SegmentedControl
              ariaLabel="업체 분류 탭"
              value={partnerTab}
              onChange={setPartnerTab}
              options={partnerTabs}
            />
          </div>
        }
        pagination={
          !isAuthLoading && !isLoading && !error && totalCount > 0 ? (
            <TablePagination {...listPagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || isLoading ? (
          <ListPageLoading message="업체 목록을 불러오는 중..." />
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600">
              {error instanceof Error
                ? error.message
                : "업체 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500">
            <p className="text-sm">조건에 맞는 업체가 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500"
                >
                  코드
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500"
                >
                  업체명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500"
                >
                  업체 분류
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500"
                >
                  국가
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500"
                >
                  담당자/연락처
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500"
                >
                  상태
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {pageItems.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  onClick={() => navigate(`/partners/${p.id}`)}
                >
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {p.code || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {p.name || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatPartnerCoreClassificationCell(
                      p,
                      partnerTypeCodes,
                      supplierSegmentCodes
                    )}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <PartnerCountryCell partner={p} countryCodes={countryCodes} />
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatPartnerContactCell(p)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <Badge
                      size="sm"
                      color={p.isActive === false ? "error" : "success"}
                    >
                      {p.isActive === false ? "비활성" : "활성"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPageLayout>
    </>
  );
}
