import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import ConfirmModal from "../components/common/ConfirmModal";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../hooks/useModal";
import { PencilIcon, TrashBinIcon } from "../icons";
import {
  getItemCategories,
  createItemCategory,
  updateItemCategory,
  deleteItemCategory,
  type ItemCategory,
  type ItemCategoryCreatePayload,
} from "../api/items";

function flattenTree(
  nodes: ItemCategory[],
  level = 0
): { category: ItemCategory; level: number }[] {
  const result: { category: ItemCategory; level: number }[] = [];
  for (const c of nodes) {
    result.push({ category: c, level });
    if (c.children?.length) {
      result.push(...flattenTree(c.children, level + 1));
    }
  }
  return result;
}

function CategoryTreeRow({
  node,
  level,
  onEdit,
  onDelete,
  parentOptions,
  editingId,
}: {
  node: ItemCategory;
  level: number;
  onEdit: (c: ItemCategory) => void;
  onDelete: (c: ItemCategory) => void;
  parentOptions: { value: string; label: string }[];
  editingId: number | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div className="ml-0">
      <div
        className="flex items-center gap-2 border-b border-gray-100 py-2 dark:border-white/[0.05]"
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-500"
        >
          {hasChildren ? (expanded ? "▼" : "▶") : "·"}
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-white/90">
          {node.name}
        </span>
        <code className="text-xs text-gray-500 dark:text-gray-400">
          {node.code}
        </code>
        <Badge size="sm" color={node.isActive === false ? "error" : "success"}>
          {node.isActive === false ? "비활성" : "활성"}
        </Badge>
        <span className="text-xs text-gray-400">{node.sortOrder ?? "-"}</span>
        <button
          type="button"
          onClick={() => onEdit(node)}
          aria-label="수정"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(node)}
          aria-label="삭제"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <TrashBinIcon className="h-4 w-4" />
        </button>
      </div>
      {expanded && hasChildren && node.children && (
        <div className="ml-0">
          {node.children.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              parentOptions={parentOptions}
              editingId={editingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const initialForm = (): ItemCategoryCreatePayload & { id?: number } => ({
  code: "",
  name: "",
  parentId: null,
  sortOrder: 0,
  isActive: true,
});

export default function ItemCategories() {
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [form, setForm] = useState<ItemCategoryCreatePayload & { id?: number }>(
    initialForm()
  );
  const formModal = useModal(false);
  const deleteModal = useModal(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ItemCategory | null>(
    null
  );
  const [keyword, setKeyword] = useState("");

  const { data: treeData = [], isLoading, error } = useQuery({
    queryKey: ["itemCategories", "tree"],
    queryFn: () => getItemCategories(accessToken as string, { tree: true }),
    enabled: !!accessToken && !isAuthLoading,
  });

  const flatForParent = useMemo(() => flattenTree(treeData), [treeData]);

  const parentOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: "", label: "(상위 없음)" },
    ];
    flatForParent.forEach(({ category: c, level }) => {
      if (form.id != null && (c.id === form.id || isDescendant(treeData, c.id, form.id))) return;
      options.push({
        value: String(c.id),
        label: "　".repeat(level) + (c.name || c.code),
      });
    });
    return options;
  }, [flatForParent, form.id, treeData]);

  const filteredTree = useMemo(() => {
    if (!keyword.trim()) return treeData;
    const k = keyword.trim().toLowerCase();
    return filterTreeByKeyword(treeData, k);
  }, [treeData, keyword]);

  const createMutation = useMutation({
    mutationFn: (payload: ItemCategoryCreatePayload) =>
      createItemCategory(payload, accessToken!),
    onSuccess: () => {
      toast.success("품목 분류가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemCategories"] });
      formModal.closeModal();
      setForm(initialForm());
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: ItemCategoryCreatePayload;
    }) => updateItemCategory(id, payload, accessToken!),
    onSuccess: () => {
      toast.success("품목 분류가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemCategories"] });
      formModal.closeModal();
      setForm(initialForm());
    },
    onError: (e: Error) => toast.error(e.message || "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItemCategory(id, accessToken!),
    onSuccess: () => {
      toast.success("품목 분류가 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemCategories"] });
      deleteModal.closeModal();
      setCategoryToDelete(null);
    },
    onError: (e: Error) => {
      toast.error(
        e.message || "하위 분류가 있으면 삭제할 수 없습니다."
      );
      deleteModal.closeModal();
      setCategoryToDelete(null);
    },
  });

  const openAddModal = () => {
    setForm(initialForm());
    formModal.openModal();
  };

  const openEditModal = (c: ItemCategory) => {
    setForm({
      id: c.id,
      code: c.code ?? "",
      name: c.name ?? "",
      parentId: c.parentId ?? null,
      sortOrder: c.sortOrder ?? 0,
      isActive: c.isActive !== false,
    });
    formModal.openModal();
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ItemCategoryCreatePayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      parentId: form.parentId ? Number(form.parentId) : null,
      sortOrder: form.sortOrder ?? 0,
      isActive: form.isActive,
    };
    if (!payload.code || !payload.name) {
      toast.error("코드와 이름을 입력하세요.");
      return;
    }
    if (form.id != null) {
      updateMutation.mutate({
        id: form.id,
        payload: { ...payload, parentId: payload.parentId ?? undefined },
      });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openDeleteConfirm = (c: ItemCategory) => {
    setCategoryToDelete(c);
    deleteModal.openModal();
  };

  const confirmDelete = () => {
    if (categoryToDelete) deleteMutation.mutate(categoryToDelete.id);
  };

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <PageMeta title="품목 분류" description="품목 분류 관리" />
      <PageBreadcrumb pageTitle="품목 분류" />
      <div className="space-y-6">
        <ComponentCard
          title="품목 분류 (트리)"
          desc="품목 분류를 트리로 조회하고, 추가/수정/삭제할 수 있습니다. 하위 분류가 있으면 삭제할 수 없습니다."
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              type="text"
              placeholder="분류명, 코드 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="max-w-xs"
            />
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-700"
            >
              분류 추가
            </button>
          </div>

          {isAuthLoading || isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center py-8">
              <LoadingLottie message="품목 분류를 불러오는 중..." />
            </div>
          ) : !accessToken ? (
            <div className="flex min-h-[240px] items-center justify-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">로그인 후 조회할 수 있습니다.</p>
            </div>
          ) : error ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {error instanceof Error
                  ? error.message
                  : "품목 분류를 불러오지 못했습니다."}
              </p>
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">
                {keyword.trim() ? "조건에 맞는 분류가 없습니다." : "등록된 품목 분류가 없습니다."}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
                <span>분류명</span>
                <span>코드</span>
                <span>상태</span>
                <span>정렬</span>
                <span className="col-span-2" />
              </div>
              {filteredTree.map((node) => (
                <CategoryTreeRow
                  key={node.id}
                  node={node}
                  level={0}
                  onEdit={openEditModal}
                  onDelete={openDeleteConfirm}
                  parentOptions={parentOptions}
                  editingId={form.id ?? null}
                />
              ))}
            </div>
          )}
        </ComponentCard>
      </div>

      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.closeModal}
        className="mx-4 max-w-lg p-6 dark:bg-gray-900 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {form.id != null ? "품목 분류 수정" : "품목 분류 추가"}
        </h2>
        <form onSubmit={handleSubmitForm} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="cat-parent">상위 분류</Label>
            <select
              id="cat-parent"
              value={form.parentId ?? ""}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  parentId: e.target.value ? Number(e.target.value) : null,
                }))
              }
              className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {parentOptions.map((opt) => (
                <option key={opt.value || "none"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cat-code">코드 *</Label>
            <Input
              id="cat-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="분류 코드"
              className="mt-1"
              disabled={form.id != null}
            />
          </div>
          <div>
            <Label htmlFor="cat-name">이름 *</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="분류 이름"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cat-sort">정렬순서</Label>
            <input
              id="cat-sort"
              type="number"
              min={0}
              value={form.sortOrder ?? 0}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  sortOrder: parseInt(e.target.value, 10) || 0,
                }))
              }
              className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="cat-active"
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) =>
                setForm((p) => ({ ...p, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <Label htmlFor="cat-active">활성</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={formModal.closeModal}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isFormPending}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-700"
            >
              {isFormPending ? "처리 중..." : form.id != null ? "수정" : "등록"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="품목 분류 삭제"
        message={
          categoryToDelete
            ? `"${categoryToDelete.name}" 분류를 삭제하시겠습니까? 하위 분류가 있으면 삭제할 수 없습니다.`
            : "삭제하시겠습니까?"
        }
        confirmText="삭제"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onClose={() => {
          deleteModal.closeModal();
          setCategoryToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function isDescendant(
  nodes: ItemCategory[],
  nodeId: number,
  ancestorId: number
): boolean {
  for (const n of nodes) {
    if (n.id === ancestorId) return false;
    if (n.id === nodeId) return true;
    if (n.children?.length) {
      const inChild = isDescendant(n.children, nodeId, ancestorId);
      if (inChild) return true;
    }
  }
  return false;
}

function filterTreeByKeyword(
  nodes: ItemCategory[],
  keyword: string
): ItemCategory[] {
  const result: ItemCategory[] = [];
  for (const n of nodes) {
    const name = (n.name ?? "").toLowerCase();
    const code = (n.code ?? "").toLowerCase();
    const match = name.includes(keyword) || code.includes(keyword);
    const filteredChildren = n.children?.length
      ? filterTreeByKeyword(n.children, keyword)
      : [];
    if (match || filteredChildren.length > 0) {
      result.push({
        ...n,
        children: filteredChildren.length > 0 ? filteredChildren : n.children,
      });
    }
  }
  return result;
}
