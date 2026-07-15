import type { CommonCodeItem } from "../../../api/commonCode";
import type { ReactNode } from "react";
import { Modal } from "../../../components/ui/modal";
import { ProductionPlanOrderSummary } from "../../../components/order/ProductionPlanOrderSummary";
import { ProductionQuantityInputSection } from "../../../components/order/ProductionQuantityInputSection";
import Label from "../../../components/form/Label";
import DatePicker from "../../../components/form/date-picker";
import SearchableSelectWithCreate from "../../../components/form/SearchableSelectWithCreate";
import TextArea from "../../../components/form/input/TextArea";
import IconTooltip from "../../../components/ui/tooltip/IconTooltip";
import {
  ltSerialExample,
  LT_SERIAL_PATTERN_DESCRIPTION,
} from "../../../lib/format/ltSerialFormat";
import {
  LOT_UNIT_CODE_PATTERN_DESCRIPTION,
  yearCodeFromOrderDate,
} from "../../../lib/format/lotUnitCodeFormat";
import { resolvePartnerForDisplay } from "../../../domains/partner/display/partnerDisplay";
import type {
  PurchaseOrderDetail,
  PurchaseOrderItem,
} from "../../../api/purchaseOrder";
import type { DeliverySerialPreviewRow } from "../hooks/useOrderDetailDeliveryModal";
import type { OrderDetailDeliveryLotPreviewRow } from "../hooks/useOrderDetailMutations";

type OrderDetailDeliveryModalSectionProps = {
  isOpen: boolean;
  onClose: () => void;
  purpose: "actual" | "plan";
  po: PurchaseOrderDetail;
  partnerNameWithFlag: ReactNode;
  orderLines: PurchaseOrderItem[];
  isAuthLoading: boolean;
  deliveryDate: string;
  onDeliveryDateChange: (value: string) => void;
  plannedDeliveryDate: string;
  onPlannedDeliveryDateChange: (value: string) => void;
  deliveryManagerUserSelectValue: string;
  onDeliveryManagerUserSelectValueChange: (value: string) => void;
  deliveryManagerUserOptions: { value: string; label: string }[];
  deliveryRemark: string;
  onDeliveryRemarkChange: (value: string) => void;
  deliverySerialQtyInput: string;
  onDeliverySerialQtyInputChange: (value: string) => void;
  orderTotalQty: number;
  orderConsumedQty: number;
  thisProductionQty: number;
  orderRemainingQty: number;
  displayedRemainingQty: number;
  hasDeliveryTargets: boolean;
  deliveryLotPreviewRows: OrderDetailDeliveryLotPreviewRow[];
  deliverySerialPreviewRows: DeliverySerialPreviewRow[];
  isLotBulkOperatorPopoverOpen: boolean;
  onToggleLotBulkOperatorPopover: () => void;
  lotBulkOperatorPopoverRef: React.RefObject<HTMLDivElement | null>;
  deliveryLotBulkOperatorUserValue: string;
  onDeliveryLotBulkOperatorUserValueChange: (value: string) => void;
  operatorUserOptions: { value: string; label: string }[];
  onApplyBulkOperatorUser: () => void;
  onCloseLotBulkOperatorPopover: () => void;
  canApplyBulkOperator: boolean;
  isLotRulePopoverOpen: boolean;
  onToggleLotRulePopover: () => void;
  onUpdateLotPreviewOperatorUser: (index: number, value: string) => void;
  isSerialRulePopoverOpen: boolean;
  onToggleSerialRulePopover: () => void;
  lotYearCodes: CommonCodeItem[];
  onUpdateSerialPreviewSerialNo: (index: number, value: string) => void;
  isSubmitPending: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  submitDisabled: boolean;
};

export function OrderDetailDeliveryModalSection({
  isOpen,
  onClose,
  purpose,
  po,
  partnerNameWithFlag,
  orderLines,
  isAuthLoading,
  deliveryDate,
  onDeliveryDateChange,
  plannedDeliveryDate,
  onPlannedDeliveryDateChange,
  deliveryManagerUserSelectValue,
  onDeliveryManagerUserSelectValueChange,
  deliveryManagerUserOptions,
  deliveryRemark,
  onDeliveryRemarkChange,
  deliverySerialQtyInput,
  onDeliverySerialQtyInputChange,
  orderTotalQty,
  orderConsumedQty,
  thisProductionQty,
  orderRemainingQty,
  displayedRemainingQty,
  hasDeliveryTargets,
  deliveryLotPreviewRows,
  deliverySerialPreviewRows,
  isLotBulkOperatorPopoverOpen,
  onToggleLotBulkOperatorPopover,
  lotBulkOperatorPopoverRef,
  deliveryLotBulkOperatorUserValue,
  onDeliveryLotBulkOperatorUserValueChange,
  operatorUserOptions,
  onApplyBulkOperatorUser,
  onCloseLotBulkOperatorPopover,
  canApplyBulkOperator,
  isLotRulePopoverOpen,
  onToggleLotRulePopover,
  onUpdateLotPreviewOperatorUser,
  isSerialRulePopoverOpen,
  onToggleSerialRulePopover,
  lotYearCodes,
  onUpdateSerialPreviewSerialNo,
  isSubmitPending,
  onSubmit,
  onCancel,
  submitDisabled,
}: OrderDetailDeliveryModalSectionProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-h-[90vh] max-w-3xl overflow-y-auto p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {purpose === "plan" ? "생산 계획 등록" : "실제 생산 등록"}
          </h3>
          {purpose === "plan" ? null : (
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
              발주 종결 후 실제 생산 헤더·라인·시리얼을 등록합니다. 저장 후
              동일 발주의 생산 계획에서 출고 가능한 Unit을 생산 라인에 연결할
              수 있습니다.
            </p>
          )}
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <ProductionPlanOrderSummary
          orderNo={po.orderNo ?? "-"}
          partnerLabel={partnerNameWithFlag}
          orderLines={orderLines}
          dueDate={po.dueDate}
          requesterName={po.requesterName}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="delivery-date" required>
                IDCCA 인수일
              </Label>
              <IconTooltip
                ariaLabel="IDCCA 인수일 안내"
                content="IDCCA 인수일은 제조사업부로부터 IDCCA 인수를 받는 일자를 의미합니다."
              />
            </div>
            <DatePicker
              id="delivery-date"
              placeholder="년-월-일"
              value={deliveryDate}
              onValueChange={onDeliveryDateChange}
            />
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              {purpose === "plan" ? (
                <Label htmlFor="delivery-planned-date" required>
                  생산 예정일
                </Label>
              ) : (
                <Label htmlFor="delivery-planned-date">생산 예정일 (선택)</Label>
              )}
              <IconTooltip
                ariaLabel="생산 예정일 안내"
                content="생산 예정일은 해당 생산계획 건에 대한 예정 생산일을 의미합니다."
              />
            </div>
            <DatePicker
              id="delivery-planned-date"
              placeholder="년-월-일"
              value={plannedDeliveryDate}
              onValueChange={onPlannedDeliveryDateChange}
            />
          </div>
          <div>
            <SearchableSelectWithCreate
              id="delivery-manager-user"
              label="관리 담당자"
              required
              value={deliveryManagerUserSelectValue}
              onChange={onDeliveryManagerUserSelectValueChange}
              options={deliveryManagerUserOptions}
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
          <div className="sm:col-span-3">
            <Label htmlFor="delivery-remark">비고 (선택)</Label>
            <TextArea
              id="delivery-remark"
              value={deliveryRemark}
              rows={3}
              onChange={onDeliveryRemarkChange}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-3">
            <ProductionQuantityInputSection
              qtyInput={deliverySerialQtyInput}
              onQtyInputChange={onDeliverySerialQtyInputChange}
              orderTotalQty={orderTotalQty}
              orderConsumedQty={orderConsumedQty}
              thisProductionQty={thisProductionQty}
              orderRemainingQty={orderRemainingQty}
              displayedRemainingQty={displayedRemainingQty}
              exceedsRemaining={thisProductionQty > orderRemainingQty}
              purpose={purpose}
            />
          </div>
        </div>

        {purpose === "plan" ? (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                LOT 번호 미리보기
              </p>
              <div className="flex items-center gap-2">
                <div className="relative" ref={lotBulkOperatorPopoverRef}>
                  <button
                    type="button"
                    onClick={onToggleLotBulkOperatorPopover}
                    disabled={deliveryLotPreviewRows.length === 0}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    생산 담당자 전체 적용
                  </button>
                  {isLotBulkOperatorPopoverOpen ? (
                    <div className="absolute top-9 right-0 z-20 w-[18rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        생산 담당자 전체 적용
                      </p>
                      <p className="mt-1 text-gray-500 dark:text-gray-400">
                        선택한 생산 담당자를 현재 LOT 미리보기 모든 행에
                        반영합니다.
                      </p>
                      <div className="mt-3">
                        <SearchableSelectWithCreate
                          value={deliveryLotBulkOperatorUserValue}
                          onChange={onDeliveryLotBulkOperatorUserValueChange}
                          options={operatorUserOptions}
                          placeholder="생산 담당자 선택"
                          noOptionsMessage="표시할 담당자가 없습니다."
                          addTrigger="none"
                          addButtonLabel=""
                          onAddClick={() => {}}
                          isDisabled={isAuthLoading}
                          compact
                        />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={onCloseLotBulkOperatorPopover}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          닫기
                        </button>
                        <button
                          type="button"
                          onClick={onApplyBulkOperatorUser}
                          disabled={!canApplyBulkOperator}
                          className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          적용
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={onToggleLotRulePopover}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    LOT 구성 설명
                  </button>
                  {isLotRulePopoverOpen ? (
                    <div className="absolute top-9 right-0 z-20 w-[20rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                      <p className="font-semibold">LOT 패턴</p>
                      <p className="mt-1 break-all">
                        {LOT_UNIT_CODE_PATTERN_DESCRIPTION}
                      </p>
                      <p className="mt-2 text-gray-500 dark:text-gray-400">
                        미리보기는 표시용이며 DB에 예약되지 않습니다. 저장 시 서버가
                        다시 채번하므로 확정 번호는 달라질 수 있습니다. 생산
                        담당자는 행 순서(offset) 기준으로 함께 저장됩니다.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {!hasDeliveryTargets ? (
              <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                생산 등록 가능한 제품 라인이 없습니다.
              </p>
            ) : (
              <>
                <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                  <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-800/80">
                      <tr>
                        <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          순번
                        </th>
                        <th className="min-w-[16rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          LOT 번호
                        </th>
                        <th className="min-w-[15rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                          생산 담당자
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {deliveryLotPreviewRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                          >
                            이번 생산 수량·IDCCA 인수일을 입력하면 LOT가
                            표시됩니다.
                          </td>
                        </tr>
                      ) : (
                        deliveryLotPreviewRows.map((row, index) => (
                          <tr key={row.key}>
                            <td className="px-2 py-2 text-left tabular-nums text-gray-700 dark:text-gray-300">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2">
                              <span className="block min-w-[14rem] rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900/60 dark:text-white">
                                {row.unitCode}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <SearchableSelectWithCreate
                                value={row.operatorUserId}
                                onChange={(value) =>
                                  onUpdateLotPreviewOperatorUser(index, value)
                                }
                                options={operatorUserOptions}
                                placeholder="생산 담당자 선택"
                                noOptionsMessage="표시할 담당자가 없습니다."
                                addTrigger="none"
                                addButtonLabel=""
                                onAddClick={() => {}}
                                isDisabled={isAuthLoading}
                                compact
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                  생산 담당자는 LOT 미리보기 행 순서 기준으로 저장됩니다. 일부
                  행만 선택하지 않아도 저장할 수 있습니다.
                </p>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                시리얼 번호 미리보기
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={onToggleSerialRulePopover}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  시리얼 구성 설명
                </button>
                {isSerialRulePopoverOpen ? (
                  <div className="absolute top-9 right-0 z-20 w-[20rem] rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-5 text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <p className="font-semibold">시리얼 패턴</p>
                    <p className="mt-1 break-all">
                      {LT_SERIAL_PATTERN_DESCRIPTION}
                    </p>
                    <p className="mt-2 break-all font-mono text-gray-600 dark:text-gray-300">
                      예:{" "}
                      {ltSerialExample(
                        deliveryDate.trim() ||
                          new Date().toISOString().slice(0, 10),
                        yearCodeFromOrderDate(deliveryDate, lotYearCodes) || "P",
                        String(
                          resolvePartnerForDisplay(po.partner, po.partnerSummary)
                            ?.code ?? "EO"
                        )
                          .trim()
                          .toUpperCase()
                      )}
                    </p>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      yyyyMMdd·년도코드(1자)는 IDCCA 인수일 기준, 일련번호는
                      발주·업체 단위로 증가합니다.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            {!hasDeliveryTargets ? (
              <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                생산 등록 가능한 제품 라인이 없습니다.
              </p>
            ) : (
              <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                <table className="min-w-full divide-y divide-gray-200 text-theme-sm dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-800/80">
                    <tr>
                      <th className="w-20 px-2 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        순번
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        라인
                      </th>
                      <th className="min-w-[16rem] px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
                        시리얼 번호
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {deliverySerialPreviewRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-3 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          이번 생산 수량을 입력하면 시리얼이 자동으로 표시됩니다.
                        </td>
                      </tr>
                    ) : (
                      deliverySerialPreviewRows.map((row, index) => (
                        <tr key={row.key}>
                          <td className="px-2 py-2 text-left tabular-nums text-gray-700 dark:text-gray-300">
                            {index + 1}
                          </td>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                            {row.lineLabel}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              aria-label={`시리얼 번호 ${index + 1}`}
                              value={row.serialNo}
                              onChange={(e) =>
                                onUpdateSerialPreviewSerialNo(index, e.target.value)
                              }
                              className="w-full min-w-[14rem] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm font-mono text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isSubmitPending
            ? "등록 중..."
            : purpose === "plan"
              ? "생산 계획 저장 및 LOT 발급"
              : "실제 생산 등록"}
        </button>
      </div>
    </Modal>
  );
}
