import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { notify } from "../../../lib/notify";
import { uploadErrorMessage } from "../../../lib/api/uploadErrorMessage";
import { mutationErrorNotify } from "../../../lib/api/mutationOnError";
import {
  createPurchaseOrder,
  uploadPurchaseOrderFile,
  deletePurchaseOrderFile,
  updatePurchaseOrder,
  createPurchaseOrderLine,
  updatePurchaseOrderLine,
  deletePurchaseOrderLine,
  type PurchaseOrderCreatePayload,
  type PurchaseOrderUpdatePayload,
  type PurchaseOrderLineRequestPayload,
  type PurchaseOrderLinePatchPayload,
  type PurchaseOrderItem,
} from "../../../api/purchaseOrder";
import { normalizeCurrencyCode } from "../../../lib/format/formatCurrency";
import { formatLineUnitPriceDisplay } from "../../../lib/format/priceInput";
import { detectorFieldsFromOrderLine } from "../../../domains/order/helpers/orderLineItemRow";
import type { ItemRow } from "../types";
import type { Dispatch, SetStateAction } from "react";

type UseOrderFormMutationsParams = {
  orderId: string;
  accessToken: string | null | undefined;
  firstUnitValue: string;
  orderCurrencyCode: string | undefined;
  pendingFilesForCreate: File[];
  setPendingFilesForCreate: Dispatch<SetStateAction<File[]>>;
  setItems: Dispatch<SetStateAction<ItemRow[]>>;
  /** 저장 성공 후 상세 등으로 이동할 때 이탈 가드 우회 */
  allowNextNavigation?: () => void;
};

export function useOrderFormMutations({
  orderId,
  accessToken,
  firstUnitValue,
  orderCurrencyCode,
  pendingFilesForCreate,
  setPendingFilesForCreate,
  setItems,
  allowNextNavigation,
}: UseOrderFormMutationsParams) {
  const id = orderId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: PurchaseOrderCreatePayload) =>
      createPurchaseOrder(payload, accessToken!),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      if (pendingFilesForCreate.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;
        try {
          const uploaded = await uploadPurchaseOrderFile(
            data.id,
            pendingFilesForCreate,
            accessToken!
          );
          uploadedCount = uploaded.length;
          failedCount = Math.max(pendingFilesForCreate.length - uploadedCount, 0);
        } catch (error) {
          failedCount = pendingFilesForCreate.length;
          notify.error(uploadErrorMessage(error));
        }
        if (uploadedCount > 0) {
          notify.success(
            `발주가 등록되었고 첨부파일 ${uploadedCount}건이 업로드되었습니다.`
          );
        } else {
          notify.success("발주가 등록되었습니다.");
        }
        if (failedCount > 0) {
          notify.error(`첨부파일 ${failedCount}건 업로드에 실패했습니다.`);
        }
        setPendingFilesForCreate([]);
      } else {
        notify.success("발주가 등록되었습니다.");
      }
      allowNextNavigation?.();
      navigate(`/order/${data.id}`);
    },
    onError: (error) =>
      mutationErrorNotify(error, { fallbackMessage: "등록에 실패했습니다." }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PurchaseOrderUpdatePayload) =>
      updatePurchaseOrder(id, payload, accessToken!),
    onSuccess: () => {
      notify.success("발주가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      allowNextNavigation?.();
      navigate(`/order/${id}`);
    },
    onError: (error) =>
      mutationErrorNotify(error, { fallbackMessage: "수정에 실패했습니다." }),
  });

  const lineUpdateMutation = useMutation({
    mutationFn: ({
      lineId,
      payload,
    }: {
      lineId: number;
      payload: PurchaseOrderLinePatchPayload;
    }) => updatePurchaseOrderLine(id, lineId, payload, accessToken!),
    onSuccess: () => {
      notify.success("발주 라인이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (error) =>
      mutationErrorNotify(error, {
        fallbackMessage: "발주 라인 수정에 실패했습니다.",
      }),
  });

  const lineCreateMutation = useMutation({
    mutationFn: ({
      payload,
    }: {
      index: number;
      payload: PurchaseOrderLineRequestPayload;
    }) => createPurchaseOrderLine(id, payload, accessToken!),
    onSuccess: (created, { index }) => {
      notify.success("발주 라인이 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
      if (created) {
        setItems((prev) => {
          const next = [...prev];
          const row = next[index];
          if (!row) return prev;
          next[index] = {
            lineId: created.id,
            productId: created.productId ?? row.productId,
            lensId: created.lensId?.trim() ?? "",
            ...detectorFieldsFromOrderLine(created as PurchaseOrderItem),
            unitCode: String(created.unit ?? firstUnitValue ?? "").trim(),
            qty: Number(created.qty ?? 0),
            unitPrice: formatLineUnitPriceDisplay(created.unitPrice),
            currencyCode: normalizeCurrencyCode(
              created.currencyCode ?? orderCurrencyCode
            ),
            requestDeliveryDate: created.requestDeliveryDate ?? "",
            remark: created.remark ?? "",
          };
          return next;
        });
      }
    },
    onError: (error) =>
      mutationErrorNotify(error, {
        fallbackMessage: "발주 라인 추가에 실패했습니다.",
      }),
  });

  const lineDeleteMutation = useMutation({
    mutationFn: (lineId: number) => deletePurchaseOrderLine(id, lineId, accessToken!),
    onSuccess: () => {
      notify.success("발주 라인이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id, "lineItems"] });
    },
    onError: (error) =>
      mutationErrorNotify(error, {
        fallbackMessage: "발주 라인 삭제에 실패했습니다.",
      }),
  });

  const fileUploadMutation = useMutation({
    mutationFn: (files: File[]) => uploadPurchaseOrderFile(id, files, accessToken!),
    onSuccess: () => {
      notify.success("파일이 업로드되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
    },
    onError: (error) => notify.error(uploadErrorMessage(error)),
  });

  const fileDeleteMutation = useMutation({
    mutationFn: (fileLinkId: number) =>
      deletePurchaseOrderFile(id, fileLinkId, accessToken!),
    onSuccess: () => {
      notify.success("첨부파일이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    },
    onError: (error) =>
      mutationErrorNotify(error, { fallbackMessage: "삭제에 실패했습니다." }),
  });

  return {
    createMutation,
    updateMutation,
    lineUpdateMutation,
    lineCreateMutation,
    lineDeleteMutation,
    fileUploadMutation,
    fileDeleteMutation,
  };
}
