import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deliverDeliveryPlan,
  type DeliveryPlanGroup,
  type DeliveryPlanUnitSummary,
} from "../../../api/purchaseOrder";
import DatePicker from "../../form/date-picker";
import Label from "../../form/Label";
import TextArea from "../../form/input/TextArea";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DATA_TABLE_COMPACT_BODY_TEXT_CLASS,
  DATA_TABLE_COMPACT_LABEL_CLASS,
  DATA_TABLE_COMPACT_STACK_CLASS,
  DATA_TABLE_COMPACT_STACK_ROW_CLASS,
} from "../../list";
import { Modal } from "../../ui/modal";
import Button from "../../ui/button/Button";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../lib/notify";
import { MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL_SENTENCE } from "../../../domains/delivery/labels/statusLabels";
import { invalidateDeliveryPlanListQueries } from "../../../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import { formatDateYmd } from "../../../lib/format/dateFormat";
import { isApiError } from "../../../lib/api/apiError";
import {
  deliverPlanErrorMessage,
  deliveryPlanUnitDetectorSerialDisplay,
  deliveryPlanUnitLotDisplay,
  deliveryPlanUnitProductSerialDisplay,
  formatDeliverPlanSuccessMessage,
  formatDeliveryPlanUnitErrorDetail,
  listDeliveryPlanUnitsWithIncompleteDeliverFields,
  resolveUnitItemLabel,
} from "../../../domains/delivery/helpers/deliveryPlanDetailHelpers";
import { DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS } from "../../../domains/delivery/layout/deliveryUnitDataTableLayout";

const DELIVER_MODAL_GRID_TEMPLATE =
  "minmax(10rem, 1.5fr) minmax(8rem, 1.4fr) minmax(6rem, 1.2fr)";

type DeliveryPlanDeliverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  purchaseOrderId: string;
  readyUnitsToDeliver: DeliveryPlanUnitSummary[];
  skippedUnits: DeliveryPlanUnitSummary[];
  undeliveredUnitCount: number;
  groupByUnitId?: Map<string, DeliveryPlanGroup>;
};

export function DeliveryPlanDeliverModal({
  isOpen,
  onClose,
  planId,
  purchaseOrderId,
  readyUnitsToDeliver,
  skippedUnits,
  undeliveredUnitCount,
  groupByUnitId,
}: DeliveryPlanDeliverModalProps) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const [deliveryDate, setDeliveryDate] = useState("");
  const [remark, setRemark] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorDetails, setSubmitErrorDetails] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const today = formatDateYmd(new Date().toISOString(), { emptyFallback: "" });
    setDeliveryDate(today === "—" ? "" : today);
    setRemark("");
    setSubmitError(null);
    setSubmitErrorDetails([]);
  }, [isOpen]);

  const previewRows = useMemo(
    () =>
      readyUnitsToDeliver.map((unit) => {
        const unitId = String(unit.id).trim();
        const group = groupByUnitId?.get(unitId);
        return {
          id: unitId,
          lot: deliveryPlanUnitLotDisplay(unit),
          productSerial: deliveryPlanUnitProductSerialDisplay(unit),
          detectorSerial: deliveryPlanUnitDetectorSerialDisplay(unit),
          item: group
            ? resolveUnitItemLabel(unit, group)
            : unit.itemName?.trim() || "—",
        };
      }),
    [readyUnitsToDeliver, groupByUnitId]
  );

  const incompleteDeliverUnits = useMemo(
    () => listDeliveryPlanUnitsWithIncompleteDeliverFields(readyUnitsToDeliver),
    [readyUnitsToDeliver]
  );

  const hasReadySerialIssues = incompleteDeliverUnits.length > 0;

  const canSubmitDelivery =
    undeliveredUnitCount > 0 &&
    Boolean(deliveryDate.trim()) &&
    !hasReadySerialIssues;

  const deliverMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      const d = deliveryDate.trim();
      if (!d) throw new Error("납품일(제품 인계일)을 선택하세요.");

      return deliverDeliveryPlan(
        planId,
        { deliveryDate: d, remark },
        accessToken
      );
    },
    onSuccess: (result) => {
      notify.success(formatDeliverPlanSuccessMessage(result));
      queryClient.invalidateQueries({ queryKey: ["deliveryPlan", planId] });
      void invalidateDeliveryPlanListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["productionPlanUnits"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveries", purchaseOrderId],
      });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", purchaseOrderId] });
      onClose();
    },
    onError: (e: Error) => {
      if (isApiError(e) && e.details?.length) {
        setSubmitError(deliverPlanErrorMessage(e));
        setSubmitErrorDetails(
          e.details.map((detail) => formatDeliveryPlanUnitErrorDetail(detail))
        );
        return;
      }
      setSubmitError(null);
      setSubmitErrorDetails([]);
      notify.error(deliverPlanErrorMessage(e));
    },
  });

  const isBusy = deliverMutation.isPending;
  const headerSummary =
    readyUnitsToDeliver.length > 0
      ? `납품 대기 ${readyUnitsToDeliver.length}대 실납품 · 진행 중 ${skippedUnits.length}대 제외 · 계획 완료`
      : `납품 대기 0대 · 진행 중 ${skippedUnits.length}대 제외 · 계획만 완료`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            납품 등록
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {headerSummary}
          </p>
        </>
      }
    >
      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4">
        {undeliveredUnitCount === 0 ? (
          <p className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
            미납품 품목이 없습니다.
          </p>
        ) : (
          <>
            {readyUnitsToDeliver.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <p className="text-theme-xs text-gray-700 dark:text-gray-300">
                  이번에 실납품할 납품 대기 품목이 없습니다. 확인 시 납품 계획만
                  완료 처리됩니다. 남은 품목은 공정 완료 후{" "}
                  {MSG_INDIVIDUAL_DELIVERY_AT_UNIT_DETAIL_SENTENCE}
                </p>
              </div>
            ) : null}

            {skippedUnits.length > 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-300">
                  진행 중 {skippedUnits.length}대 — 이번 납품에서 제외됩니다
                  (납품 대기 아님)
                </p>
                <ul className="mt-1.5 space-y-0.5 text-theme-xs text-gray-600 dark:text-gray-400">
                  {skippedUnits.map((unit) => (
                    <li key={String(unit.id).trim()} className="truncate font-mono">
                      {deliveryPlanUnitLotDisplay(unit)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasReadySerialIssues ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="text-theme-xs font-medium text-amber-800 dark:text-amber-300">
                  납품 대기 품목 중 시리얼·소자 정보가 부족합니다. 보완 후 다시
                  시도하세요.
                </p>
                <ul className="mt-1.5 space-y-0.5 text-theme-xs text-amber-700 dark:text-amber-200/90">
                  {incompleteDeliverUnits.map(({ unit, missing }) => (
                    <li key={String(unit.id).trim()}>
                      {deliveryPlanUnitLotDisplay(unit)} — {missing.join(", ")} 누락
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {previewRows.length > 0 ? (
              <div className="max-h-[min(20rem,40vh)] min-h-0 overflow-x-auto overflow-y-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
                <DataTable fillWidth minWidth={0} scrollContainer={false}>
                  <DataTableHeader
                    gridTemplateColumns={DELIVER_MODAL_GRID_TEMPLATE}
                    className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                  >
                    <DataTableHeaderCell compact sortable={false}>
                      <DataTableHeaderLabel>LOT</DataTableHeaderLabel>
                    </DataTableHeaderCell>
                    <DataTableHeaderCell compact sortable={false}>
                      <DataTableHeaderLabel>S/N</DataTableHeaderLabel>
                    </DataTableHeaderCell>
                    <DataTableHeaderCell compact sortable={false} className="border-r-0">
                      <DataTableHeaderLabel>품목</DataTableHeaderLabel>
                    </DataTableHeaderCell>
                  </DataTableHeader>
                  <DataTableBody>
                    {previewRows.map((row) => (
                      <DataTableRow
                        key={row.id}
                        gridTemplateColumns={DELIVER_MODAL_GRID_TEMPLATE}
                        className={DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS}
                      >
                        <DataTableCell compact className="min-w-0 font-mono">
                          <span
                            className="truncate text-theme-xs font-mono text-gray-800 dark:text-white/90"
                            title={row.lot}
                          >
                            {row.lot}
                          </span>
                        </DataTableCell>
                        <DataTableCell compact className="min-w-0 items-start">
                          <div className={DATA_TABLE_COMPACT_STACK_CLASS}>
                            <div className={DATA_TABLE_COMPACT_STACK_ROW_CLASS}>
                              <span className={DATA_TABLE_COMPACT_LABEL_CLASS}>
                                제품
                              </span>
                              <span
                                className={`min-w-0 truncate font-mono ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS} text-gray-800 dark:text-white/90`}
                                title={row.productSerial}
                              >
                                {row.productSerial}
                              </span>
                            </div>
                            <div className={DATA_TABLE_COMPACT_STACK_ROW_CLASS}>
                              <span className={DATA_TABLE_COMPACT_LABEL_CLASS}>
                                검출기
                              </span>
                              <span
                                className={`min-w-0 truncate font-mono ${DATA_TABLE_COMPACT_BODY_TEXT_CLASS} text-gray-800 dark:text-white/90`}
                                title={row.detectorSerial}
                              >
                                {row.detectorSerial}
                              </span>
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell
                          compact
                          className="min-w-0 border-r-0"
                          textClassName={DATA_TABLE_COMPACT_BODY_TEXT_CLASS}
                        >
                          <span className="truncate" title={row.item}>
                            {row.item}
                          </span>
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            ) : null}
          </>
        )}

        {submitError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-500/30 dark:bg-red-500/10">
            <p className="text-theme-sm font-medium text-red-700 dark:text-red-300">
              {submitError}
            </p>
            {submitErrorDetails.length > 0 ? (
              <ul className="mt-1.5 space-y-0.5 text-theme-xs text-red-600 dark:text-red-200/90">
                {submitErrorDetails.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {undeliveredUnitCount > 0 ? (
          <>
            <div>
              <Label htmlFor="dp-deliver-date">납품일(제품 인계일)</Label>
              <DatePicker
                id="dp-deliver-date"
                placeholder="년-월-일"
                value={deliveryDate}
                onValueChange={setDeliveryDate}
              />
            </div>
            <div>
              <Label htmlFor="dp-deliver-remark">비고</Label>
              <TextArea
                id="dp-deliver-remark"
                value={remark}
                onChange={setRemark}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isBusy}
              >
                취소
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isBusy || !canSubmitDelivery}
                onClick={() => {
                  setSubmitError(null);
                  setSubmitErrorDetails([]);
                  deliverMutation.mutate();
                }}
              >
                {isBusy ? "등록 중..." : "납품 등록"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
}
