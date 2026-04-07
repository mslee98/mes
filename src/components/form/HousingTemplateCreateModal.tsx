import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Modal } from "../ui/modal";
import Label from "./Label";
import Input from "./input/InputField";
import TextArea from "./input/TextArea";
import Select from "./Select";
import { useAuth } from "../../context/AuthContext";
import { createHousingTemplate } from "../../api/housingTemplates";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_USE_STATUS,
  USE_STATUS_CODE_ACTIVE,
  buildUseStatusSelectOptions,
} from "../../api/commonCode";
import { isForbiddenError } from "../../lib/apiError";

export type HousingTemplateCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** 저장 성공 시 생성된 템플릿 id (상세 이동 등) */
  onCreated: (templateId: number) => void;
};

export default function HousingTemplateCreateModal({
  isOpen,
  onClose,
  onCreated,
}: HousingTemplateCreateModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [templateCode, setTemplateCode] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [status, setStatus] = useState(USE_STATUS_CODE_ACTIVE);
  const [remark, setRemark] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setTemplateCode("");
    setTemplateName("");
    setStatus(USE_STATUS_CODE_ACTIVE);
    setRemark("");
  }, [isOpen]);

  const { data: useStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_USE_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_USE_STATUS,
        accessToken as string
      ),
    enabled: isOpen && !!accessToken,
  });

  const statusOptions = useMemo(
    () => buildUseStatusSelectOptions(useStatusCodes, status),
    [useStatusCodes, status]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createHousingTemplate(accessToken as string, {
        templateCode: templateCode.trim(),
        templateName: templateName.trim(),
        isActive: status.trim().toUpperCase() === USE_STATUS_CODE_ACTIVE,
        remark: remark.trim() || null,
      }),
    onSuccess: (data) => {
      toast.success("하우징 템플릿을 등록했습니다.");
      queryClient.invalidateQueries({ queryKey: ["housingTemplates"] });
      onCreated(data.id);
      onClose();
    },
    onError: (e: unknown) => {
      if (isForbiddenError(e)) toast.error("등록 권한이 없습니다.");
      else toast.error(e instanceof Error ? e.message : "등록에 실패했습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateCode.trim() || !templateName.trim()) {
      toast.error("템플릿 코드와 이름은 필수입니다.");
      return;
    }
    if (!accessToken) return;
    createMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[90vh] max-w-lg overflow-y-auto p-6 sm:p-8"
    >
      <h2 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
        하우징 템플릿 등록
      </h2>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        저장 후 상세 화면에서 구성 라인을 추가할 수 있습니다.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <Label htmlFor="ht-modal-code">템플릿 코드 *</Label>
            <Input
              id="ht-modal-code"
              value={templateCode}
              onChange={(e) => setTemplateCode(e.target.value)}
              placeholder="템플릿 코드"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-1">
            <Label htmlFor="ht-modal-name">템플릿 이름 *</Label>
            <Input
              id="ht-modal-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="템플릿 이름"
              className="mt-1.5"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="ht-modal-status">상태</Label>
          <Select
            id="ht-modal-status"
            className="mt-1.5"
            placeholder="상태"
            value={status}
            onChange={setStatus}
            options={statusOptions}
            size="md"
          />
        </div>
        <div>
          <Label htmlFor="ht-modal-remark">비고</Label>
          <TextArea
            id="ht-modal-remark"
            value={remark}
            onChange={setRemark}
            rows={3}
            placeholder="비고"
            className="mt-1.5"
          />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08]">
          <button
            type="submit"
            disabled={createMutation.isPending || !accessToken}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            {createMutation.isPending ? "등록 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            취소
          </button>
        </div>
      </form>
    </Modal>
  );
}
