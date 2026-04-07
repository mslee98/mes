import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import ConfirmLeaveModal from "../components/common/ConfirmLeaveModal";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { useAuth } from "../context/AuthContext";
import { useConfirmLeave } from "../hooks/useConfirmLeave";
import { useItemPermissions } from "../hooks/useItemPermissions";
import {
  getItemMaster,
  createItemMaster,
  updateItemMaster,
  ITEM_TYPE_OPTIONS_FALLBACK,
} from "../api/itemMaster";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_ITEM_TYPE,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import { isForbiddenError } from "../lib/apiError";

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export default function ItemForm() {
  const { itemId: itemIdParam } = useParams<{ itemId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canManageItems } = useItemPermissions();

  const isNew =
    itemIdParam == null ||
    itemIdParam === "" ||
    itemIdParam === "new";
  const id = isNew ? 0 : Number(itemIdParam);
  const editId = Number.isFinite(id) ? id : 0;

  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["itemMaster", editId],
    queryFn: () => getItemMaster(editId, accessToken as string),
    enabled: !isNew && !!accessToken && editId > 0,
  });

  const { data: itemTypeCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_ITEM_TYPE],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_ITEM_TYPE, accessToken as string),
    enabled: !!accessToken && canManageItems,
  });

  const itemTypeSelectOptions = useMemo(() => {
    let base = commonCodesToSelectOptions(itemTypeCodes);
    if (!base.length) {
      base = ITEM_TYPE_OPTIONS_FALLBACK.map((o) => ({
        value: o.value,
        label: o.label,
      }));
    }
    const saved = itemType.trim();
    if (saved && !base.some((o) => o.value === saved)) {
      return [{ value: saved, label: `${saved} (저장된 값)` }, ...base];
    }
    return base;
  }, [itemTypeCodes, itemType]);

  const initialSnapshot = useMemo(() => {
    if (isNew) {
      return {
        itemCode: "",
        itemName: "",
        itemType: "",
        description: "",
        isActive: true,
      };
    }
    if (!detail) return null;
    return {
      itemCode: detail.itemCode,
      itemName: detail.itemName,
      itemType: detail.itemType,
      description: detail.description ?? "",
      isActive: detail.isActive !== false,
    };
  }, [isNew, detail]);

  useEffect(() => {
    if (isNew) {
      setItemCode("");
      setItemName("");
      setItemType("");
      setDescription("");
      setIsActive(true);
      return;
    }
    if (detail) {
      setItemCode(detail.itemCode);
      setItemName(detail.itemName);
      setItemType(detail.itemType);
      setDescription(detail.description ?? "");
      setIsActive(detail.isActive !== false);
    }
  }, [isNew, detail]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      initialSnapshot.itemCode !== itemCode ||
      initialSnapshot.itemName !== itemName ||
      initialSnapshot.itemType !== itemType ||
      initialSnapshot.description !== description ||
      initialSnapshot.isActive !== isActive
    );
  }, [
    initialSnapshot,
    itemCode,
    itemName,
    itemType,
    description,
    isActive,
  ]);

  const leavePath = isNew ? "/items" : `/items/${editId}`;
  const {
    showLeaveModal,
    handleCancelClick,
    handleConfirmLeave,
    closeLeaveModal,
  } = useConfirmLeave(isDirty, () => navigate(leavePath));

  const createMutation = useMutation({
    mutationFn: () =>
      createItemMaster(accessToken as string, {
        itemCode: itemCode.trim(),
        itemName: itemName.trim(),
        itemType,
        description: description.trim() || null,
        isActive,
      }),
    onSuccess: (data) => {
      toast.success("품목을 등록했습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemMasterList"] });
      navigate(`/items/${data.id}`);
    },
    onError: (e: unknown) => {
      if (isForbiddenError(e)) {
        toast.error("품목을 등록할 권한이 없습니다.");
        return;
      }
      toast.error(e instanceof Error ? e.message : "등록에 실패했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateItemMaster(editId, accessToken as string, {
        itemName: itemName.trim(),
        itemType,
        description: description.trim() || null,
        isActive,
      }),
    onSuccess: () => {
      toast.success("품목을 수정했습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemMasterList"] });
      queryClient.invalidateQueries({ queryKey: ["itemMaster", editId] });
      navigate(`/items/${editId}`);
    },
    onError: (e: unknown) => {
      if (isForbiddenError(e)) {
        toast.error("품목을 수정할 권한이 없습니다.");
        return;
      }
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() && isNew) {
      toast.error("품목코드를 입력하세요.");
      return;
    }
    if (!itemName.trim()) {
      toast.error("품목명을 입력하세요.");
      return;
    }
    if (!itemType.trim()) {
      toast.error("품목 유형을 선택하세요.");
      return;
    }
    if (isNew) {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isAuthLoading) {
    return (
      <>
        <PageMeta title="품목" description="품목" />
        <PageBreadcrumb pageTitle="품목" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="인증 확인 중..." />
        </div>
      </>
    );
  }

  if (!accessToken) {
    return (
      <>
        <PageMeta title="품목" description="품목" />
        <PageBreadcrumb pageTitle="품목" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500">
          <p className="text-sm">로그인 후 이용할 수 있습니다.</p>
        </div>
      </>
    );
  }

  if (!canManageItems) {
    return (
      <>
        <PageMeta title="품목" description="품목" />
        <PageBreadcrumb pageTitle="품목" />
        <div className="space-y-4">
          <PageNotice variant="neutral">
            품목 등록·수정은 <code>item.manage</code> 권한이 필요합니다.
          </PageNotice>
          <button
            type="button"
            onClick={() => navigate("/items")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
          >
            목록으로
          </button>
        </div>
      </>
    );
  }

  if (!isNew && detailLoading && !detail) {
    return (
      <>
        <PageMeta title="품목 수정" description="품목 수정" />
        <PageBreadcrumb pageTitle="품목 수정" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="품목을 불러오는 중..." />
        </div>
      </>
    );
  }

  if (!isNew && !detailLoading && !detail) {
    return (
      <>
        <PageMeta title="품목 수정" description="품목 수정" />
        <PageBreadcrumb pageTitle="품목 수정" />
        <p className="text-sm text-red-600">품목을 찾을 수 없습니다.</p>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={isNew ? "품목 등록" : "품목 수정"}
        description="품목 마스터"
      />
      <PageBreadcrumb pageTitle={isNew ? "품목 등록" : "품목 수정"} />

      <PageNotice className="mb-4" variant="neutral">
        품목 유형은 공통코드 <code>ITEM_TYPE</code>에서 선택합니다(코드값이 저장됩니다).
      </PageNotice>

      <div className="space-y-6">
        <ComponentCard
          title={isNew ? "품목 등록" : "품목 수정"}
          desc="기본 정보 · 설명 · 사용 여부"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="item-type-order">품목 유형 *</Label>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  유형을 먼저 선택하면 입력 흐름이 맞습니다.
                </p>
                <select
                  id="item-type-order"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">선택</option>
                  {itemTypeSelectOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="item-code">품목코드 *</Label>
                <Input
                  id="item-code"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="고유 코드"
                  className="mt-1"
                  disabled={!isNew}
                />
              </div>
              <div>
                <Label htmlFor="item-name">품목명 *</Label>
                <Input
                  id="item-name"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="item-desc">설명</Label>
                <textarea
                  id="item-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`${inputClass} min-h-[6rem] resize-y`}
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="item-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <Label htmlFor="item-active">사용 여부</Label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <button
                type="submit"
                disabled={isPending || (!isNew && !isDirty)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600"
              >
                {isPending ? "저장 중…" : "저장"}
              </button>
              <button
                type="button"
                onClick={handleCancelClick}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                취소
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>

      <ConfirmLeaveModal
        isOpen={showLeaveModal}
        onClose={closeLeaveModal}
        onConfirm={handleConfirmLeave}
      />
    </>
  );
}
