import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import {
  getDeliveryPlan,
  linkUnitsToDeliveryItem,
  type Delivery,
  type DeliveryPlan,
  type DeliveryPlanItem,
  type DeliveryPlanUnit,
  type DeliveryRecordLine,
} from "../../api/purchaseOrder";
import { purchaseOrderItemIdFromDeliveryItemRow } from "../../lib/deliveryRegisterFromPlanUnit";

type DeliveryLinkLine = {
  deliveryItemId: number;
  purchaseOrderItemId: number;
  label: string;
};

function extractDeliveryLinkLines(delivery: Delivery): DeliveryLinkLine[] {
  /** `delivery_items` PK만 사용 (`lines[].id`는 납품 품목 id가 아닐 수 있음) */
  const raw = (delivery.deliveryItems ?? []) as DeliveryRecordLine[];
  const out: DeliveryLinkLine[] = [];
  for (const row of raw) {
    const lineType = String(row.lineType ?? "").trim().toUpperCase();
    if (lineType === "LENS") continue;
    const deliveryItemIdRaw = row.id;
    const deliveryItemId =
      typeof deliveryItemIdRaw === "number"
        ? deliveryItemIdRaw
        : deliveryItemIdRaw != null
          ? Number(deliveryItemIdRaw)
          : NaN;
    const purchaseOrderItemId = purchaseOrderItemIdFromDeliveryItemRow(row);
    if (!Number.isFinite(deliveryItemId) || deliveryItemId <= 0) continue;
    if (
      purchaseOrderItemId == null ||
      !Number.isFinite(purchaseOrderItemId) ||
      purchaseOrderItemId <= 0
    )
      continue;
    const label =
      row.lineName?.trim() ||
      row.itemName?.trim() ||
      `품목 #${purchaseOrderItemId}`;
    out.push({ deliveryItemId, purchaseOrderItemId, label });
  }
  return out;
}

function eligibleUnitsForPurchaseOrderItem(
  plan: DeliveryPlan | undefined,
  purchaseOrderItemId: number
): DeliveryPlanUnit[] {
  if (!plan?.items?.length) return [];
  const item = plan.items.find(
    (i: DeliveryPlanItem) => i.purchaseOrderItemId === purchaseOrderItemId
  );
  const units = item?.units ?? [];
  return units.filter(
    (u) =>
      u.isDeliveryReady === true &&
      u.isDelivered !== true &&
      typeof u.id === "string" &&
      u.id.trim() !== ""
  );
}

type OrderDetailLinkUnitsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery | null;
  purchaseOrderId: string;
  accessToken: string;
};

export function OrderDetailLinkUnitsModal({
  isOpen,
  onClose,
  delivery,
  purchaseOrderId,
  accessToken,
}: OrderDetailLinkUnitsModalProps) {
  const queryClient = useQueryClient();
  const [planIdInput, setPlanIdInput] = useState("");
  const [loadedPlan, setLoadedPlan] = useState<DeliveryPlan | null>(null);
  /** deliveryItemId → 선택된 unit id 집합 */
  const [selectedByDeliveryItem, setSelectedByDeliveryItem] = useState<
    Record<number, Set<string>>
  >({});

  const linkLines = useMemo(
    () => (delivery ? extractDeliveryLinkLines(delivery) : []),
    [delivery]
  );

  const loadPlanMutation = useMutation({
    mutationFn: async () => {
      const id = planIdInput.trim();
      if (id.length < 8) throw new Error("납품 계획 ID를 입력하세요.");
      return getDeliveryPlan(id, accessToken);
    },
    onSuccess: (plan) => {
      setLoadedPlan(plan);
      const next: Record<number, Set<string>> = {};
      for (const line of linkLines) {
        next[line.deliveryItemId] = new Set();
      }
      setSelectedByDeliveryItem(next);
      toast.success("납품 계획을 불러왔습니다.");
    },
    onError: (e: Error) =>
      toast.error(e.message || "납품 계획을 불러오지 못했습니다."),
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      if (!delivery?.id) throw new Error("납품 정보가 없습니다.");
      const tasks: Promise<unknown>[] = [];
      for (const line of linkLines) {
        const set = selectedByDeliveryItem[line.deliveryItemId];
        const unitIds = set ? Array.from(set) : [];
        if (unitIds.length === 0) continue;
        tasks.push(
          linkUnitsToDeliveryItem(
            line.deliveryItemId,
            { unitIds },
            accessToken
          )
        );
      }
      if (tasks.length === 0) {
        throw new Error("연결할 Unit을 선택하세요.");
      }
      await Promise.all(tasks);
    },
    onSuccess: () => {
      toast.success("선택한 Unit이 납품 라인에 연결되었습니다.");
      setPlanIdInput("");
      setLoadedPlan(null);
      setSelectedByDeliveryItem({});
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrderDeliveries", purchaseOrderId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["purchaseOrder", purchaseOrderId],
      });
      if (loadedPlan?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["deliveryPlan", loadedPlan.id],
        });
      }
      onClose();
    },
    onError: (e: Error) =>
      toast.error(e.message || "Unit 연결에 실패했습니다."),
  });

  const toggleUnit = (deliveryItemId: number, unitId: string) => {
    setSelectedByDeliveryItem((prev) => {
      const copy = { ...prev };
      const cur = new Set(copy[deliveryItemId] ?? []);
      if (cur.has(unitId)) cur.delete(unitId);
      else cur.add(unitId);
      copy[deliveryItemId] = cur;
      return copy;
    });
  };

  const handleClose = () => {
    setPlanIdInput("");
    setLoadedPlan(null);
    setSelectedByDeliveryItem({});
    onClose();
  };

  if (!delivery) return null;

  const linkLinesEmpty = linkLines.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="mx-4 max-h-[90vh] max-w-3xl overflow-y-auto p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            납품 라인에 Unit 연결
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            출고 준비 완료(
            <code className="text-theme-xs">isDeliveryReady</code>)이고 아직
            납품되지 않은 Unit만 선택할 수 있습니다. 납품 계획 ID를 불러온 뒤
            품목별로 연결합니다.
          </p>
        </>
      }
    >
      {linkLinesEmpty ? (
        <p className="mt-4 text-theme-sm text-amber-700 dark:text-amber-400">
          이번 납품에 제품(PRODUCT) 라인이 없어 Unit을 연결할 수 없습니다.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[14rem] flex-1">
          <Label htmlFor="link-plan-id">납품 계획 ID</Label>
          <input
            id="link-plan-id"
            type="text"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-theme-sm dark:border-white/10 dark:bg-gray-900"
            value={planIdInput}
            onChange={(e) => setPlanIdInput(e.target.value)}
            placeholder="UUID"
          />
        </div>
        <button
          type="button"
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 disabled:opacity-45 dark:bg-white/10 dark:text-white"
          disabled={
            linkLinesEmpty ||
            loadPlanMutation.isPending ||
            planIdInput.trim().length < 8
          }
          onClick={() => loadPlanMutation.mutate()}
        >
          {loadPlanMutation.isPending ? "불러오는 중…" : "계획 불러오기"}
        </button>
      </div>

      {linkLinesEmpty ? null : !loadedPlan ? (
        <p className="mt-6 text-theme-sm text-gray-500">
          계획을 불러오면 품목별 Unit 목록이 표시됩니다.
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {linkLines.map((line) => {
            const eligible = eligibleUnitsForPurchaseOrderItem(
              loadedPlan,
              line.purchaseOrderItemId
            );
            const selected =
              selectedByDeliveryItem[line.deliveryItemId] ?? new Set<string>();
            return (
              <div
                key={line.deliveryItemId}
                className="rounded-lg border border-gray-100 p-3 dark:border-white/10"
              >
                <p className="font-medium text-gray-900 dark:text-white">
                  {line.label}
                </p>
                <p className="text-theme-xs text-gray-500">
                  납품 라인 ID: {line.deliveryItemId} · 발주 품목 ID:{" "}
                  {line.purchaseOrderItemId}
                </p>
                {eligible.length === 0 ? (
                  <p className="mt-2 text-theme-sm text-amber-700 dark:text-amber-400">
                    연결 가능한 Unit이 없습니다. (계획 품목·출고 준비 상태를
                    확인하세요.)
                  </p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {eligible.map((u) => (
                      <li key={u.id}>
                        <label className="flex cursor-pointer items-center gap-2 text-theme-sm">
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() =>
                              toggleUnit(line.deliveryItemId, u.id)
                            }
                          />
                          <span className="font-mono text-theme-xs">
                            {u.unitCode ?? u.id}
                          </span>
                          <span className="text-theme-xs text-gray-500">
                            {u.currentProcessCode ?? ""}{" "}
                            {u.processStatus ? `· ${u.processStatus}` : ""}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
          onClick={handleClose}
        >
          닫기
        </button>
        <button
          type="button"
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={
            linkLinesEmpty || !loadedPlan || linkMutation.isPending
          }
          onClick={() => linkMutation.mutate()}
        >
          {linkMutation.isPending ? "연결 중…" : "선택한 Unit 연결"}
        </button>
      </div>
    </Modal>
  );
}
