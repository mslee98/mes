import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeliveryPlanDetailResponse } from "../../../api/purchaseOrder";
import { patchDeliveryPlan } from "../../../api/purchaseOrder";
import { getUsers } from "../../../api/user";
import DatePicker from "../../form/date-picker";
import Label from "../../form/Label";
import SearchableSelectWithCreate from "../../form/SearchableSelectWithCreate";
import TextArea from "../../form/input/TextArea";
import Input from "../../form/input/InputField";
import { Modal } from "../../ui/modal";
import Button from "../../ui/button/Button";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../lib/notify";
import { invalidateDeliveryPlanListQueries } from "../../../domains/delivery/queries/invalidateDeliveryPlanListQueries";
import { formatDateYmd } from "../../../lib/format/dateFormat";

type DeliveryPlanEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: DeliveryPlanDetailResponse;
  planId: string;
};

export function DeliveryPlanEditModal({
  isOpen,
  onClose,
  plan,
  planId,
}: DeliveryPlanEditModalProps) {
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [plannedDeliveryDate, setPlannedDeliveryDate] = useState("");
  const [deliveryManagerId, setDeliveryManagerId] = useState("");
  const [remark, setRemark] = useState("");

  const resetForm = useCallback(() => {
    setTitle(plan.title?.trim() ?? "");
    setPlannedDeliveryDate(
      formatDateYmd(plan.plannedDeliveryDate, { emptyFallback: "" }) === "—"
        ? ""
        : formatDateYmd(plan.plannedDeliveryDate, { emptyFallback: "" })
    );
    setDeliveryManagerId(
      plan.deliveryManagerId != null ? String(plan.deliveryManagerId) : ""
    );
    setRemark(plan.remark?.trim() ?? "");
  }, [plan]);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const managerRaw = deliveryManagerId.trim();
      const managerNum = managerRaw ? Number(managerRaw) : null;
      return patchDeliveryPlan(
        planId,
        {
          title: title.trim() || null,
          plannedDeliveryDate: plannedDeliveryDate.trim() || null,
          deliveryManagerId:
            managerNum != null && Number.isFinite(managerNum) ? managerNum : null,
          remark: remark.trim() || null,
        },
        accessToken!
      );
    },
    onSuccess: () => {
      notify.success("납품 계획 정보가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["deliveryPlan", planId] });
      void invalidateDeliveryPlanListQueries(queryClient);
      onClose();
    },
    onError: (e: Error) => {
      notify.error(e.message || "납품 계획 수정에 실패했습니다.");
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 max-h-[90vh] max-w-lg overflow-y-auto p-6"
      header={
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          일정/담당자 수정
        </h3>
      }
    >
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="dp-edit-title">제목</Label>
          <Input
            id="dp-edit-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="2차 납품 계획"
          />
        </div>
        <div>
          <Label htmlFor="dp-edit-planned-date">납품 예정일</Label>
          <DatePicker
            id="dp-edit-planned-date"
            placeholder="년-월-일"
            value={plannedDeliveryDate}
            onValueChange={setPlannedDeliveryDate}
          />
        </div>
        <div>
          <SearchableSelectWithCreate
            id="dp-edit-manager"
            label="납품 담당자"
            value={deliveryManagerId}
            onChange={setDeliveryManagerId}
            options={managerOptions}
            placeholder="담당자 검색·선택"
            noOptionsMessage="표시할 담당자가 없습니다."
            addTrigger="none"
            addButtonLabel=""
            onAddClick={() => {}}
          />
        </div>
        <div>
          <Label htmlFor="dp-edit-remark">비고</Label>
          <TextArea
            id="dp-edit-remark"
            value={remark}
            onChange={setRemark}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
