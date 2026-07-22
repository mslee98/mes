import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import SegmentedControl from "../components/common/SegmentedControl";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
import Select from "../components/form/Select";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DATA_TABLE_COMPACT_LINK_CLASS,
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
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
        ) : (
          <DataTable fillWidth minWidth={0}>
            <DataTableHeader>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>코드</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={3} compact sortable={false}>
                <DataTableHeaderLabel>업체명</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>업체 분류</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>국가</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell colSpan={2} compact sortable={false}>
                <DataTableHeaderLabel>담당자/연락처</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell
                colSpan={1}
                compact
                sortable={false}
                className="border-r-0"
              >
                <DataTableHeaderLabel>상태</DataTableHeaderLabel>
              </DataTableHeaderCell>
            </DataTableHeader>
            <DataTableBody>
              {totalCount === 0 ? (
                <DataTableRow>
                  <DataTableCell
                    colSpan={12}
                    compact
                    className="justify-center border-r-0 py-6"
                  >
                    조건에 맞는 업체가 없습니다.
                  </DataTableCell>
                </DataTableRow>
              ) : (
                pageItems.map((p) => (
                  <DataTableRow key={p.id}>
                    <DataTableCell colSpan={2} compact>
                      <Link
                        to={`/partners/${p.id}`}
                        className={DATA_TABLE_COMPACT_LINK_CLASS}
                      >
                        {p.code || "-"}
                      </Link>
                    </DataTableCell>
                    <DataTableCell colSpan={3} compact>
                      <Link
                        to={`/partners/${p.id}`}
                        className={DATA_TABLE_COMPACT_LINK_CLASS}
                      >
                        {p.name || "-"}
                      </Link>
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact>
                      {formatPartnerCoreClassificationCell(
                        p,
                        partnerTypeCodes,
                        supplierSegmentCodes
                      )}
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact>
                      <PartnerCountryCell partner={p} countryCodes={countryCodes} />
                    </DataTableCell>
                    <DataTableCell colSpan={2} compact>
                      {formatPartnerContactCell(p)}
                    </DataTableCell>
                    <DataTableCell colSpan={1} compact className="border-r-0">
                      <ActiveStatusBadge active={p.isActive} />
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        )}
      </ListPageLayout>
    </>
  );
}
