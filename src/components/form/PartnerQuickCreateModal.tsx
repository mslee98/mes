import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Modal } from "../ui/modal";
import Label from "./Label";
import Input from "./input/InputField";
import { useAuth } from "../../context/AuthContext";
import {
  createPartner,
  type Partner,
  type PartnerCreatePayload,
} from "../../api/purchaseOrder";

export interface PartnerQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 등록 성공 시 (목록 invalidate 후 선택 반영) */
  onCreated: (partner: Partner) => void;
}

export default function PartnerQuickCreateModal({
  isOpen,
  onClose,
  onCreated,
}: PartnerQuickCreateModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const mutation = useMutation({
    mutationFn: (payload: PartnerCreatePayload) =>
      createPartner(payload, accessToken!),
    onSuccess: (partner) => {
      toast.success("업체가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      onCreated(partner);
      setCode("");
      setName("");
      setContact("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error("업체 코드와 이름을 입력하세요.");
      return;
    }
    mutation.mutate({
      code: code.trim(),
      name: name.trim(),
      contact: contact.trim() || null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        업체 빠른 등록
      </h3>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        등록 후 목록에 반영되며, 현재 선택으로 지정됩니다.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="partner-quick-code">업체 코드 *</Label>
          <Input
            id="partner-quick-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="예: CUST-001"
            className="mt-1"
            autoComplete="off"
          />
        </div>
        <div>
          <Label htmlFor="partner-quick-name">업체명 *</Label>
          <Input
            id="partner-quick-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="회사명"
            className="mt-1"
            autoComplete="organization"
          />
        </div>
        <div>
          <Label htmlFor="partner-quick-contact">담당자 / 연락처</Label>
          <Input
            id="partner-quick-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="선택"
            className="mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
