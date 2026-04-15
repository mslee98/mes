import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import { useAuth } from "../hooks/useAuth";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  COMMON_CODE_GROUP_PRODUCT_CATEGORY,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import { getProduct, updateProduct } from "../api/products";

const EDIT_CATEGORY_NONE = "__none__";

export default function ProductForm() {
  const { productId } = useParams();
  const id = Number(productId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [categoryCode, setCategoryCode] = useState(EDIT_CATEGORY_NONE);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: categoryCodeItems = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PRODUCT_CATEGORY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const categorySelectOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(categoryCodeItems);
    const opts: { value: string; label: string }[] = [
      { value: EDIT_CATEGORY_NONE, label: "선택 안 함" },
      ...base,
    ];
    const saved = categoryCode.trim();
    if (
      saved &&
      saved !== EDIT_CATEGORY_NONE &&
      !opts.some((o) => o.value === saved)
    ) {
      opts.splice(1, 0, {
        value: saved,
        label: `${saved} (저장된 값)`,
      });
    }
    return opts;
  }, [categoryCodeItems, categoryCode]);

  const {
    data: existing,
    isLoading: isLoadLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(id),
  });

  useEffect(() => {
    if (!existing) return;
    setProductCode(existing.productCode ?? "");
    setProductName(existing.productName ?? "");
    setCategoryCode(
      existing.categoryCode?.trim()
        ? (existing.categoryCode as string)
        : EDIT_CATEGORY_NONE
    );
    setDescription(existing.description ?? "");
    setIsActive(existing.isActive !== false);
  }, [existing]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(id, accessToken as string, {
        productName: productName.trim(),
        categoryCode:
          !categoryCode || categoryCode === EDIT_CATEGORY_NONE
            ? null
            : categoryCode.trim() || null,
        description: description.trim() || null,
        isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      toast.success("제품을 수정했습니다.");
      navigate(`/products/${id}`);
    },
    onError: (e: Error) =>
      toast.error(e.message || "수정에 실패했습니다."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error("제품명을 입력하세요.");
      return;
    }
    updateMutation.mutate();
  };

  if (!Number.isFinite(id)) {
    return (
      <>
        <PageMeta title="제품 수정" description="제품 마스터" />
        <PageBreadcrumb pageTitle="제품 수정" />
        <p className="text-sm text-gray-500">잘못된 제품 ID입니다.</p>
      </>
    );
  }

  if (isAuthLoading || isLoadLoading) {
    return (
      <>
        <PageMeta title="제품 수정" description="제품 마스터" />
        <PageBreadcrumb pageTitle="제품 수정" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="불러오는 중..." />
        </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
        <PageMeta title="제품 수정" description="제품 마스터" />
        <PageBreadcrumb pageTitle="제품 수정" />
        <p className="text-sm text-red-600">
          {loadError instanceof Error
            ? loadError.message
            : "제품을 불러오지 못했습니다."}
        </p>
      </>
    );
  }

  const pending = updateMutation.isPending;

  return (
    <>
      <PageMeta title="제품 수정" description="대표 제품 마스터" />
      <PageBreadcrumb pageTitle="제품 수정" />

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6">
        <ComponentCard
          title="제품 수정"
          desc="제품 코드는 수정할 수 없습니다. 분류는 공통코드 PRODUCT_CATEGORY에서 선택합니다."
        >
          <div className="space-y-4">
            <div>
              <Label>제품 코드</Label>
              <Input
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                disabled
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>제품명 *</Label>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="표시 이름"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="product-edit-category">분류</Label>
              <Select
                id="product-edit-category"
                className="mt-1.5"
                placeholder="분류"
                value={categoryCode}
                onChange={setCategoryCode}
                options={categorySelectOptions}
                size="md"
              />
            </div>
            <div>
              <Label>설명</Label>
              <TextArea
                value={description}
                onChange={(v) => setDescription(v)}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-gray-300"
              />
              활성
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
            <button
              type="submit"
              disabled={pending || !accessToken}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600"
            >
              저장
            </button>
            <Link
              to={`/products/${id}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              취소
            </Link>
          </div>
        </ComponentCard>
      </form>
    </>
  );
}
