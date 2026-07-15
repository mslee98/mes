import type { FormEvent } from "react";
import { notify } from "../../../lib/notify";
import { validateRequiredFields } from "../../../lib/formValidation";
import { isYmdRangeValid } from "../../../lib/format/dateFormat";
import { normalizeCurrencyCode } from "../../../lib/format/formatCurrency";
import {
  parseLineUnitPrice,
  parseOptionalExchangeRate,
} from "../../../lib/format/priceInput";
import {
  parseRequesterEmployeeNoFromSelect,
  parseRequesterNameFromSelect,
} from "../../../domains/order/helpers/orderRequesterSelect";
import { buildOrderLineRequestPayload } from "../../../domains/order/helpers/buildOrderLineRequestPayload";
import { resolveOrderLineDetectorPayload } from "../../../domains/order/helpers/orderLineDetectorFields";
import type { EmployeeDirectoryItem } from "../../../api/user";
import type { PurchaseOrderDetail } from "../../../api/purchaseOrder";
import type { RepresentativeProduct } from "../../../api/products";
import {
  buildCreatePayload,
  buildUpdatePayload,
} from "../utils/payload";
import { isPartialProductRow } from "../utils/itemRow";
import { computeHeaderSupplyAmount } from "../utils/supplyAmount";
import type { useOrderFormMutations } from "./useOrderFormMutations";
import type { useOrderFormState } from "./useOrderFormState";

type FormState = ReturnType<typeof useOrderFormState>;
type Mutations = ReturnType<typeof useOrderFormMutations>;

type UseOrderFormSubmitParams = {
  isNew: boolean;
  form: FormState;
  mutations: Mutations;
  employeeDirectory: EmployeeDirectoryItem[];
  purchaseOrderTypeCodes: { code: string; name?: string }[];
  order: PurchaseOrderDetail | undefined;
};

export function useOrderFormSubmit({
  isNew,
  form,
  mutations,
  employeeDirectory,
  purchaseOrderTypeCodes,
  order,
}: UseOrderFormSubmitParams) {
  const saveLine = (index: number) => {
    if (!isNew && !form.canEditExistingOrder) {
      notify.error("수정 권한이 없습니다.");
      return;
    }
    const row = form.items[index];
    if (!row) return;
    if (!row.productId.trim()) {
      notify.error("대표 제품을 선택하세요.");
      return;
    }
    if (!row.detectorId.trim()) {
      notify.error("검출기를 선택하세요.");
      return;
    }
    const detectorPayload = resolveOrderLineDetectorPayload(
      row,
      form.productById.get(row.productId.trim())
    );
    if (!detectorPayload) {
      notify.error(
        "검출기·소자 정보를 확인할 수 없습니다. 제품 사업명을 확인하세요."
      );
      return;
    }
    if (!row.unitCode.trim()) {
      notify.error("단위를 선택하세요.");
      return;
    }
    if (row.qty <= 0) {
      notify.error("수량은 0보다 커야 합니다.");
      return;
    }
    const unitPrice = parseLineUnitPrice(row.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      notify.error("단가를 확인하세요.");
      return;
    }

    if (!row.lineId) {
      if (isNew) return;
      const createPayload = buildOrderLineRequestPayload({
        row,
        product: form.productById.get(row.productId.trim()),
        unitPrice,
      });
      mutations.lineCreateMutation.mutate(
        { index, payload: createPayload },
        {
          onSuccess: (created) => form.markLineSaved(created?.id),
        }
      );
      return;
    }

    const patchPayload = buildOrderLineRequestPayload({
      row,
      product: form.productById.get(row.productId.trim()),
      unitPrice,
    });

    mutations.lineUpdateMutation.mutate(
      {
        lineId: row.lineId,
        payload: patchPayload,
      },
      {
        onSuccess: () => {
          form.markLineSaved(row.lineId);
          form.finishLineEdit(row.lineId);
        },
      }
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isNew && !form.canEditExistingOrder) {
      notify.error("작성자만 수정할 수 있으며, 종결된 발주는 수정할 수 없습니다.");
      return;
    }
    if (form.hasUnsavedWorkingLine) {
      notify.error("작업중인 행이 있습니다. 행 저장 후 다시 시도하세요.");
      return;
    }
    if (
      !validateRequiredFields(
        [
          { value: form.title, message: "제목을 입력하세요." },
          { value: form.partnerId, message: "업체를 선택하세요." },
          { value: form.dueDate, message: "고객요청납기일을 입력하세요." },
          {
            value: form.requesterUserSelectValue,
            message: "영업담당자를 선택하세요.",
          },
        ],
        notify.error
      )
    ) {
      return;
    }

    if (!isYmdRangeValid(form.orderDate, form.dueDate)) {
      notify.error(
        "고객요청납기일은 발주일자보다 빠를 수 없고, 발주일자는 고객요청납기일보다 클 수 없습니다."
      );
      return;
    }

    if (isNew) {
      if (form.items.some((row) => isPartialProductRow(row))) {
        notify.error("제품 라인을 확인하세요. (대표 제품·검출기·단위·수량·단가)");
        return;
      }
      const validItems = form.items.filter(
        (row) =>
          row.productId.trim() !== "" &&
          row.detectorId.trim() !== "" &&
          row.unitCode.trim() !== "" &&
          row.qty > 0 &&
          parseLineUnitPrice(row.unitPrice) >= 0
      );
      if (validItems.length === 0) {
        notify.error(
          "대표 제품·검출기·단위·수량·단가를 모두 입력한 라인을 1건 이상 등록하세요."
        );
        return;
      }
      if (
        purchaseOrderTypeCodes.length > 0 &&
        !form.effectiveOrderTypeCode.trim()
      ) {
        notify.error("발주 유형을 선택하세요.");
        return;
      }
      const headerCurrency =
        validItems.find((r) => r.currencyCode.trim())?.currencyCode ||
        form.orderCurrencyCode ||
        order?.currencyCode ||
        "KRW";
      const supplyAmount = computeHeaderSupplyAmount(validItems, headerCurrency);
      let payload;
      try {
        payload = buildCreatePayload({
          title: form.title,
          partnerId: form.partnerId,
          orderDate: form.orderDate,
          dueDate: form.dueDate,
          requestDeliveryDate: form.requestDeliveryDate,
          requesterDepartment: form.requesterDepartmentForPayload,
          requesterName: parseRequesterNameFromSelect(
            form.requesterUserSelectValue,
            employeeDirectory
          ),
          requesterEmployeeNo: parseRequesterEmployeeNoFromSelect(
            form.requesterUserSelectValue
          ),
          vendorOrderNo: form.vendorOrderNo,
          vendorRequest: form.vendorRequest,
          specialNote: form.specialNote,
          effectiveOrderTypeCode: form.effectiveOrderTypeCode,
          effectiveOrderStatusCode: form.effectiveOrderStatusCode,
          headerCurrency,
          supplyAmount,
          exchangeRate: parseOptionalExchangeRate(form.exchangeRateInput),
          validItems,
          productById: form.productById,
        });
      } catch (err) {
        notify.error(err instanceof Error ? err.message : "발주 라인을 확인하세요.");
        return;
      }
      mutations.createMutation.mutate(payload);
      return;
    }

    if (form.items.some((row) => isPartialProductRow(row))) {
      notify.error("제품 라인을 확인하세요. (대표 제품·검출기·단위·수량·단가)");
      return;
    }

    const validItems = form.items.filter(
      (row) =>
        row.productId.trim() !== "" &&
        row.detectorId.trim() !== "" &&
        row.unitCode.trim() !== "" &&
        row.qty > 0 &&
        parseLineUnitPrice(row.unitPrice) >= 0
    );

    const headerCurrency = normalizeCurrencyCode(
      form.orderCurrencyCode || order?.currencyCode
    );
    const supplyAmount = computeHeaderSupplyAmount(validItems, headerCurrency);

    if (
      purchaseOrderTypeCodes.length > 0 &&
      !form.effectiveOrderTypeCode.trim()
    ) {
      notify.error("발주 유형을 선택하세요.");
      return;
    }

    let payload;
    try {
      payload = buildUpdatePayload({
        title: form.title,
        partnerId: form.partnerId,
        orderDate: form.orderDate,
        dueDate: form.dueDate,
        requestDeliveryDate: form.requestDeliveryDate,
        requesterDepartment: form.requesterDepartmentForPayload,
        requesterName: parseRequesterNameFromSelect(
          form.requesterUserSelectValue,
          employeeDirectory
        ),
        requesterEmployeeNo: parseRequesterEmployeeNoFromSelect(
          form.requesterUserSelectValue
        ),
        vendorOrderNo: form.vendorOrderNo,
        vendorRequest: form.vendorRequest,
        specialNote: form.specialNote,
        effectiveOrderTypeCode: form.effectiveOrderTypeCode,
        headerCurrency,
        supplyAmount,
        exchangeRate: parseOptionalExchangeRate(form.exchangeRateInput),
        validItems,
        productById: form.productById as Map<string, RepresentativeProduct>,
      });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "발주 라인을 확인하세요.");
      return;
    }
    mutations.updateMutation.mutate(payload);
  };

  return { saveLine, handleSubmit };
}
