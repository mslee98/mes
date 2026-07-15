import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  createDeliveryPlan,
  type ProductionPlanUnitListItem,
} from "../../api/purchaseOrder";
import { getUsers } from "../../api/user";
import DatePicker from "../form/date-picker";
import Label from "../form/Label";
import SearchableSelectWithCreate from "../form/SearchableSelectWithCreate";
import TextArea from "../form/input/TextArea";
import Input from "../form/input/InputField";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
} from "../list";
import { useAuth } from "../../hooks/useAuth";
import { notify } from "../../lib/notify";
import { invalidateProductionPlanUnitListQueries } from "../../domains/production-plan/queries/invalidateUnitListQueries";
import { invalidateDeliveryPlanListQueries } from "../../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import { validateDeliveryPlanUnitSelection } from "../../domains/delivery/helpers/deliveryPlanUnitSelection";
import { listUnitLotCode } from "../../domains/delivery/display/deliveryUnitListDisplay";
import { DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS } from "../../domains/delivery/layout/deliveryUnitDataTableLayout";

/** 모달 선택 품목 테이블 — 본문에 보이는 행 수(헤더 제외) */
const DELIVERY_PLAN_CREATE_MODAL_VISIBLE_ROW_COUNT = 10;
/** compact 2줄 행 기준 높이(rem) — `DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS`와 동일 */
const DELIVERY_PLAN_CREATE_MODAL_ROW_HEIGHT_REM = 2.75;
const DELIVERY_PLAN_CREATE_MODAL_HEADER_HEIGHT_REM = 2.25;
const DELIVERY_PLAN_CREATE_MODAL_SCROLL_MAX_HEIGHT = `${
  DELIVERY_PLAN_CREATE_MODAL_HEADER_HEIGHT_REM +
  DELIVERY_PLAN_CREATE_MODAL_VISIBLE_ROW_COUNT *
    DELIVERY_PLAN_CREATE_MODAL_ROW_HEIGHT_REM
}rem`;

/** 헤더·본문 단일 그리드 — 3컬럼(LOT · 품목 · 생산 계획) */
const DELIVERY_PLAN_CREATE_MODAL_GRID_TEMPLATE =
  "minmax(5.5rem, 1.1fr) minmax(8rem, 2fr) minmax(5.5rem, 1.2fr)";

export type DeliveryPlanCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedUnits: ProductionPlanUnitListItem[];
  onSuccess?: () => void;
};

export function DeliveryPlanCreateModal({
  isOpen,
  onClose,
  selectedUnits,
  onSuccess,
}: DeliveryPlanCreateModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [deliveryManagerId, setDeliveryManagerId] = useState("");
  const [remark, setRemark] = useState("");

  const resetForm = useCallback(() => {
    setTitle("");
    setPlannedDeliveryDate("");
    setDeliveryManagerId("");
    setRemark("");
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetForm();
  }, [isOpen, resetForm]);

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken && !isAuthLoading && isOpen,
  });

  const managerOptions = useMemo(
    () =>
      users
        .filter((u) => u.isActive !== false)
        .map((u) => ({
          value: String(u.id),
          label: `${u.name} (${u.employeeNo})`,
        })),
    [users]
  );

  const orderNo = selectedUnits[0]?.order?.orderNo?.trim() || "-";
  const partnerName =
    selectedUnits[0]?.partner?.name?.trim() ||
    selectedUnits[0]?.order?.partnerName?.trim() ||
    "-";

  const createMutation = useMutation({
    mutationFn: async () => {
      const validation = validateDeliveryPlanUnitSelection(selectedUnits);
      if (!validation.ok) {
        throw new Error(validation.message);
      }

      const managerRaw = deliveryManagerId.trim();
      const managerNum = managerRaw ? Number(managerRaw) : null;

      return createDeliveryPlan(
        validation.orderId,
        {
          unitIds: validation.unitIds,
          title: title.trim() || null,
          plannedDeliveryDate: plannedDeliveryDate.trim() || null,
          deliveryDate: null,
          deliveryManagerId:
            managerNum != null && Number.isFinite(managerNum) ? managerNum : null,
          remark: remark.trim() || null,
        },
        accessToken!
      );
    },
    onSuccess: (plan) => {
      notify.success("납품 계획이 등록되었습니다.");
      onClose();
      resetForm();
      onSuccess?.();
      void invalidateProductionPlanUnitListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderDeliveryPlans"] });
      void invalidateDeliveryPlanListQueries(queryClient);
      const planId = String(plan.id ?? "").trim();
      if (planId) {
        navigate(`/delivery/plans/${encodeURIComponent(planId)}`);
      }
    },
    onError: (e: Error) => {
      notify.error(e.message || "납품 계획 등록에 실패했습니다.");
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-w-3xl p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            납품 계획 만들기
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            발주 {orderNo} · {partnerName} · 선택 {selectedUnits.length}건
          </p>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <div
          className="overflow-y-auto overflow-x-auto rounded-lg border border-gray-100 dark:border-white/[0.06]"
          style={{ maxHeight: DELIVERY_PLAN_CREATE_MODAL_SCROLL_MAX_HEIGHT }}
        >
          <DataTable fillWidth minWidth={0}>
            <DataTableHeader
              gridTemplateColumns={DELIVERY_PLAN_CREATE_MODAL_GRID_TEMPLATE}
              className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <DataTableHeaderCell compact sortable={false} align="center">
                <DataTableHeaderLabel align="center">LOT</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell compact sortable={false} align="center">
                <DataTableHeaderLabel align="center">품목</DataTableHeaderLabel>
              </DataTableHeaderCell>
              <DataTableHeaderCell
                compact
                sortable={false}
                align="center"
                className="border-r-0"
              >
                <DataTableHeaderLabel align="center">생산 계획</DataTableHeaderLabel>
              </DataTableHeaderCell>
            </DataTableHeader>
            <DataTableBody>
              {selectedUnits.map((row) => (
                <DataTableRow
                  key={row.unitId}
                  gridTemplateColumns={DELIVERY_PLAN_CREATE_MODAL_GRID_TEMPLATE}
                  className={DELIVERY_UNIT_ROW_MIN_HEIGHT_CLASS}
                >
                  <DataTableCell
                    compact
                    align="center"
                    className="font-mono text-theme-xs"
                  >
                    {listUnitLotCode(row)}
                  </DataTableCell>
                  <DataTableCell compact align="center" className="min-w-0">
                    <div className="flex min-w-0 flex-col items-center justify-center leading-tight">
                      <p className="w-full truncate text-theme-xs font-medium text-gray-900 dark:text-white">
                        {row.item?.businessNameSnapshot?.trim() || "-"}
                      </p>
                      <p className="w-full truncate text-theme-xs text-gray-500 dark:text-gray-400">
                        {row.item?.productNameSnapshot?.trim() || "-"}
                      </p>
                    </div>
                  </DataTableCell>
                  <DataTableCell
                    compact
                    align="center"
                    className="border-r-0 text-theme-xs"
                  >
                    {row.plan?.planNo?.trim() || row.plan?.planId || "-"}
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="delivery-plan-title">납품 계획명 (선택)</Label>
            <Input
              id="delivery-plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 1차 납품"
            />
          </div>
          <div>
            <Label htmlFor="delivery-plan-planned-date">납품 예정일 (선택)</Label>
            <DatePicker
              id="delivery-plan-planned-date"
              placeholder="년-월-일"
              value={plannedDeliveryDate}
              onValueChange={setPlannedDeliveryDate}
            />
          </div>
          <div>
            <SearchableSelectWithCreate
              id="delivery-plan-manager"
              label="납품 담당자 (선택)"
              value={deliveryManagerId}
              onChange={setDeliveryManagerId}
              options={managerOptions}
              placeholder={
                isAuthLoading ? "담당자 불러오는 중…" : "담당자 검색·선택"
              }
              noOptionsMessage="표시할 담당자가 없습니다."
              addTrigger="none"
              addButtonLabel=""
              onAddClick={() => {}}
              isDisabled={isAuthLoading}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="delivery-plan-remark">비고 (선택)</Label>
            <TextArea
              id="delivery-plan-remark"
              value={remark}
              rows={3}
              onChange={setRemark}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            size="sm"
            disabled={createMutation.isPending || selectedUnits.length === 0}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "등록 중…" : "납품 계획 등록"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
