import ComponentCard from "../../../components/common/ComponentCard";
import SearchableSelectWithCreate from "../../../components/form/SearchableSelectWithCreate";
import SelectInput from "../../../components/form/SelectInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { ArrowDownTrayIcon, CloseIcon, PencilIcon } from "../../../icons";
import { itemFormStrings as S } from "../../../pages/itemFormStrings";
import {
  OrderLineAmountSummary,
  type LineAmountSummary,
} from "../../../lib/orderLineAmountSummary";
import type { SearchableSelectOption } from "../../../components/form/SearchableSelectWithCreate";
import type { ItemRow, LensItemRow } from "../types";

type Props = {
  isNew: boolean;
  lineLayoutEditable: boolean;
  lensRowEditable: boolean;
  items: ItemRow[];
  lensItems: LensItemRow[];
  editingLineIds: number[];
  editingLensLineIds: number[];
  productSelectOptions: SearchableSelectOption[];
  lensSelectOptions: SearchableSelectOption[];
  unitOptions: { value: string; label: string }[];
  currencyOptions: { value: string; label: string }[];
  orderCurrencyCode: string;
  exchangeRateCurrencyCode: string;
  exchangeRateInput: string;
  onExchangeRateCurrencyChange: (value: string) => void;
  onExchangeRateInputChange: (value: string) => void;
  draftLineAmountSummaries: LineAmountSummary[];
  isLineCreatePending: boolean;
  isLineUpdatePending: boolean;
  isLineDeletePending: boolean;
  isLensLineCreatePending: boolean;
  isLensLineUpdatePending: boolean;
  isLensLineDeletePending: boolean;
  recentlySavedLineIds: number[];
  recentlySavedLensLineIds: number[];
  onAddItemRow: () => void;
  onAddLensItemRow: () => void;
  onSetLineProductId: (index: number, value: string) => void;
  onSetLineLensId: (index: number, value: string) => void;
  onUpdateItemRow: (
    index: number,
    key: keyof ItemRow,
    value: string | number | null
  ) => void;
  onUpdateLensItemRow: (
    index: number,
    key: keyof LensItemRow,
    value: string | number | null
  ) => void;
  onRemoveItemRow: (index: number) => void;
  onRemoveLensItemRow: (index: number) => void;
  onSaveLine: (index: number) => void;
  onCancelLineEdit: (index: number) => void;
  onBeginLineEdit: (lineId?: number) => void;
  onRemoveLine: (index: number) => void;
  onSaveLensLine: (index: number) => void;
  onCancelLensLineEdit: (index: number) => void;
  onBeginLensLineEdit: (lineId?: number) => void;
  onRemoveLensLine: (index: number) => void;
};

export default function OrderLineEditorSection({
  isNew,
  lineLayoutEditable,
  lensRowEditable,
  items,
  lensItems,
  editingLineIds,
  editingLensLineIds,
  productSelectOptions,
  lensSelectOptions,
  unitOptions,
  currencyOptions,
  orderCurrencyCode,
  exchangeRateCurrencyCode,
  exchangeRateInput,
  onExchangeRateCurrencyChange,
  onExchangeRateInputChange,
  draftLineAmountSummaries,
  isLineCreatePending,
  isLineUpdatePending,
  isLineDeletePending,
  isLensLineCreatePending,
  isLensLineUpdatePending,
  isLensLineDeletePending,
  recentlySavedLineIds,
  recentlySavedLensLineIds,
  onAddItemRow,
  onAddLensItemRow,
  onSetLineProductId,
  onSetLineLensId,
  onUpdateItemRow,
  onUpdateLensItemRow,
  onRemoveItemRow,
  onRemoveLensItemRow,
  onSaveLine,
  onCancelLineEdit,
  onBeginLineEdit,
  onRemoveLine,
  onSaveLensLine,
  onCancelLensLineEdit,
  onBeginLensLineEdit,
  onRemoveLensLine,
}: Props) {
  return (
    <ComponentCard
      collapsible
      title="발주 라인"
      headerEnd={
        <div className="flex items-center gap-2">
          <div className="w-64">
            <SelectInput
              id="order-line-exchange-rate"
              size="sm"
              selectOptions={currencyOptions}
              selectValue={exchangeRateCurrencyCode || "KRW"}
              onSelectChange={onExchangeRateCurrencyChange}
              inputValue={exchangeRateInput}
              onInputChange={onExchangeRateInputChange}
              inputPlaceholder="발주일 기준 환율"
              selectPlaceholder={S.selectCurrency}
              formatNumber
              maxFractionDigits={2}
              className="shadow-none max-w-full"
            />
          </div>
        </div>
      }
    >
      <div className="space-y-4 dark:border-gray-700">
        {!isNew && lineLayoutEditable ? (
          <p className="px-1 text-left text-theme-xs text-gray-500 dark:text-gray-400">
            제품·렌즈 라인은 행마다 저장하면 서버에 즉시 반영됩니다. 하단「수정」은 발주
            헤더(제목, 업체, 납기 등)만 저장합니다.
          </p>
        ) : null}
        <div className="relative overflow-x-auto border-b dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
              제품 라인
            </h4>
            {lineLayoutEditable ? (
              <button
                type="button"
                onClick={onAddItemRow}
                className="rounded-lg border border-brand-500 px-3 py-1.5 text-theme-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400 dark:hover:bg-gray-800"
              >
                + 제품 라인 추가
              </button>
            ) : null}
          </div>
          <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[24%]"
                >
                  제품 *
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[20%]"
                >
                  단위 · 수량 *
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[24%]"
                >
                  통화 · 단가 *
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[32%]"
                >
                  비고
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[88px] px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400"
                >
                  <span className="sr-only">행 작업</span>
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
              {items.map((row, index) => {
                const isDraftRow = !isNew && !row.lineId;
                const isLineEditing =
                  !isNew && !!row.lineId && editingLineIds.includes(row.lineId);
                const isEditReadonly = !isNew && !!row.lineId && !isLineEditing;

                return (
                  <TableRow key={index} className="align-middle hover:bg-transparent">
                    <TableCell className="min-w-0 px-3 py-3 text-center align-middle">
                      <div className="flex w-full min-w-0 justify-center">
                        <SearchableSelectWithCreate
                          id={`order-product-${index}`}
                          value={row.productId}
                          onChange={(v) => onSetLineProductId(index, v)}
                          options={productSelectOptions}
                          placeholder="제품"
                          addTrigger="none"
                          addButtonLabel="제품 추가"
                          onAddClick={() => {}}
                          compact
                          isClearable={false}
                          isDisabled={isEditReadonly}
                          className="w-full min-w-0 max-w-[min(100%,28rem)]"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      <div className="flex justify-center">
                        <SelectInput
                          id={`order-line-${index}-qty`}
                          size="sm"
                          selectOptions={unitOptions}
                          selectValue={row.unitCode}
                          onSelectChange={(v) => onUpdateItemRow(index, "unitCode", v)}
                          inputValue={row.qty === 0 ? "" : String(row.qty)}
                          onInputChange={(v) => {
                            const t = v.trim();
                            if (t === "") {
                              onUpdateItemRow(index, "qty", 0);
                              return;
                            }
                            const n = Number(t.replace(/,/g, ""));
                            onUpdateItemRow(index, "qty", Number.isFinite(n) ? n : 0);
                          }}
                          inputType="text"
                          inputMode="decimal"
                          inputPlaceholder="0"
                          selectPlaceholder="단위"
                          inputSuffix=""
                          selectClassName="min-w-[3.25rem] max-w-[4.25rem] pl-2 pr-7"
                          className="shadow-none max-w-full"
                          disabled={isEditReadonly}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      <div className="flex justify-center">
                        <SelectInput
                          id={`order-line-${index}-unitPrice`}
                          size="sm"
                          selectOptions={currencyOptions}
                          selectValue={row.currencyCode || "KRW"}
                          onSelectChange={(v) =>
                            onUpdateItemRow(index, "currencyCode", v)
                          }
                          inputValue={row.unitPrice}
                          onInputChange={(v) => onUpdateItemRow(index, "unitPrice", v)}
                          inputPlaceholder="0"
                          selectPlaceholder={S.selectCurrency}
                          formatNumber
                          maxFractionDigits={2}
                          className="shadow-none max-w-full"
                          disabled={isEditReadonly}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      <div className="flex justify-center">
                        <input
                          type="text"
                          value={row.remark}
                          onChange={(e) =>
                            onUpdateItemRow(index, "remark", e.target.value)
                          }
                          placeholder="비고"
                          className="h-9 w-full min-w-[6rem] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-center text-theme-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-brand-800"
                          aria-label="비고"
                          disabled={isEditReadonly}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      {isNew ? (
                        <button
                          type="button"
                          onClick={() => onRemoveItemRow(index)}
                          disabled={items.length <= 1}
                          title="행 삭제"
                          aria-label="행 삭제"
                          className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        >
                          <CloseIcon className="size-[18px]" aria-hidden />
                        </button>
                      ) : isDraftRow ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSaveLine(index)}
                            disabled={isLineCreatePending || isLineUpdatePending}
                            title="행 추가 저장"
                            aria-label="행 추가 저장"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            <ArrowDownTrayIcon className="size-[18px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveItemRow(index)}
                            disabled={items.length <= 1}
                            title="행 취소"
                            aria-label="행 취소"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          >
                          <CloseIcon className="size-[18px]" aria-hidden />
                          </button>
                        </div>
                      ) : isLineEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSaveLine(index)}
                            disabled={isLineCreatePending || isLineUpdatePending}
                            title="행 저장"
                            aria-label="행 저장"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            <ArrowDownTrayIcon className="size-[18px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelLineEdit(index)}
                            title="행 편집 취소"
                            aria-label="행 편집 취소"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          >
                          <CloseIcon className="size-[18px]" aria-hidden />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onBeginLineEdit(row.lineId)}
                            title="행 수정"
                            aria-label="행 수정"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-brand-400"
                          >
                            <PencilIcon className="size-[18px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveLine(index)}
                            disabled={isLineDeletePending || items.length <= 1}
                            title="행 삭제"
                            aria-label="행 삭제"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          >
                            <CloseIcon className="size-[18px]" aria-hidden />
                          </button>
                        </div>
                      )}
                      {row.lineId && recentlySavedLineIds.includes(row.lineId) ? (
                        <div className="mt-1 text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                          저장됨
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="relative overflow-x-auto border-b dark:border-gray-800">
          <div className="mb-2 flex items-center justify-between px-1">
            <h4 className="text-theme-sm font-medium text-gray-800 dark:text-gray-200">
              렌즈 라인 (선택)
            </h4>
            {lineLayoutEditable ? (
              <button
                type="button"
                onClick={onAddLensItemRow}
                className="rounded-lg border border-brand-500 px-3 py-1.5 text-theme-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400 dark:hover:bg-gray-800"
              >
                + 렌즈 라인 추가
              </button>
            ) : null}
          </div>
          <Table className="w-full text-center text-sm text-gray-900 dark:text-white md:table-fixed">
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[24%]"
                >
                  렌즈
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[20%]"
                >
                  단위 · 수량
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[24%]"
                >
                  통화 · 단가
                </TableCell>
                <TableCell
                  isHeader
                  className="whitespace-nowrap px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400 md:w-[32%]"
                >
                  비고
                </TableCell>
                <TableCell
                  isHeader
                  className="w-[88px] px-3 py-3 text-center align-middle font-medium text-gray-600 dark:text-gray-400"
                >
                  <span className="sr-only">행 작업</span>
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
              {lensItems.map((row, index) => {
                const isDraftLensRow = !isNew && !row.lineId;
                const isLensLineEditing =
                  !isNew && !!row.lineId && editingLensLineIds.includes(row.lineId);
                const isLensEditReadonly = !isNew && !!row.lineId && !isLensLineEditing;
                const lensFieldsDisabled =
                  !lensRowEditable || (!isNew && !!row.lineId && isLensEditReadonly);

                return (
                  <TableRow
                    key={row.lineId ? `lens-line-${row.lineId}` : `lens-draft-${index}`}
                    className="align-middle hover:bg-transparent"
                  >
                    <TableCell className="min-w-0 px-3 py-3 text-center align-middle">
                      <div className="flex w-full min-w-0 justify-center">
                        <SearchableSelectWithCreate
                          id={`order-lens-${index}`}
                          value={row.lensId}
                          onChange={(v) => onSetLineLensId(index, v)}
                          options={lensSelectOptions}
                          placeholder="렌즈"
                          addTrigger="none"
                          addButtonLabel=""
                          onAddClick={() => {}}
                          compact
                          isClearable={false}
                          isDisabled={lensFieldsDisabled}
                          className="w-full min-w-0 max-w-[min(100%,28rem)]"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      <div className="flex justify-center">
                        <SelectInput
                          id={`order-lens-line-${index}-qty`}
                          size="sm"
                          selectOptions={unitOptions}
                          selectValue={row.unitCode}
                          onSelectChange={(v) => onUpdateLensItemRow(index, "unitCode", v)}
                          inputValue={row.qty === 0 ? "" : String(row.qty)}
                          onInputChange={(v) => {
                            const t = v.trim();
                            if (t === "") {
                              onUpdateLensItemRow(index, "qty", 0);
                              return;
                            }
                            const n = Number(t.replace(/,/g, ""));
                            onUpdateLensItemRow(index, "qty", Number.isFinite(n) ? n : 0);
                          }}
                          inputType="text"
                          inputMode="decimal"
                          inputPlaceholder="0"
                          selectPlaceholder="단위"
                          inputSuffix=""
                          selectClassName="min-w-[3.25rem] max-w-[4.25rem] pl-2 pr-7"
                          className="shadow-none max-w-full"
                          disabled={lensFieldsDisabled}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      <div className="flex justify-center">
                        <SelectInput
                          id={`order-lens-line-${index}-unitPrice`}
                          size="sm"
                          selectOptions={currencyOptions}
                          selectValue={row.currencyCode || "KRW"}
                          onSelectChange={(v) =>
                            onUpdateLensItemRow(index, "currencyCode", v)
                          }
                          inputValue={row.unitPrice}
                          onInputChange={(v) => onUpdateLensItemRow(index, "unitPrice", v)}
                          inputPlaceholder="0"
                          selectPlaceholder={S.selectCurrency}
                          formatNumber
                          maxFractionDigits={2}
                          className="shadow-none max-w-full"
                          disabled={lensFieldsDisabled}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      <div className="flex justify-center">
                        <input
                          type="text"
                          value={row.remark}
                          onChange={(e) =>
                            onUpdateLensItemRow(index, "remark", e.target.value)
                          }
                          placeholder="비고"
                          className="h-9 w-full min-w-[6rem] rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-center text-theme-xs text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-white/30 dark:focus:border-brand-800"
                          aria-label="비고"
                          disabled={lensFieldsDisabled}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-center align-middle">
                      {isNew ? (
                        <button
                          type="button"
                          onClick={() => onRemoveLensItemRow(index)}
                          title="행 삭제"
                          aria-label="행 삭제"
                          className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                        >
                          <CloseIcon className="size-[18px]" aria-hidden />
                        </button>
                      ) : isDraftLensRow ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSaveLensLine(index)}
                            disabled={
                              isLensLineCreatePending || isLensLineUpdatePending
                            }
                            title="행 추가 저장"
                            aria-label="행 추가 저장"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            <ArrowDownTrayIcon className="size-[18px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveLensItemRow(index)}
                            title="행 취소"
                            aria-label="행 취소"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          >
                            <CloseIcon className="size-[18px]" aria-hidden />
                          </button>
                        </div>
                      ) : isLensLineEditing ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSaveLensLine(index)}
                            disabled={
                              isLensLineCreatePending || isLensLineUpdatePending
                            }
                            title="행 저장"
                            aria-label="행 저장"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-brand-600 transition-colors hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            <ArrowDownTrayIcon className="size-[18px]" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => onCancelLensLineEdit(index)}
                            title="행 편집 취소"
                            aria-label="행 편집 취소"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                          >
                            <CloseIcon className="size-[18px]" aria-hidden />
                          </button>
                        </div>
                      ) : lineLayoutEditable ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onBeginLensLineEdit(row.lineId)}
                              title="행 수정"
                              aria-label="행 수정"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/10 dark:hover:text-brand-400"
                            >
                              <PencilIcon className="size-[18px]" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveLensLine(index)}
                              disabled={isLensLineDeletePending}
                              title="행 삭제"
                              aria-label="행 삭제"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:pointer-events-none disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            >
                              <CloseIcon className="size-[18px]" aria-hidden />
                            </button>
                          </div>
                          {row.lineId &&
                          recentlySavedLensLineIds.includes(row.lineId) ? (
                            <div className="text-theme-xs font-medium text-brand-600 dark:text-brand-400">
                              저장됨
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-theme-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="relative inline-flex w-full items-center justify-center">
          <hr className="my-8 h-px w-64 max-w-full border-0 bg-gray-200 dark:bg-gray-700" />
          <span className="absolute left-1/2 -translate-x-1/2 bg-white px-3 text-sm font-medium text-gray-600 dark:bg-[#171F2F] dark:text-gray-400">
            주문 요약
          </span>
        </div>
        <OrderLineAmountSummary
          summaries={
            draftLineAmountSummaries.length > 0
              ? draftLineAmountSummaries
              : [
                  {
                    currencyCode: orderCurrencyCode || "KRW",
                    subtotal: 0,
                    vat: 0,
                    total: 0,
                  },
                ]
          }
        />
      </div>
    </ComponentCard>
  );
}
