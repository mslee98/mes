import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import Select from "../components/form/Select";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import { Modal } from "../components/ui/modal";
import ConfirmModal from "../components/common/ConfirmModal";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeaderCell,
  DataTableHeaderLabel,
  DataTableRow,
  DataListPrimaryActionButton,
  DataListSearchInput,
  DataListSearchOptionsButton,
  ListPageLayout,
  ListPageToolbarRow,
  StatusBadgeCell,
  TablePagination,
} from "../components/list";
import { useAuth } from "../hooks/useAuth";
import { useServerListPagination } from "../hooks/useServerListPagination";
import {
  createBugBoardPost,
  deleteBugBoardPost,
  getBugBoardPost,
  getBugBoardPosts,
  updateBugBoardPost,
  type BugBoardListQuery,
  type BugBoardPost,
  type BugBoardStatus,
  type BugPriority,
} from "../api/devBoards";
import {
  BUG_BOARD_PRIORITY_FILTER_OPTIONS,
  BUG_BOARD_STATUS_FILTER_OPTIONS,
  labelForBugBoardStatus,
  labelForBugPriority,
} from "../lib/bugBoardDisplay";

type BugBoardFormState = {
  title: string;
  content: string;
  priority: BugPriority;
  status: BugBoardStatus;
};

const EMPTY_FORM: BugBoardFormState = {
  title: "",
  content: "",
  priority: "MEDIUM",
  status: "OPEN",
};

export default function BugBoard() {
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<BugBoardFormState>(EMPTY_FORM);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<BugBoardFormState>(EMPTY_FORM);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const listParams = useMemo((): BugBoardListQuery => {
    const p: BugBoardListQuery = {
      page: listPage,
      size: listPageSize,
    };
    const keyword = searchKeyword.trim();
    if (keyword) p.keyword = keyword;
    if (statusFilter !== "all") p.status = statusFilter;
    if (priorityFilter !== "all") p.priority = priorityFilter;
    return p;
  }, [listPage, listPageSize, searchKeyword, statusFilter, priorityFilter]);

  const {
    data: listData,
    isLoading: isListLoading,
    error: listError,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["bugBoardList", listParams],
    queryFn: () => getBugBoardPosts(accessToken as string, listParams),
    enabled: !!accessToken && !isAuthLoading,
    placeholderData: (prev) => prev,
  });

  const items = listData?.items ?? [];
  const totalCount = listData?.total ?? 0;

  const listPagination = useServerListPagination({
    totalCount,
    listPage,
    setListPage,
    listPageSize,
    setListPageSize,
    resetPageDeps: [searchKeyword, statusFilter, priorityFilter],
    emptyTotalPages: "one",
  });

  const {
    data: selectedPost,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ["bugBoardPost", selectedId],
    queryFn: () => getBugBoardPost(selectedId as number, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && selectedId != null && detailModalOpen,
  });

  useEffect(() => {
    if (!selectedPost) return;
    setEditForm({
      title: selectedPost.title ?? "",
      content: selectedPost.content ?? "",
      priority: selectedPost.priority ?? "MEDIUM",
      status: selectedPost.status ?? "OPEN",
    });
  }, [selectedPost]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      return createBugBoardPost(
        {
          title: createForm.title.trim(),
          content: createForm.content.trim(),
          priority: createForm.priority,
          status: createForm.status,
        },
        accessToken
      );
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["bugBoardList"] });
      setCreateModalOpen(false);
      setCreateForm(EMPTY_FORM);
      setSelectedId(created.id);
      notify.success("버그 게시글을 등록했습니다.");
    },
    onError: (error: Error) => {
      notify.error(error.message || "버그 게시글 등록에 실패했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      if (selectedId == null) throw new Error("수정할 게시글을 선택해 주세요.");
      return updateBugBoardPost(
        selectedId,
        {
          title: editForm.title.trim(),
          content: editForm.content.trim(),
          priority: editForm.priority,
          status: editForm.status,
        },
        accessToken
      );
    },
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["bugBoardList"] });
      await queryClient.invalidateQueries({ queryKey: ["bugBoardPost", updated.id] });
      notify.success("버그 게시글을 수정했습니다.");
    },
    onError: (error: Error) => {
      notify.error(error.message || "버그 게시글 수정에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken) throw new Error("로그인이 필요합니다.");
      if (selectedId == null) throw new Error("삭제할 게시글을 선택해 주세요.");
      await deleteBugBoardPost(selectedId, accessToken);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bugBoardList"] });
      if (selectedId != null) {
        await queryClient.invalidateQueries({ queryKey: ["bugBoardPost", selectedId] });
      }
      setSelectedId(null);
      setDetailModalOpen(false);
      setDeleteConfirmOpen(false);
      setEditForm(EMPTY_FORM);
      notify.success("버그 게시글을 삭제했습니다.");
    },
    onError: (error: Error) => {
      notify.error(error.message || "버그 게시글 삭제에 실패했습니다.");
    },
  });

  const isSaving =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleRowSelect = (post: BugBoardPost) => {
    setSelectedId(post.id);
    setDetailModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    if (createForm.title.trim() === "") {
      notify.error("제목을 입력해 주세요.");
      return;
    }
    if (createForm.content.trim() === "") {
      notify.error("내용을 입력해 주세요.");
      return;
    }
    await createMutation.mutateAsync();
  };

  const handleUpdateSubmit = async () => {
    if (editForm.title.trim() === "") {
      notify.error("제목을 입력해 주세요.");
      return;
    }
    if (editForm.content.trim() === "") {
      notify.error("내용을 입력해 주세요.");
      return;
    }
    if (selectedId == null) {
      notify.error("수정할 게시글을 선택해 주세요.");
      return;
    }
    await updateMutation.mutateAsync();
  };

  const handleDelete = async () => {
    if (selectedId == null) return;
    await deleteMutation.mutateAsync();
  };

  return (
    <>
      <PageMeta title="버그 게시판" description="개발 중 내부 버그 이슈 관리" />
      <PageBreadcrumb pageTitle="버그 게시판" />

      <ListPageLayout
          title="버그 게시글 목록"
          desc="상태·우선순위 필터 및 키워드 검색을 지원합니다."
          searchOptionsOpen={searchOptionsOpen}
          searchOptions={
            <>
              <div className="w-full sm:w-52">
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">상태</p>
                <Select
                  options={BUG_BOARD_STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  size="md"
                />
              </div>
              <div className="w-full sm:w-52">
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">우선순위</p>
                <Select
                  options={BUG_BOARD_PRIORITY_FILTER_OPTIONS}
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  size="md"
                />
              </div>
            </>
          }
          toolbar={
            <ListPageToolbarRow
              search={
                <DataListSearchInput
                  id="bug-board-search"
                  placeholder="제목·내용 검색"
                  value={searchKeyword}
                  onChange={setSearchKeyword}
                />
              }
              actions={
                <>
                  <DataListPrimaryActionButton
                    onClick={() => {
                      setCreateForm(EMPTY_FORM);
                      setCreateModalOpen(true);
                    }}
                  >
                    신규 등록
                  </DataListPrimaryActionButton>
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((o) => !o)}
                  />
                </>
              }
            />
          }
          pagination={
            !isAuthLoading && !isListLoading && !listError && totalCount > 0 ? (
              <TablePagination {...listPagination} />
            ) : (
              <></>
            )
          }
        >
          {isAuthLoading || (isListLoading && !isPlaceholderData) ? (
            <ListPageLoading message="버그 게시글 목록을 불러오는 중..." />
          ) : !accessToken ? (
            <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">로그인 후 목록을 조회할 수 있습니다.</p>
            </div>
          ) : listError ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {listError instanceof Error
                  ? listError.message
                  : "버그 게시글 목록을 불러오지 못했습니다."}
              </p>
            </div>
          ) : items.length === 0 ? (
            <DataTable fillWidth>
              <DataTableHeader>
                <DataTableHeaderCell colSpan={4} compact sortable={false}>
                  <DataTableHeaderLabel>제목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>우선순위</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>작성자</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortable={false}
                  className="border-r-0"
                >
                  <DataTableHeaderLabel>생성일</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                <DataTableRow>
                  <DataTableCell
                    colSpan={12}
                    compact
                    className="justify-center border-r-0 py-6"
                  >
                    조건에 맞는 게시글이 없습니다.
                  </DataTableCell>
                </DataTableRow>
              </DataTableBody>
            </DataTable>
          ) : (
            <DataTable fillWidth>
              <DataTableHeader>
                <DataTableHeaderCell colSpan={4} compact sortable={false}>
                  <DataTableHeaderLabel>제목</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>우선순위</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>상태</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell colSpan={2} compact sortable={false}>
                  <DataTableHeaderLabel>작성자</DataTableHeaderLabel>
                </DataTableHeaderCell>
                <DataTableHeaderCell
                  colSpan={2}
                  compact
                  sortable={false}
                  className="border-r-0"
                >
                  <DataTableHeaderLabel>생성일</DataTableHeaderLabel>
                </DataTableHeaderCell>
              </DataTableHeader>
              <DataTableBody>
                {items.map((item) => {
                  const isSelected = selectedId === item.id && detailModalOpen;
                  return (
                    <DataTableRow
                      key={item.id}
                      selected={isSelected}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                      onClick={() => handleRowSelect(item)}
                    >
                      <DataTableCell colSpan={4} compact>
                        {item.title}
                      </DataTableCell>
                      <DataTableCell colSpan={2} compact>
                        {labelForBugPriority(item.priority)}
                      </DataTableCell>
                      <DataTableCell colSpan={2} compact>
                        <StatusBadgeCell label={labelForBugBoardStatus(item.status)} />
                      </DataTableCell>
                      <DataTableCell colSpan={2} compact>
                        {item.createdByName?.trim() || "-"}
                      </DataTableCell>
                      <DataTableCell colSpan={2} compact className="border-r-0">
                        {item.createdAt?.slice(0, 10) || "-"}
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
      </ListPageLayout>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        className="mx-4 w-full max-w-2xl p-6"
        header={
          <h3 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
            버그 게시글 등록
            <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">버그 게시글을 등록합니다.</p>
          </h3>
        }

      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="create-bug-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                제목
              </label>
              <Input
                id="create-bug-title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="버그 제목"
                maxLength={200}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="create-bug-priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  우선순위
                </label>
                <Select
                  id="create-bug-priority"
                  options={BUG_BOARD_PRIORITY_FILTER_OPTIONS.filter((x) => x.value !== "all")}
                  value={String(createForm.priority)}
                  onChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, priority: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="create-bug-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  상태
                </label>
                <Select
                  id="create-bug-status"
                  options={BUG_BOARD_STATUS_FILTER_OPTIONS.filter((x) => x.value !== "all")}
                  value={String(createForm.status)}
                  onChange={(value) =>
                    setCreateForm((prev) => ({ ...prev, status: value }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="create-bug-content" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              내용
            </label>
            <TextArea
              id="create-bug-content"
              rows={6}
              value={createForm.content}
              onChange={(value) =>
                setCreateForm((prev) => ({ ...prev, content: value }))
              }
              placeholder="버그 상세 설명"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleCreateSubmit()}
              disabled={isSaving}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        className="mx-4 w-full max-w-2xl p-6"
      >
        {selectedId != null && isDetailLoading ? (
          <ListPageLoading message="게시글 상세를 불러오는 중..." />
        ) : detailError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {detailError instanceof Error
              ? detailError.message
              : "게시글 상세를 불러오지 못했습니다."}
          </div>
        ) : selectedId == null ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            목록에서 게시글을 선택해 주세요.
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="pr-10 text-lg font-semibold text-gray-900 dark:text-white">
              버그 게시글 상세/수정
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="bug-title" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  제목
                </label>
                <Input
                  id="bug-title"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="버그 제목"
                  maxLength={200}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="bug-priority" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    우선순위
                  </label>
                  <Select
                    id="bug-priority"
                    options={BUG_BOARD_PRIORITY_FILTER_OPTIONS.filter((x) => x.value !== "all")}
                    value={String(editForm.priority)}
                    onChange={(value) =>
                      setEditForm((prev) => ({ ...prev, priority: value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="bug-status" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    상태
                  </label>
                  <Select
                    id="bug-status"
                    options={BUG_BOARD_STATUS_FILTER_OPTIONS.filter((x) => x.value !== "all")}
                    value={String(editForm.status)}
                    onChange={(value) =>
                      setEditForm((prev) => ({ ...prev, status: value }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bug-content" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                내용
              </label>
              <TextArea
                id="bug-content"
                rows={5}
                value={editForm.content}
                onChange={(value) =>
                  setEditForm((prev) => ({ ...prev, content: value }))
                }
                placeholder="버그 상세 설명"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={selectedId == null || isSaving}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateSubmit()}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : "수정 저장"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        title="버그 게시글 삭제"
        message="선택한 버그 게시글을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
