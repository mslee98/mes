import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/ui/badge/Badge";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import { Modal } from "../components/ui/modal";
import {
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  TablePagination,
} from "../components/list";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../../../hooks/useAuth";
import { useClientListPagination } from "../hooks/useClientListPagination";
import { useModal } from "../hooks/useModal";
import { PencilIcon, TrashBinIcon } from "../icons";
import {
  getItemTypes,
  createItemType,
  updateItemType,
  deleteItemType,
  type ItemType,
  type ItemTypeCreatePayload,
} from "../api/items";

const SEARCH_FIELD_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "name", label: "이름" },
  { value: "code", label: "코드" },
  { value: "description", label: "설명" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

const initialForm = (): ItemTypeCreatePayload & { id?: number } => ({
  code: "",
  name: "",
  description: "",
  sortOrder: 0,
  isActive: true,
});

export default function ItemTypes() {
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [searchField, setSearchField] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState<ItemTypeCreatePayload & { id?: number }>(initialForm());
  const formModal = useModal(false);
  const deleteModal = useModal(false);
  const [typeToDelete, setTypeToDelete] = useState<ItemType | null>(null);

  const {
    data: types = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["itemTypes"],
    queryFn: () => getItemTypes(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const filteredTypes = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    return types.filter((t) => {
      const isActive = t.isActive !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && isActive) ||
        (statusFilter === "inactive" && !isActive);
      if (!matchesStatus) return false;
      if (!keyword) return true;
      const name = t.name ?? "";
      const code = t.code ?? "";
      const desc = t.description ?? "";
      const targets =
        searchField === "name"
          ? [name]
          : searchField === "code"
            ? [code]
            : searchField === "description"
              ? [desc]
              : [name, code, desc];
      return targets.some((v) => v.toLowerCase().includes(keyword));
    });
  }, [types, searchField, searchKeyword, statusFilter]);

  const pagination = useClientListPagination({
    filteredCount: filteredTypes.length,
    initialPageSize: 10,
    resetPageDeps: [searchKeyword, searchField, statusFilter],
  });

  const paginatedTypes = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    return filteredTypes.slice(start, start + pagination.pageSize);
  }, [filteredTypes, pagination.currentPage, pagination.pageSize]);

  const createMutation = useMutation({
    mutationFn: (payload: ItemTypeCreatePayload) =>
      createItemType(payload, accessToken!),
    onSuccess: () => {
      toast.success("품목 유형이 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemTypes"] });
      formModal.closeModal();
      setForm(initialForm());
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ItemTypeCreatePayload }) =>
      updateItemType(id, payload, accessToken!),
    onSuccess: () => {
      toast.success("품목 유형이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemTypes"] });
      formModal.closeModal();
      setForm(initialForm());
    },
    onError: (e: Error) => toast.error(e.message || "수정에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteItemType(id, accessToken!),
    onSuccess: () => {
      toast.success("품목 유형이 삭제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemTypes"] });
      deleteModal.closeModal();
      setTypeToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message || "삭제에 실패했습니다."),
  });

  const openAddModal = () => {
    setForm(initialForm());
    formModal.openModal();
  };

  const openEditModal = (t: ItemType) => {
    setForm({
      id: t.id,
      code: t.code ?? "",
      name: t.name ?? "",
      description: t.description ?? "",
      sortOrder: t.sortOrder ?? 0,
      isActive: t.isActive !== false,
    });
    formModal.openModal();
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ItemTypeCreatePayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description?.trim() || null,
      sortOrder: form.sortOrder ?? 0,
      isActive: form.isActive,
    };
    if (!payload.code || !payload.name) {
      toast.error("코드와 이름을 입력하세요.");
      return;
    }
    if (form.id != null) {
      updateMutation.mutate({ id: form.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openDeleteConfirm = (t: ItemType) => {
    setTypeToDelete(t);
    deleteModal.openModal();
  };

  const confirmDelete = () => {
    if (typeToDelete) deleteMutation.mutate(typeToDelete.id);
  };

  const isFormPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <PageMeta title="품목 유형" description="품목 유형 관리" />
      <PageBreadcrumb pageTitle="품목 유형" />
      <ListPageLayout
        title="품목 유형"
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="item-types-list-search"
                placeholder="유형 이름, 코드, 설명 검색"
                value={searchKeyword}
                onChange={setSearchKeyword}
              />
            }
            actions={
              <>
                <DataListPrimaryActionButton onClick={openAddModal}>
                  유형 추가
                </DataListPrimaryActionButton>
                <div className="flex items-center gap-3">
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((prev) => !prev)}
                  />
                </div>
              </>
            }
          />
        }
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                검색 대상
              </p>
              <Select
                options={SEARCH_FIELD_OPTIONS}
                defaultValue={searchField}
                onChange={setSearchField}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                상태
              </p>
              <Select
                options={STATUS_OPTIONS}
                defaultValue={statusFilter}
                onChange={setStatusFilter}
                size="md"
              />
            </div>
          </>
        }
        pagination={
          !isAuthLoading && !isLoading && !error && filteredTypes.length > 0 ? (
            <TablePagination {...pagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || isLoading ? (
          <ListPageLoading message="품목 유형 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "품목 유형 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">조건에 맞는 품목 유형이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  코드
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  이름
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  설명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  정렬
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  상태
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  액션
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {paginatedTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <code>{t.code}</code>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                    {t.name}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {t.description || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {t.sortOrder ?? "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <Badge
                      size="sm"
                      color={t.isActive === false ? "error" : "success"}
                    >
                      {t.isActive === false ? "비활성" : "활성"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(t)}
                        aria-label="수정"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(t)}
                        aria-label="삭제"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <TrashBinIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPageLayout>

      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.closeModal}
        className="mx-4 max-w-lg p-6 dark:bg-gray-900 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {form.id != null ? "품목 유형 수정" : "품목 유형 추가"}
        </h2>
        <form onSubmit={handleSubmitForm} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="type-code">코드 *</Label>
            <Input
              id="type-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="유형 코드"
              className="mt-1"
              disabled={form.id != null}
            />
          </div>
          <div>
            <Label htmlFor="type-name">이름 *</Label>
            <Input
              id="type-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="유형 이름"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="type-desc">설명</Label>
            <Input
              id="type-desc"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="설명"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="type-sort">정렬순서</Label>
            <input
              id="type-sort"
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
              id="type-active"
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) =>
                setForm((p) => ({ ...p, isActive: e.target.checked }))
              }
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <Label htmlFor="type-active">활성</Label>
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
        title="품목 유형 삭제"
        message={
          typeToDelete
            ? `"${typeToDelete.name}" 유형을 삭제하시겠습니까?`
            : "삭제하시겠습니까?"
        }
        confirmText="삭제"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onClose={() => {
          deleteModal.closeModal();
          setTypeToDelete(null);
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}
