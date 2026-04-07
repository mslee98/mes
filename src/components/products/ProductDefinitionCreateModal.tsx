import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Select from "../form/Select";
import DatePicker from "../form/date-picker";
import { createProductDefinition } from "../../api/products";
import { getHousingTemplates } from "../../api/housingTemplates";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  commonCodesToSelectOptions,
} from "../../api/commonCode";
import { isForbiddenError } from "../../lib/apiError";
import SearchableSelectWithCreate from "../form/SearchableSelectWithCreate";

const ORDER_TYPE_NONE = "__none__";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "OBSOLETE", label: "OBSOLETE" },
];

type ProductDefinitionCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
  accessToken: string;
  /** 저장 후 이동·후처리 */
  onCreated: (definitionId: number) => void;
};

export default function ProductDefinitionCreateModal({
  isOpen,
  onClose,
  productId,
  accessToken,
  onCreated,
}: ProductDefinitionCreateModalProps) {
  const queryClient = useQueryClient();
  const [definitionCode, setDefinitionCode] = useState("");
  const [definitionName, setDefinitionName] = useState("");
  const [versionNo, setVersionNo] = useState("");
  const [orderType, setOrderType] = useState(ORDER_TYPE_NONE);
  const [projectCode, setProjectCode] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [isDefault, setIsDefault] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");
  const [remark, setRemark] = useState("");
  const [housingTemplateIdStr, setHousingTemplateIdStr] = useState("");

  const { data: orderTypeCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
        accessToken
      ),
    enabled: isOpen && !!accessToken,
  });

  const { data: housingTemplates = [], isLoading: housingLoading } = useQuery({
    queryKey: ["housingTemplates"],
    queryFn: () => getHousingTemplates(accessToken),
    enabled: isOpen && !!accessToken,
    staleTime: 60_000,
  });

  const housingSelectOptions = useMemo(
    () =>
      housingTemplates.map((t) => ({
        value: String(t.id),
        label: `${t.templateName} (${t.templateCode})`,
      })),
    [housingTemplates]
  );

  const orderTypeSelectOptions = useMemo(() => {
    const fromApi = commonCodesToSelectOptions(orderTypeCodes);
    return [
      { value: ORDER_TYPE_NONE, label: "미지정" },
      ...fromApi,
    ];
  }, [orderTypeCodes]);

  useEffect(() => {
    if (!isOpen) return;
    setDefinitionCode("");
    setDefinitionName("");
    setVersionNo("");
    setOrderType(ORDER_TYPE_NONE);
    setProjectCode("");
    setStatus("DRAFT");
    setIsDefault(false);
    setEffectiveFrom("");
    setEffectiveTo("");
    setRemark("");
    setHousingTemplateIdStr("");
  }, [isOpen]);

  const createMutation = useMutation({
    mutationFn: () => {
      const htId = housingTemplateIdStr.trim()
        ? Number(housingTemplateIdStr)
        : NaN;
      return createProductDefinition(productId, accessToken, {
        definitionCode: definitionCode.trim(),
        definitionName: definitionName.trim(),
        versionNo: versionNo.trim() || null,
        orderType:
          orderType === ORDER_TYPE_NONE ? null : orderType.trim() || null,
        projectCode: projectCode.trim() || null,
        status,
        isDefault,
        effectiveFrom: effectiveFrom.trim() || null,
        effectiveTo: effectiveTo.trim() || null,
        remark: remark.trim() || null,
        housingTemplateId:
          Number.isFinite(htId) && htId > 0 ? htId : undefined,
      });
    },
    onSuccess: (data) => {
      toast.success("제품 정의를 등록했습니다.");
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      queryClient.invalidateQueries({ queryKey: ["housingTemplates"] });
      onCreated(data.id);
      onClose();
    },
    onError: (e: unknown) => {
      if (isForbiddenError(e)) toast.error("등록 권한이 없습니다.");
      else toast.error(e instanceof Error ? e.message : "등록에 실패했습니다.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!definitionCode.trim() || !definitionName.trim()) {
      toast.error("정의 코드와 정의명은 필수입니다.");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[90vh] max-w-lg overflow-y-auto p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        제품 정의 등록
      </h2>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        정의 코드는 전역 유일합니다. 저장 후 상세에서 구성 품목을 추가하세요.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="pdef-create-code">정의 코드 *</Label>
          <Input
            id="pdef-create-code"
            value={definitionCode}
            onChange={(e) => setDefinitionCode(e.target.value)}
            placeholder="예: MARKOS-GOV-V1"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pdef-create-name">정의명 *</Label>
          <Input
            id="pdef-create-name"
            value={definitionName}
            onChange={(e) => setDefinitionName(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="pdef-create-version">버전 번호</Label>
          <Input
            id="pdef-create-version"
            value={versionNo}
            onChange={(e) => setVersionNo(e.target.value)}
            className="mt-1.5"
            placeholder="선택"
          />
        </div>
        <div>
          <Label htmlFor="pdef-create-ordertype">발주 유형</Label>
          <Select
            id="pdef-create-ordertype"
            className="mt-1.5"
            placeholder="발주 유형"
            value={orderType}
            onChange={setOrderType}
            options={orderTypeSelectOptions}
            size="md"
          />
        </div>
        <div>
          <Label htmlFor="pdef-create-project">프로젝트 코드</Label>
          <Input
            id="pdef-create-project"
            value={projectCode}
            onChange={(e) => setProjectCode(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <SearchableSelectWithCreate
          id="pdef-create-housing"
          label="하우징 템플릿"
          value={housingTemplateIdStr}
          onChange={setHousingTemplateIdStr}
          options={housingSelectOptions}
          placeholder={
            housingLoading
              ? "하우징 템플릿 불러오는 중…"
              : "검색하여 선택 (선택)"
          }
          addTrigger="none"
          addButtonLabel="추가"
          onAddClick={() => {}}
          isDisabled={housingLoading}
        />
        <div>
          <Label htmlFor="pdef-create-status">상태</Label>
          <Select
            id="pdef-create-status"
            className="mt-1.5"
            placeholder="상태"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            size="md"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            id="pdef-create-effectiveFrom"
            label="유효 시작"
            placeholder="년-월-일"
            value={effectiveFrom}
            onValueChange={setEffectiveFrom}
          />
          <DatePicker
            id="pdef-create-effectiveTo"
            label="유효 종료"
            placeholder="년-월-일"
            value={effectiveTo}
            onValueChange={setEffectiveTo}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-gray-300 text-brand-600 dark:border-gray-600"
          />
          이 제품의 기본 정의로 지정
        </label>
        <div>
          <Label>비고</Label>
          <TextArea
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
            disabled={createMutation.isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            저장
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
