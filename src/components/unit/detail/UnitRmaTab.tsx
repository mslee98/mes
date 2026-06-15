import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { ProductionPlanUnitDetail } from "../../../api/purchaseOrder";
import { getRmaRequestById, getRmaRequests, type RmaStatus } from "../../../api/rma";
import { labelForCommonCode } from "../../../api/commonCode";
import { useAuth } from "../../../hooks/useAuth";
import { useRmaCommonCodes } from "../../../hooks/useRmaCommonCodes";
import { useRmaPermissions } from "../../../hooks/useRmaPermissions";
import ComponentCard from "../../common/ComponentCard";
import Badge from "../../ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { badgeColorByDomain } from "../../../lib/ui/badgeStatusColor";
import { formatDateTimeKo } from "../../../lib/format/dateFormat";
import { parsePositiveIntId } from "../../../lib/parseId";
import { RmaDetailPanel } from "./RmaDetailPanel";

const IN_PROGRESS_STATUSES: RmaStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "REPAIRING",
  "RETESTING",
];

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function statusLabel(
  code: string | null | undefined,
  statusCodes: Array<{ code: string; name: string }>
) {
  const statusCode = toText(code);
  if (!statusCode) return "미지정";
  const matched = statusCodes.find((item) => toText(item.code) === statusCode);
  return matched?.name || statusCode;
}

export interface UnitRmaTabProps {
  unit: ProductionPlanUnitDetail;
}

export function UnitRmaTab({ unit }: UnitRmaTabProps) {
  const unitId = String(unit.unitId ?? "").trim();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadRma, canCreateRma, canUpdateRma } = useRmaPermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRmaId = parsePositiveIntId(searchParams.get("rmaId"));

  const { rmaStatusCodes, rmaSymptomCodes, rmaReturnStatusCodes } = useRmaCommonCodes(
    accessToken,
    !isAuthLoading
  );

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ["rmaRequests", "byUnit", unitId],
    queryFn: () =>
      getRmaRequests(accessToken!, {
        productionPlanUnitId: unitId,
        page: 1,
        pageSize: 100,
      }),
    enabled: !!accessToken && !isAuthLoading && !!unitId && canReadRma,
  });

  const rows = listRes?.items ?? [];

  const summary = useMemo(() => {
    let inProgress = 0;
    let completed = 0;
    for (const row of rows) {
      if (IN_PROGRESS_STATUSES.includes(row.status)) inProgress += 1;
      else if (row.status === "COMPLETED" || row.status === "CLOSED") completed += 1;
    }
    return { total: rows.length, inProgress, completed };
  }, [rows]);

  const {
    data: selectedRma,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ["rmaRequest", selectedRmaId],
    queryFn: () => getRmaRequestById(accessToken!, selectedRmaId!),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      selectedRmaId != null &&
      canReadRma &&
      rows.some((r) => r.id === selectedRmaId),
  });

  const selectRma = (id: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "rma");
    next.set("rmaId", String(id));
    setSearchParams(next, { replace: true });
  };

  if (!canReadRma) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        RMA 조회 권한(rma.read)이 없습니다.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ComponentCard title="RMA 요약">
        <p className="text-theme-sm text-gray-700 dark:text-gray-300">
          전체 {summary.total}건 | 진행중 {summary.inProgress}건 | 완료·종료{" "}
          {summary.completed}건
          {unit.rmaCount != null ? (
            <span className="text-gray-500 dark:text-gray-400">
              {" "}
              (누적 {Number(unit.rmaCount) || 0}건)
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          신규 접수는 상단 「RMA 접수」 버튼을 사용하세요.
        </p>
      </ComponentCard>

      <ComponentCard title="RMA 이력">
        {listLoading ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-theme-sm text-gray-600 dark:text-gray-400">
              등록된 RMA 이력이 없습니다.
            </p>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-500">
              납품 이후 문제가 발생한 경우 RMA를 접수할 수 있습니다.
            </p>
            {canCreateRma && unit.isDelivered ? (
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                상단 「RMA 접수」에서 등록할 수 있습니다.
              </p>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  RMA 번호
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  접수일
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-theme-xs text-gray-500">
                  증상
                </TableCell>
                <TableCell isHeader className="px-3 py-2 text-center text-theme-xs text-gray-500">
                  상태
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {rows.map((row) => {
                const statusName = statusLabel(row.status, rmaStatusCodes);
                const isSelected = selectedRmaId === row.id;
                return (
                  <TableRow
                    key={row.id}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
                      isSelected ? "bg-brand-50/60 dark:bg-brand-500/10" : ""
                    }`}
                    onClick={() => selectRma(row.id)}
                  >
                    <TableCell className="px-3 py-3.5 text-theme-sm font-medium text-gray-800 dark:text-gray-100">
                      {toText(row.rmaNo) || `#${row.id}`}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-theme-sm text-gray-600 dark:text-gray-400">
                      {formatDateTimeKo(row.receivedAt, { emptyFallback: "-" })}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-theme-sm text-gray-700 dark:text-gray-300">
                      {labelForCommonCode(rmaSymptomCodes, row.symptomCode)}
                    </TableCell>
                    <TableCell className="px-3 py-3.5 text-center">
                      <Badge size="sm" color={badgeColorByDomain("delivery", statusName)}>
                        {statusName}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </ComponentCard>

      {selectedRmaId != null ? (
        <ComponentCard title="RMA 상세">
          {detailLoading ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">불러오는 중…</p>
          ) : selectedRma ? (
            <RmaDetailPanel
              rma={selectedRma}
              rmaStatusCodes={rmaStatusCodes}
              rmaSymptomCodes={rmaSymptomCodes}
              rmaReturnStatusCodes={rmaReturnStatusCodes}
              readOnlyHint={!canUpdateRma}
            />
          ) : (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              RMA 정보를 불러오지 못했습니다.
            </p>
          )}
        </ComponentCard>
      ) : null}
    </div>
  );
}
