import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SegmentedControl from "../common/SegmentedControl";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Select from "../form/Select";
import ListPageLoading from "../common/ListPageLoading";
import { TablePagination } from "../list";
import Badge from "../ui/badge/Badge";
import { Modal } from "../ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useAuth } from "../../hooks/useAuth";
import { useRmaPermissions } from "../../hooks/useRmaPermissions";
import { useServerListPagination } from "../../hooks/useServerListPagination";
import {
  searchProductionPlanUnitsForRma,
  type SearchRmaTargetUnitItem,
  type SearchRmaTargetUnitParams,
} from "../../api/rma";
import {
  groupUnitsByLot,
  unitDisplaySerial,
  unitLookupEligibility,
  unitLotLabel,
  unitProductLabel,
  type UnitLookupContext,
} from "../../domains/production-plan/helpers/unitLookupEligibility";
import { formatDateYmd } from "../../lib/format/dateFormat";
import { notify } from "../../lib/notify";

const PAGE_SIZE = 20;
const TOO_MANY_RESULTS_THRESHOLD = 21;

type LookupTab = "SERIAL" | "LOT";
type SerialSearchField =
  | "ALL"
  | "UNIT_CODE"
  | "PRODUCT_SN"
  | "ENGINE_SN"
  | "IDDCA_SN";

const LOOKUP_TABS: Array<{ value: LookupTab; label: string }> = [
  { value: "SERIAL", label: "시리얼 조회" },
  { value: "LOT", label: "LOT 조회" },
];

const SERIAL_SEARCH_FIELD_OPTIONS = [
  { value: "ALL", label: "전체" },
  { value: "UNIT_CODE", label: "Unit Code" },
  { value: "PRODUCT_SN", label: "제품 S/N" },
  { value: "ENGINE_SN", label: "엔진 S/N" },
  { value: "IDDCA_SN", label: "IDDCA S/N" },
];

export type SerialLotLookupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (units: SearchRmaTargetUnitItem[]) => void;
  context?: UnitLookupContext;
  selectionMode?: "single" | "multiple";
  confirmButtonLabel?: string;
  excludedUnitIds?: string[];
};

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function buildSerialSearchParams(
  searchField: SerialSearchField,
  keyword: string,
  page: number,
  pageSize: number
): SearchRmaTargetUnitParams {
  const q = keyword.trim();
  const base = { page, pageSize };
  if (!q) return base;
  if (searchField === "UNIT_CODE") return { ...base, unitCode: q };
  if (searchField === "PRODUCT_SN") return { ...base, productSerialNo: q };
  if (searchField === "ENGINE_SN") return { ...base, engineSerialNo: q };
  if (searchField === "IDDCA_SN") return { ...base, iddcaSerialNo: q };
  return {
    ...base,
    unitCode: q,
    productSerialNo: q,
    engineSerialNo: q,
    iddcaSerialNo: q,
  };
}

function unitStatusBadge(unit: SearchRmaTargetUnitItem, context: UnitLookupContext) {
  const status = toText(unit.unitStatus);
  if (context === "rma" && unit.isDelivered !== false) {
    return (
      <Badge size="sm" color="light">
        납품완료
      </Badge>
    );
  }
  if (status) {
    return <Badge size="sm" color="primary">{status}</Badge>;
  }
  if (unit.isDelivered === false) {
    return (
      <Badge size="sm" color="warning">
        미납품
      </Badge>
    );
  }
  return (
    <Badge size="sm" color="success">
      재고
    </Badge>
  );
}

export default function SerialLotLookupModal({
  isOpen,
  onClose,
  onConfirm,
  context = "rma",
  selectionMode = "single",
  confirmButtonLabel,
  excludedUnitIds = [],
}: SerialLotLookupModalProps) {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadRma } = useRmaPermissions();

  const [tab, setTab] = useState<LookupTab>("SERIAL");
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  const [serialSearchField, setSerialSearchField] = useState<SerialSearchField>("ALL");
  const [serialKeyword, setSerialKeyword] = useState("");
  const [lotKeyword, setLotKeyword] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [focusedLotKey, setFocusedLotKey] = useState<string | null>(null);

  const searchParams = useMemo((): SearchRmaTargetUnitParams => {
    if (tab === "LOT") {
      const lot = lotKeyword.trim();
      return {
        lotNo: lot || undefined,
        unitCode: lot || undefined,
        page,
        pageSize,
      };
    }
    return buildSerialSearchParams(serialSearchField, serialKeyword, page, pageSize);
  }, [tab, serialSearchField, serialKeyword, lotKeyword, page, pageSize]);

  const hasInput = tab === "LOT" ? Boolean(lotKeyword.trim()) : Boolean(serialKeyword.trim());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["serialLotLookup", context, tab, searchParams],
    queryFn: () => searchProductionPlanUnitsForRma(accessToken!, searchParams),
    enabled: isOpen && !!accessToken && !isAuthLoading && searchEnabled && hasInput && canReadRma,
  });

  const rows = data?.items ?? [];
  const totalCount = Number(data?.total) || rows.length;
  const isPending = isLoading || isFetching;

  const listPagination = useServerListPagination({
    totalCount,
    listPage: page,
    setListPage: setPage,
    listPageSize: pageSize,
    setListPageSize: setPageSize,
    resetPageDeps: [tab, serialSearchField, serialKeyword, lotKeyword],
  });

  const selectedUnits = useMemo(
    () => rows.filter((row) => selectedIds.includes(toText(row.productionPlanUnitId))),
    [rows, selectedIds]
  );

  const lotGroups = useMemo(() => groupUnitsByLot(rows), [rows]);
  const focusedLotUnits = useMemo(() => {
    if (!focusedLotKey) return [];
    return lotGroups.find((group) => group.lotKey === focusedLotKey)?.items ?? [];
  }, [focusedLotKey, lotGroups]);

  useEffect(() => {
    if (!isOpen) return;
    setTab("SERIAL");
    setSearchEnabled(false);
    setPage(1);
    setSerialSearchField("ALL");
    setSerialKeyword("");
    setLotKeyword("");
    setSelectedIds([]);
    setFocusedLotKey(null);
  }, [isOpen]);

  useEffect(() => {
    setSelectedIds([]);
    setFocusedLotKey(null);
    setSearchEnabled(false);
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (!searchEnabled || isPending || selectionMode !== "single") return;
    if (tab !== "SERIAL" || rows.length !== 1) return;
    const only = rows[0];
    const eligibility = unitLookupEligibility(only, context, excludedUnitIds);
    if (eligibility.selectable) {
      setSelectedIds([toText(only.productionPlanUnitId)]);
    }
  }, [searchEnabled, isPending, tab, rows, selectionMode, context, excludedUnitIds]);

  const toggleSelect = (unit: SearchRmaTargetUnitItem) => {
    const unitId = toText(unit.productionPlanUnitId);
    const eligibility = unitLookupEligibility(unit, context, excludedUnitIds);
    if (!eligibility.selectable) {
      notify.error(eligibility.message ?? "선택할 수 없는 항목입니다.");
      return;
    }
    if (selectionMode === "single") {
      setSelectedIds([unitId]);
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const handleSearch = () => {
    if (!hasInput) {
      notify.error("시리얼 또는 LOT 번호를 입력해 주세요.");
      return;
    }
    setPage(1);
    setSelectedIds([]);
    setSearchEnabled(true);
  };

  const handleReset = () => {
    setSerialKeyword("");
    setLotKeyword("");
    setSelectedIds([]);
    setFocusedLotKey(null);
    setSearchEnabled(false);
    setPage(1);
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) {
      notify.error("RMA를 접수할 제품(Unit)을 선택해 주세요.");
      return;
    }
    const picked = rows.filter((row) => selectedIds.includes(toText(row.productionPlanUnitId)));
    onConfirm(picked);
    onClose();
  };

  const confirmLabel =
    confirmButtonLabel ??
    (context === "rma" ? `선택 Unit 반영 (${selectedIds.length})` : `확인 (${selectedIds.length})`);

  const resultHint = (() => {
    if (!searchEnabled || isPending) return null;
    if (totalCount === 0) {
      return "조회된 데이터가 없습니다. 검색 조건을 변경하거나 시리얼 번호 / LOT 번호를 다시 확인해주세요.";
    }
    if (totalCount >= TOO_MANY_RESULTS_THRESHOLD) {
      return "조건을 더 구체적으로 입력하세요. (21건 이상 조회됨)";
    }
    if (tab === "SERIAL" && rows.length >= 2) {
      return "동일/유사 시리얼이 여러 건입니다. Unit을 선택하세요.";
    }
    return null;
  })();

  const renderSerialRow = (unit: SearchRmaTargetUnitItem) => {
    const unitId = toText(unit.productionPlanUnitId);
    const eligibility = unitLookupEligibility(unit, context, excludedUnitIds);
    const isSelected = selectedIds.includes(unitId);
    const disabled = !eligibility.selectable;

    return (
      <TableRow
        key={unitId}
        title={disabled ? eligibility.message : undefined}
        className={`${disabled ? "bg-gray-50/80 opacity-70 dark:bg-white/[0.02]" : "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"} ${
          isSelected ? "bg-brand-50/60 dark:bg-brand-500/10" : ""
        }`}
        onClick={() => {
          if (!disabled) toggleSelect(unit);
        }}
      >
        <TableCell className="px-3 py-2 text-center align-middle">
          <input
            type={selectionMode === "single" ? "radio" : "checkbox"}
            name="serial-lot-lookup-select"
            checked={isSelected}
            disabled={disabled}
            onChange={() => toggleSelect(unit)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`${unitDisplaySerial(unit)} 선택`}
            className="h-4 w-4 border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:opacity-40"
          />
        </TableCell>
        <TableCell className="px-3 py-2 text-theme-sm text-gray-800 dark:text-gray-100">
          {unitDisplaySerial(unit)}
        </TableCell>
        <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
          {unitProductLabel(unit)}
        </TableCell>
        <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
          {unitLotLabel(unit)}
        </TableCell>
        <TableCell className="px-3 py-2 align-middle">{unitStatusBadge(unit, context)}</TableCell>
        <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
          {toText(unit.location) || "-"}
        </TableCell>
        <TableCell className="px-3 py-2 text-theme-sm text-gray-500 dark:text-gray-400">
          {formatDateYmd(unit.deliveredAt)}
        </TableCell>
        <TableCell className="px-3 py-2 text-theme-sm text-gray-500 dark:text-gray-400">
          {disabled && eligibility.reason === "ALREADY_SELECTED"
            ? "이미 선택됨"
            : toText(unit.remark) || (Number(unit.rmaCount) > 0 ? `RMA ${unit.rmaCount}건` : "-")}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 flex max-h-[92vh] w-full max-w-6xl flex-col p-6 sm:p-7"
      header={
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">시리얼/LOT 조회</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            제품 S/N, 엔진 S/N, IDDCA S/N 또는 LOT 번호로 대상을 조회합니다.
            {context === "rma"
              ? " RMA 접수는 납품 완료 Unit 1대를 선택합니다."
              : " 선택한 항목은 현재 등록 화면에 자동 반영됩니다."}
          </p>
        </div>
      }
    >
      {!canReadRma ? (
        <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
          해당 데이터에 접근할 권한이 없습니다. (rma.read)
        </div>
      ) : (
        <>
          <SegmentedControl
            ariaLabel="시리얼/LOT 조회 방식"
            value={tab}
            onChange={setTab}
            options={LOOKUP_TABS}
            className="mb-4"
          />

          {tab === "SERIAL" ? (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="serial-lookup-field">검색구분</Label>
                <div className="mt-1">
                  <Select
                    id="serial-lookup-field"
                    options={SERIAL_SEARCH_FIELD_OPTIONS}
                    value={serialSearchField}
                    onChange={(value) => setSerialSearchField(value as SerialSearchField)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="serial-lookup-keyword">검색어</Label>
                <Input
                  id="serial-lookup-keyword"
                  value={serialKeyword}
                  onChange={(e) => setSerialKeyword(e.target.value)}
                  placeholder="제품 S/N, 엔진 S/N, IDDCA S/N, Unit Code"
                  className="mt-1"
                />
              </div>
              <p className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                특정 제품 1대를 시리얼 번호 기준으로 조회합니다.
              </p>
            </div>
          ) : (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="lot-lookup-keyword">LOT / Unit Code</Label>
                <Input
                  id="lot-lookup-keyword"
                  value={lotKeyword}
                  onChange={(e) => setLotKeyword(e.target.value)}
                  placeholder="LT-20260528-YI (부분 입력 가능)"
                  className="mt-1"
                />
              </div>
              <p className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                동일 LOT에 포함된 제품 묶음을 조회하고, LOT 내 Unit을 선택합니다.
              </p>
            </div>
          )}

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              조회
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              검색 조건 초기화
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-100 dark:border-white/[0.05]">
            {isPending ? (
              <ListPageLoading message="등록된 Unit을 조회하는 중입니다." skeletonRows={5} minHeight={220} />
            ) : !searchEnabled ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                검색 조건을 입력한 뒤 조회를 실행하세요.
              </div>
            ) : tab === "LOT" ? (
              <div className="grid min-h-[280px] grid-cols-1 lg:grid-cols-2">
                <div className="border-b border-gray-100 lg:border-b-0 lg:border-r dark:border-white/[0.05]">
                  <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-600 dark:border-white/[0.05] dark:text-gray-400">
                    LOT 목록 ({lotGroups.length}그룹 / 총 {totalCount}건)
                  </div>
                  {resultHint ? (
                    <div className="border-b border-gray-100 px-4 py-2 text-xs text-amber-700 dark:border-white/[0.05] dark:text-amber-300">
                      {resultHint}
                    </div>
                  ) : null}
                  <div className="max-h-[320px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                            LOT 번호
                          </TableCell>
                          <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                            수량
                          </TableCell>
                          <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                            가용
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lotGroups.map((group) => (
                          <TableRow
                            key={group.lotKey}
                            className={`cursor-pointer ${
                              focusedLotKey === group.lotKey
                                ? "bg-brand-50/60 dark:bg-brand-500/10"
                                : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                            }`}
                            onClick={() => setFocusedLotKey(group.lotKey)}
                          >
                            <TableCell className="px-3 py-2 text-theme-sm font-medium text-gray-800 dark:text-gray-100">
                              {group.lotKey}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                              {group.totalCount}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-theme-sm text-gray-700 dark:text-gray-300">
                              {group.selectableCount}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div>
                  <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-600 dark:border-white/[0.05] dark:text-gray-400">
                    {focusedLotKey ? `${focusedLotKey} 내 Unit` : "LOT를 선택하세요"}
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {focusedLotKey ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableCell isHeader className="w-10 px-3 py-2 text-center text-theme-xs text-gray-500">
                              선택
                            </TableCell>
                            <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                              시리얼
                            </TableCell>
                            <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                              상태
                            </TableCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>{focusedLotUnits.map((unit) => renderSerialRow(unit))}</TableBody>
                      </Table>
                    ) : (
                      <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        왼쪽 LOT 목록에서 그룹을 선택하면 Unit 목록이 표시됩니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {resultHint}
              </div>
            ) : (
              <>
                <div className="border-b border-gray-100 px-4 py-2 text-sm text-gray-600 dark:border-white/[0.05] dark:text-gray-400">
                  결과 {totalCount}건
                </div>
                {resultHint ? (
                  <div className="border-b border-gray-100 px-4 py-2 text-xs text-amber-700 dark:border-white/[0.05] dark:text-amber-300">
                    {resultHint}
                  </div>
                ) : null}
                <div className="max-h-[360px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableCell isHeader className="w-10 px-3 py-2 text-center text-theme-xs text-gray-500">
                          선택
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          시리얼 번호
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          제품/품목
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          LOT 번호
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          상태
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          보유 위치
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          납품일
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                          비고
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{rows.map((unit) => renderSerialRow(unit))}</TableBody>
                  </Table>
                </div>
                {totalCount > pageSize ? (
                  <div className="px-2 pb-2">
                    <TablePagination {...listPagination} />
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 dark:border-white/[0.05] sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-sm text-gray-600 dark:text-gray-400">
              {selectedIds.length === 0
                ? "선택된 항목 없음"
                : selectionMode === "single"
                  ? `선택됨: ${unitDisplaySerial(selectedUnits[0] ?? {})} / ${unitLotLabel(selectedUnits[0] ?? {})}`
                  : `선택됨: ${selectedIds.length}건`}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                취소
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={handleConfirm}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
