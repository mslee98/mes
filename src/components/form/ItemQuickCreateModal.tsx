import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Modal } from "../ui/modal";
import Label from "./Label";
import Input from "./input/InputField";
import { useAuth } from "../../context/AuthContext";
import {
  getItemCategories,
  getItemTypes,
  createItem,
  type Item,
  type ItemCategory,
  type ItemCreatePayload,
} from "../../api/items";

function flattenCategories(
  nodes: ItemCategory[],
  level = 0
): { category: ItemCategory; level: number }[] {
  const result: { category: ItemCategory; level: number }[] = [];
  for (const c of nodes) {
    result.push({ category: c, level });
    if (c.children?.length) {
      result.push(...flattenCategories(c.children, level + 1));
    }
  }
  return result;
}

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export interface ItemQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: Item) => void;
}

export default function ItemQuickCreateModal({
  isOpen,
  onClose,
  onCreated,
}: ItemQuickCreateModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [itemTypeId, setItemTypeId] = useState("");

  const { data: categoryTree = [] } = useQuery({
    queryKey: ["itemCategories", "tree"],
    queryFn: () => getItemCategories(accessToken as string, { tree: true }),
    enabled: !!accessToken && isOpen,
  });

  const { data: itemTypes = [] } = useQuery({
    queryKey: ["itemTypes"],
    queryFn: () => getItemTypes(accessToken as string),
    enabled: !!accessToken && isOpen,
  });

  const categoryOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "분류 선택" },
    ];
    flattenCategories(categoryTree).forEach(({ category: c, level }) => {
      opts.push({
        value: String(c.id),
        label: "\u3000".repeat(level) + (c.name || c.code),
      });
    });
    return opts;
  }, [categoryTree]);

  const typeOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "", label: "유형 선택" },
    ];
    itemTypes.forEach((t) => {
      opts.push({ value: String(t.id), label: t.name || t.code || "-" });
    });
    return opts;
  }, [itemTypes]);

  const mutation = useMutation({
    mutationFn: (payload: ItemCreatePayload) =>
      createItem(payload, accessToken!),
    onSuccess: (item) => {
      toast.success("제품이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["items"] });
      onCreated(item);
      setCode("");
      setName("");
      setCategoryId("");
      setItemTypeId("");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categoryId ? Number(categoryId) : 0;
    const typ = itemTypeId ? Number(itemTypeId) : 0;
    if (!code.trim() || !name.trim()) {
      toast.error("제품 코드와 제품명을 입력하세요.");
      return;
    }
    if (!cat || !typ) {
      toast.error("분류와 유형을 선택하세요.");
      return;
    }
    const payload: ItemCreatePayload = {
      code: code.trim(),
      name: name.trim(),
      categoryId: cat,
      itemTypeId: typ,
      isActive: true,
    };
    mutation.mutate(payload);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        제품 빠른 등록
      </h3>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        등록 후 제품 목록이 갱신되며, 해당 행에 자동 선택됩니다.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="item-quick-code">제품 코드 *</Label>
            <Input
              id="item-quick-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="제품 코드"
              className="mt-1"
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="item-quick-name">제품명 *</Label>
            <Input
              id="item-quick-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="제품명"
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="item-quick-category">제품 분류 *</Label>
          <select
            id="item-quick-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={inputClass}
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value || "empty-cat"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="item-quick-type">제품 유형 *</Label>
          <select
            id="item-quick-type"
            value={itemTypeId}
            onChange={(e) => setItemTypeId(e.target.value)}
            className={inputClass}
          >
            {typeOptions.map((opt) => (
              <option key={opt.value || "empty-type"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
