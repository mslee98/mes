import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import LoadingLottie from "../components/common/LoadingLottie";
import { ItemDetailBasicTab } from "../components/items/ItemDetailBasicTab";
import { ItemDetailRevisionsTab } from "../components/items/ItemDetailRevisionsTab";
import { ItemDetailUsageTab } from "../components/items/ItemDetailUsageTab";
import SegmentedControl from "../components/common/SegmentedControl";
import { Modal } from "../components/ui/modal";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import FileUploadDropzone from "../components/form/FileUploadDropzone";
import { useAuth } from "../../../hooks/useAuth";
import { useItemPermissions } from "../hooks/useItemPermissions";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import {
  getItemMaster,
  getItemRevisions,
  getItemUsage,
  createItemRevision,
  updateItemRevision,
  deleteItemRevision,
  getItemRevisionFiles,
  fetchItemRevisionFileBlob,
  uploadItemRevisionFile,
  deleteItemRevisionFile,
  REVISION_STATUS_OPTIONS,
  type ItemRevision,
  type ItemRevisionFileLink,
} from "../api/itemMaster";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_ITEM_TYPE,
  COMMON_CODE_GROUP_ITEM_REVISION_STATUS,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import { isApiError, isForbiddenError } from "../lib/apiError";
import { showForbiddenToast } from "../lib/forbiddenToast";
import { formatItemDetailDt } from "../lib/itemDetailDisplay";
import { ReactComponent as ArrowDownOnSquareIcon } from "../icons/arrow-down-on-square.svg?react";
import { TrashBinIcon } from "../icons";

type DetailTab = "basic" | "revisions" | "usage";

function triggerBrowserDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName.trim() || "attachment";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

const REVISION_CONFLICT_MSG =
  "이 리비전은 이미 다른 구성에 연결되어 있어 삭제할 수 없습니다.";

export default function ItemDetail() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = Number(itemId);
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadItems, canManageItems } = useItemPermissions();
  const [tab, setTab] = useState<DetailTab>("basic");

  const [revisionModal, setRevisionModal] = useState<"create" | "edit" | null>(
    null
  );
  const [editingRevision, setEditingRevision] = useState<ItemRevision | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<ItemRevision | null>(null);
  const [deleteConflict, setDeleteConflict] = useState<string | null>(null);
  const [filesModalRevision, setFilesModalRevision] =
    useState<ItemRevision | null>(null);

  const [revCode, setRevCode] = useState("");
  const [revName, setRevName] = useState("");
  const [revStatus, setRevStatus] = useState("DRAFT");
  const [revDrawing, setRevDrawing] = useState("");
  const [revDesc, setRevDesc] = useState("");
  const [revDefault, setRevDefault] = useState(false);

  const {
    data: item,
    isLoading: itemLoading,
    error: itemError,
  } = useQuery({
    queryKey: ["itemMaster", id],
    queryFn: () => getItemMaster(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && canReadItems && Number.isFinite(id),
  });

  const { data: itemTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_ITEM_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadItems }
  );

  const { data: revisionStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_ITEM_REVISION_STATUS],
    queryFn: async () => {
      try {
        return await getCommonCodesByGroup(
          COMMON_CODE_GROUP_ITEM_REVISION_STATUS,
          accessToken as string
        );
      } catch {
        return [];
      }
    },
    enabled: !!accessToken && !isAuthLoading && canReadItems,
    staleTime: 60_000,
  });

  const revisionStatusSelectOptions = useMemo(() => {
    const fromApi = commonCodesToSelectOptions(revisionStatusCodes);
    if (fromApi.length) return fromApi;
    return REVISION_STATUS_OPTIONS.map((o) => ({
      value: o.value,
      label: o.label,
    }));
  }, [revisionStatusCodes]);

  const {
    data: revisions = [],
    isLoading: revLoading,
    error: revError,
  } = useQuery({
    queryKey: ["itemRevisions", id],
    queryFn: () => getItemRevisions(id, accessToken as string),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      canReadItems &&
      Number.isFinite(id) &&
      tab === "revisions",
  });

  const {
    data: usage = [],
    isLoading: usageLoading,
    error: usageError,
  } = useQuery({
    queryKey: ["itemUsage", id],
    queryFn: () => getItemUsage(id, accessToken as string),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      canReadItems &&
      Number.isFinite(id) &&
      tab === "usage",
  });

  const filesModalRevisionId = filesModalRevision?.id;
  const {
    data: revisionFiles = [],
    isLoading: revisionFilesLoading,
    error: revisionFilesError,
  } = useQuery({
    queryKey: ["itemRevisionFiles", filesModalRevisionId],
    queryFn: () =>
      getItemRevisionFiles(filesModalRevisionId as number, accessToken as string),
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      canReadItems &&
      filesModalRevisionId != null,
  });

  const openCreateRevision = () => {
    setEditingRevision(null);
    setRevCode("");
    setRevName("");
    setRevStatus("DRAFT");
    setRevDrawing("");
    setRevDesc("");
    setRevDefault(false);
    setRevisionModal("create");
  };

  const openEditRevision = (r: ItemRevision) => {
    setEditingRevision(r);
    setRevCode(r.revisionCode);
    setRevName(r.revisionName);
    setRevStatus(r.status || "DRAFT");
    setRevDrawing(r.drawingNo ?? "");
    setRevDesc(r.description ?? "");
    setRevDefault(r.isDefault);
    setRevisionModal("edit");
  };

  const closeRevisionModal = () => {
    setRevisionModal(null);
    setEditingRevision(null);
  };

  const createRevMutation = useMutation({
    mutationFn: () =>
      createItemRevision(id, accessToken as string, {
        revisionCode: revCode,
        revisionName: revName,
        status: revStatus,
        drawingNo: revDrawing.trim() || null,
        description: revDesc.trim() || null,
        isDefault: revDefault,
      }),
    onSuccess: () => {
      toast.success("리비전을 등록했습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemRevisions", id] });
      queryClient.invalidateQueries({ queryKey: ["itemMaster", id] });
      queryClient.invalidateQueries({ queryKey: ["itemMasterList"] });
      closeRevisionModal();
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "등록에 실패했습니다.");
    },
  });

  const updateRevMutation = useMutation({
    mutationFn: () => {
      if (!editingRevision) throw new Error("no revision");
      return updateItemRevision(editingRevision.id, accessToken as string, {
        revisionName: revName,
        status: revStatus,
        drawingNo: revDrawing.trim() || null,
        description: revDesc.trim() || null,
        isDefault: revDefault,
      });
    },
    onSuccess: () => {
      toast.success("리비전을 수정했습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemRevisions", id] });
      queryClient.invalidateQueries({ queryKey: ["itemMaster", id] });
      queryClient.invalidateQueries({ queryKey: ["itemMasterList"] });
      closeRevisionModal();
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다.");
    },
  });

  const deleteRevMutation = useMutation({
    mutationFn: (revisionId: number) =>
      deleteItemRevision(revisionId, accessToken as string),
    onSuccess: () => {
      toast.success("리비전을 삭제했습니다.");
      queryClient.invalidateQueries({ queryKey: ["itemRevisions", id] });
      queryClient.invalidateQueries({ queryKey: ["itemMaster", id] });
      queryClient.invalidateQueries({ queryKey: ["itemMasterList"] });
      setDeleteTarget(null);
      setDeleteConflict(null);
    },
    onError: (e: unknown) => {
      if (isApiError(e) && e.status === 409) {
        setDeleteConflict(REVISION_CONFLICT_MSG);
        return;
      }
      if (isForbiddenError(e)) {
        setDeleteConflict("삭제 권한이 없습니다.");
        return;
      }
      setDeleteConflict(
        e instanceof Error ? e.message : "삭제에 실패했습니다."
      );
    },
  });

  const uploadRevisionFileMutation = useMutation({
    mutationFn: (args: { revisionId: number; file: File }) =>
      uploadItemRevisionFile(args.revisionId, args.file, accessToken as string),
    onSuccess: (_data, args) => {
      toast.success("파일을 업로드했습니다.");
      queryClient.invalidateQueries({
        queryKey: ["itemRevisionFiles", args.revisionId],
      });
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "업로드 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "업로드에 실패했습니다.");
    },
  });

  const deleteRevisionFileMutation = useMutation({
    mutationFn: (args: { revisionId: number; fileLinkId: number }) =>
      deleteItemRevisionFile(
        args.revisionId,
        args.fileLinkId,
        accessToken as string
      ),
    onSuccess: (_data, args) => {
      toast.success("첨부를 삭제했습니다.");
      queryClient.invalidateQueries({
        queryKey: ["itemRevisionFiles", args.revisionId],
      });
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "삭제 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    },
  });

  const handleSaveRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (revisionModal === "create") {
      if (!revCode.trim() || !revName.trim()) {
        toast.error("리비전 코드와 이름을 입력하세요.");
        return;
      }
      createRevMutation.mutate();
    } else if (revisionModal === "edit" && editingRevision) {
      updateRevMutation.mutate();
    }
  };

  if (!Number.isFinite(id)) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">잘못된 품목 ID입니다.</p>
        </div>
      </>
    );
  }

  if (isAuthLoading) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="인증 확인 중..." />
        </div>
      </>
    );
  }

  if (!accessToken) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
          <p className="text-sm">로그인 후 조회할 수 있습니다.</p>
        </div>
      </>
    );
  }

  if (!canReadItems) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <PageNotice variant="neutral">
          품목 조회 권한(<code>item.read</code>)이 없습니다.
        </PageNotice>
      </>
    );
  }

  if (itemLoading) {
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="품목 정보를 불러오는 중..." />
        </div>
      </>
    );
  }

  if (itemError || !item) {
    const forbidden = itemError && isForbiddenError(itemError);
    return (
      <>
        <PageMeta title="품목 상세" description="품목 정보" />
        <PageBreadcrumb pageTitle="품목 상세" />
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">
            {forbidden
              ? "이 품목을 조회할 권한이 없습니다."
              : itemError instanceof Error
                ? itemError.message
                : "품목을 불러오지 못했습니다."}
          </p>
        </div>
      </>
    );
  }

  const i = item;

  return (
    <>
      <PageMeta title={`품목: ${i.itemName}`} description="품목 마스터 상세" />
      <PageBreadcrumb pageTitle="품목 상세" />

      <div className="space-y-6">
      <PageNotice className="mb-0" variant="neutral">
        리비전은 이 품목의 <strong>도면·버전</strong> 단위입니다. 발주 등 연결은 별도 메뉴에서
        다룹니다.
      </PageNotice>

      <div>
        <SegmentedControl<DetailTab>
          ariaLabel="품목 상세 구역"
          value={tab}
          onChange={setTab}
          equalWidth
          className="max-w-xl"
          options={[
            { value: "basic", label: "기본 정보" },
            { value: "revisions", label: "리비전" },
            { value: "usage", label: "사용처" },
          ]}
        />
      </div>

      {tab === "basic" ? (
        <ItemDetailBasicTab
          item={i}
          itemTypeCodes={itemTypeCodes}
          canManageItems={canManageItems}
          onEditClick={() => navigate(`/items/${id}/edit`)}
        />
      ) : null}

      {tab === "revisions" ? (
        <ItemDetailRevisionsTab
          revisions={revisions}
          revLoading={revLoading}
          revError={revError}
          revisionStatusCodes={revisionStatusCodes}
          canManageItems={canManageItems}
          onOpenCreate={openCreateRevision}
          onOpenEdit={openEditRevision}
          onOpenFiles={setFilesModalRevision}
          onRequestDelete={(r) => {
            setDeleteConflict(null);
            setDeleteTarget(r);
          }}
        />
      ) : null}

      {tab === "usage" ? (
        <ItemDetailUsageTab
          usage={usage}
          usageLoading={usageLoading}
          usageError={usageError}
        />
      ) : null}
      </div>

      <Modal
        isOpen={revisionModal !== null}
        onClose={closeRevisionModal}
        className="max-h-[90vh] max-w-lg overflow-y-auto p-6 dark:bg-gray-900"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          {revisionModal === "create" ? "리비전 등록" : "리비전 수정"}
        </h2>
        <form onSubmit={handleSaveRevision} className="space-y-4">
          <div>
            <Label htmlFor="rev-code">리비전 코드 *</Label>
            <Input
              id="rev-code"
              value={revCode}
              onChange={(e) => setRevCode(e.target.value)}
              disabled={revisionModal === "edit"}
              className="mt-1"
            />
            {revisionModal === "create" ? (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                동일 품목 내에서 코드는 중복될 수 없습니다.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="rev-name">리비전명 *</Label>
            <Input
              id="rev-name"
              value={revName}
              onChange={(e) => setRevName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rev-status">상태</Label>
            <select
              id="rev-status"
              value={revStatus}
              onChange={(e) => setRevStatus(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            >
              {revisionStatusSelectOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="rev-drawing">도면번호</Label>
            <Input
              id="rev-drawing"
              value={revDrawing}
              onChange={(e) => setRevDrawing(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="rev-desc">설명</Label>
            <textarea
              id="rev-desc"
              value={revDesc}
              onChange={(e) => setRevDesc(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="rev-default"
              type="checkbox"
              checked={revDefault}
              onChange={(e) => setRevDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 bg-white text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-brand-500"
            />
            <Label htmlFor="rev-default">기본 리비전으로 지정</Label>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={createRevMutation.isPending || updateRevMutation.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              저장
            </button>
            <button
              type="button"
              onClick={closeRevisionModal}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              닫기
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={filesModalRevision !== null}
        onClose={() => setFilesModalRevision(null)}
        className="max-h-[90vh] max-w-xl overflow-y-auto p-6 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          리비전 첨부파일
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          <code className="rounded bg-gray-200/80 px-1.5 py-0.5 text-theme-xs dark:bg-gray-700 dark:text-gray-100">
            {filesModalRevision?.revisionCode}
          </code>
          <span className="mx-1.5 text-gray-400">·</span>
          <span>{filesModalRevision?.revisionName}</span>
        </p>

        {canManageItems ? (
          <div className="mt-4">
            <FileUploadDropzone
              disabled={
                uploadRevisionFileMutation.isPending || !filesModalRevision
              }
              onSelectFile={(file: File) => {
                if (!filesModalRevision) return;
                uploadRevisionFileMutation.mutate({
                  revisionId: filesModalRevision.id,
                  file,
                });
              }}
              onError={(msg: string) => toast.error(msg)}
              uploadGuideText="이 리비전에 붙일 파일을 선택하거나 여기에 놓으세요."
            />
          </div>
        ) : null}

        <div className="mt-4">
          {revisionFilesLoading ? (
            <LoadingLottie message="첨부 목록을 불러오는 중..." />
          ) : revisionFilesError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {isForbiddenError(revisionFilesError)
                ? "첨부를 조회할 권한이 없습니다."
                : revisionFilesError instanceof Error
                  ? revisionFilesError.message
                  : "목록을 불러오지 못했습니다."}
            </p>
          ) : revisionFiles.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              첨부된 파일이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {revisionFiles.map((f: ItemRevisionFileLink) => (
                <li
                  key={f.fileLinkId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-white/[0.08]"
                >
                  <span className="min-w-0 truncate text-sm text-gray-900 dark:text-white/90">
                    {f.fileName?.trim() ? f.fileName : "(이름 없음)"}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                      {f.uploadedAt ? formatItemDetailDt(f.uploadedAt) : ""}
                    </span>
                    <button
                      type="button"
                      disabled={f.fileLinkId < 1}
                      onClick={async () => {
                        if (f.fileLinkId < 1) {
                          toast.error(
                            "유효한 fileLinkId가 없습니다. 목록을 새로고침해 보세요."
                          );
                          return;
                        }
                        if (!filesModalRevision) return;
                        try {
                          const blob = await fetchItemRevisionFileBlob(
                            filesModalRevision.id,
                            f.fileLinkId,
                            accessToken as string
                          );
                          triggerBrowserDownload(blob, f.fileName ?? "attachment");
                        } catch (error) {
                          const message =
                            error instanceof Error
                              ? error.message
                              : "첨부파일 다운로드에 실패했습니다.";
                          toast.error(message);
                        }
                      }}
                      title="다운로드"
                      aria-label="첨부파일 다운로드"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                    >
                      <ArrowDownOnSquareIcon className="size-4" aria-hidden />
                    </button>
                    {canManageItems ? (
                      <button
                        type="button"
                        disabled={
                          deleteRevisionFileMutation.isPending ||
                          f.fileLinkId < 1
                        }
                        onClick={() => {
                          if (!filesModalRevision || f.fileLinkId < 1) return;
                          deleteRevisionFileMutation.mutate({
                            revisionId: filesModalRevision.id,
                            fileLinkId: f.fileLinkId,
                          });
                        }}
                        title="첨부파일 삭제"
                        aria-label="첨부파일 삭제"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <TrashBinIcon className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-100 pt-4 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setFilesModalRevision(null)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            닫기
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteConflict(null);
        }}
        className="max-w-md p-6 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          리비전 삭제
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          <code className="rounded bg-gray-200/80 px-1.5 py-0.5 text-theme-xs dark:bg-gray-700 dark:text-gray-100">
            {deleteTarget?.revisionCode}
          </code>{" "}
          리비전을 삭제할까요?
        </p>
        {deleteConflict ? (
          <div
            className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
            role="alert"
          >
            {deleteConflict}
          </div>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={deleteRevMutation.isPending}
            onClick={() => {
              if (deleteTarget) {
                setDeleteConflict(null);
                deleteRevMutation.mutate(deleteTarget.id);
              }
            }}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={() => {
              setDeleteTarget(null);
              setDeleteConflict(null);
            }}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            취소
          </button>
        </div>
      </Modal>
    </>
  );
}
