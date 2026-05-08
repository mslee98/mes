import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ListPageLoading from "../components/common/ListPageLoading";
import Input from "../components/form/input/InputField";
import InputAddonField from "../components/form/InputAddonField";
import FileUploadDropzone from "../components/form/FileUploadDropzone";
import Select from "../components/form/Select";
import Label from "../components/form/Label";
import FormField from "../components/form/FormField";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import ConfirmModal from "../components/common/ConfirmModal";
import Badge from "../components/ui/badge/Badge";
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
import { useAuth } from "../hooks/useAuth";
import { useServerListPagination } from "../hooks/useServerListPagination";
import {
  createLens,
  uploadLensFiles,
  getLensList,
  type GetLensListParams,
  type LensItem,
} from "../api/lenses";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { renderPartnerOptionLabel } from "../components/form/PartnerOptionLabel";
import { isOtherSupplierPartner } from "../lib/partnerPredicates";
import {
  toPartnerSearchableSelectOptions,
  toPartnerSelectOptions,
} from "../lib/partnerSelectOptions";
import { validateRequiredFields } from "../lib/formValidation";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
];

export default function Lenses() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOptionsOpen, setSearchOptionsOpen] = useState(false);
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(20);

  const [createOpen, setCreateOpen] = useState(false);
  const [createCloseConfirmOpen, setCreateCloseConfirmOpen] = useState(false);
  const [manufacturerId, setManufacturerId] = useState("");
  const [lensName, setLensName] = useState("");
  const [fNumber, setFNumber] = useState("");
  const [focalLength, setFocalLength] = useState("");
  const [pendingFilesForCreate, setPendingFilesForCreate] = useState<File[]>([]);
  const uploadErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FILE_TARGET_TYPE / LENS")) {
      return "백엔드 공통코드(FILE_TARGET_TYPE/LENS) 미반영 상태입니다. 시드 반영 후 다시 시도해 주세요.";
    }
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    }
    return message || "첨부파일 업로드에 실패했습니다.";
  };
  const normalizeNumberLike = (raw: string) => {
    const sanitized = raw.replace(/[^\d.]/g, "");
    const [intPart, ...decimalParts] = sanitized.split(".");
    const decimal = decimalParts.join("");
    return decimalParts.length > 0 ? `${intPart}.${decimal}` : intPart;
  };

  const [isActive, setIsActive] = useState(true);

  const resetCreateForm = () => {
    setManufacturerId("");
    setLensName("");
    setFNumber("");
    setFocalLength("");
    setPendingFilesForCreate([]);
    setIsActive(true);
  };

  const openCreateModal = () => {
    navigate("/lenses/new");
  };
  const isCreateFormDirty =
    manufacturerId.trim() !== "" ||
    lensName.trim() !== "" ||
    fNumber.trim() !== "" ||
    focalLength.trim() !== "" ||
    isActive !== true;
  const closeCreateModalImmediately = () => {
    setCreateOpen(false);
    setCreateCloseConfirmOpen(false);
  };
  const requestCloseCreateModal = () => {
    if (createMutation.isPending) return;
    if (!isCreateFormDirty) {
      closeCreateModalImmediately();
      return;
    }
    setCreateCloseConfirmOpen(true);
  };

  const { data: partners = [] } = usePartnersQuery(accessToken, undefined, {
    enabled: !!accessToken && !isAuthLoading,
  });
  const { countryCodes } = usePartnerCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const partnerOptions = useMemo(
    () => toPartnerSelectOptions(partners, countryCodes),
    [partners, countryCodes]
  );
  const createPartnerOptions = useMemo(
    () =>
      toPartnerSearchableSelectOptions(
        partners.filter(isOtherSupplierPartner),
        countryCodes
      ),
    [partners, countryCodes]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      createLens(accessToken as string, {
        manufacturerId: manufacturerId.trim(),
        lensName: lensName.trim(),
        fNumber: fNumber.trim(),
        focalLength: focalLength.trim(),
        isActive,
      }),
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["lensList"] });
      if (pendingFilesForCreate.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;
        try {
          const uploaded = await uploadLensFiles(
            created.id,
            pendingFilesForCreate,
            accessToken as string
          );
          uploadedCount = uploaded.length;
          failedCount = Math.max(pendingFilesForCreate.length - uploadedCount, 0);
        } catch (error) {
          failedCount = pendingFilesForCreate.length;
          notify.error(uploadErrorMessage(error));
        }
        if (uploadedCount > 0) {
          notify.success(`렌즈와 첨부파일 ${uploadedCount}건을 등록했습니다.`);
        } else {
          notify.success("렌즈를 등록했습니다.");
        }
        if (failedCount > 0) {
          notify.error(`첨부파일 ${failedCount}건 업로드에 실패했습니다.`);
        }
      } else {
        notify.success("렌즈를 등록했습니다.");
      }
      resetCreateForm();
      setCreateOpen(false);
    },
    onError: (e: Error) => notify.error(e.message || "등록에 실패했습니다."),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateRequiredFields(
        [
          { value: manufacturerId, message: "제조사를 선택하세요." },
          { value: lensName, message: "렌즈명을 입력하세요." },
          { value: fNumber, message: "F Number를 입력하세요." },
          { value: focalLength, message: "초점 거리를 입력하세요." },
        ],
        notify.error
      )
    ) {
      return;
    }
    createMutation.mutate();
  };
  const addPendingFilesForCreate = (files: File[]) => {
    if (files.length === 0) return;
    setPendingFilesForCreate((prev) => [...prev, ...files].slice(0, 10));
    notify.success(`첨부 대기 목록에 ${files.length}건 추가되었습니다.`);
  };
  const removePendingCreateFile = (index: number) => {
    setPendingFilesForCreate((prev) => prev.filter((_, i) => i !== index));
  };

  const listParams = useMemo((): GetLensListParams => {
    const p: GetLensListParams = {
      page: listPage,
      size: listPageSize,
    };
    const kw = searchKeyword.trim();
    if (kw) p.keyword = kw;
    if (manufacturerFilter) p.manufacturerId = manufacturerFilter;
    if (statusFilter === "active") p.isActive = true;
    if (statusFilter === "inactive") p.isActive = false;
    return p;
  }, [listPage, listPageSize, searchKeyword, manufacturerFilter, statusFilter]);

  const { data, isLoading, error, isPlaceholderData } = useQuery({
    queryKey: ["lensList", listParams],
    queryFn: () => getLensList(accessToken as string, listParams),
    enabled: !!accessToken && !isAuthLoading,
    placeholderData: (prev) => prev,
  });

  const serverTotal = data?.total ?? 0;
  const items: LensItem[] = data?.items ?? [];

  const listPagination = useServerListPagination({
    totalCount: serverTotal,
    listPage,
    setListPage,
    listPageSize,
    setListPageSize,
    resetPageDeps: [searchKeyword, manufacturerFilter, statusFilter],
    emptyTotalPages: "one",
  });

  return (
    <>
      <Modal
        isOpen={createOpen}
        onClose={requestCloseCreateModal}
        className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 sm:p-8"
      >
        <h2 className="mb-8 text-lg font-semibold text-gray-900 dark:text-white">
          렌즈 등록
        </h2>
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <SearchableSelectWithCreate
              id="lens-create-manufacturer"
              label="제조사 (업체 선택)"
              required
              value={manufacturerId}
              onChange={setManufacturerId}
              options={createPartnerOptions}
              formatOptionLabel={renderPartnerOptionLabel}
              placeholder="검색하여 업체 선택"
              addTrigger="none"
              addButtonLabel=""
              onAddClick={() => {}}
            />
          </div>
          <div>
            <FormField
              id="lens-create-name"
              label="렌즈명"
              required
              reserveHelpSpace
              control={
                <Input
                  id="lens-create-name"
                  value={lensName}
                  onChange={(e) => setLensName(e.target.value)}
                />
              }
            />
          </div>
          <div>
            <FormField
              id="lens-create-fnumber"
              label="F Number"
              required
              reserveHelpSpace
              controlMarginClassName=""
              control={
                <InputAddonField
                  id="lens-create-fnumber"
                  value={fNumber}
                  onChange={(value) => setFNumber(normalizeNumberLike(value))}
                  placeholder="예: 1.4"
                  addon="F/"
                  addonPlacement="outside-left"
                  addonAriaLabel="f-number prefix"
                />
              }
            />
          </div>
          <div>
            <FormField
              id="lens-create-focal-length"
              label="초점 거리"
              required
              reserveHelpSpace
              controlMarginClassName=""
              control={
                <InputAddonField
                  id="lens-create-focal-length"
                  value={focalLength}
                  onChange={(value) => setFocalLength(normalizeNumberLike(value))}
                  placeholder="예: 25"
                  addon="mm"
                  addonPlacement="outside-right"
                  addonAriaLabel="focal-length unit"
                />
              }
            />
          </div>
          <Toggle
            id="lens-create-active-toggle"
            checked={isActive}
            onChange={setIsActive}
          />
          <div>
            <Label>첨부파일</Label>
            <div className="mt-1.5 space-y-3">
              <FileUploadDropzone
                onSelectFiles={addPendingFilesForCreate}
                onError={notify.error}
                disabled={createMutation.isPending}
                maxFileSizeMb={50}
                maxFiles={10}
                multiple
                buttonLabel="파일 선택"
                uploadGuideText="파일을 선택하면 등록 시 함께 업로드됩니다."
              />
              <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-white/5">
                {pendingFilesForCreate.length === 0 ? (
                  <li className="py-2 text-gray-500">선택된 첨부파일이 없습니다.</li>
                ) : (
                  pendingFilesForCreate.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2 pr-3">
                        <img
                          src={fileTypeIconSrc(file.name)}
                          alt=""
                          className="h-5 w-5 shrink-0"
                          decoding="async"
                        />
                        <span className="truncate text-gray-800 dark:text-gray-200">
                          {file.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePendingCreateFile(index)}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-theme-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        제거
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
          <FormActionBar
            className="mt-0 dark:border-white/10"
            submitLabel="등록"
            isPending={createMutation.isPending}
            submitDisabled={!accessToken}
            onCancel={requestCloseCreateModal}
          />
        </form>
      </Modal>
      <ConfirmModal
        isOpen={createCloseConfirmOpen}
        title="작성 중인 내용을 닫을까요?"
        message="지금 닫으면 입력 중인 렌즈 등록 내용이 사라집니다."
        confirmText="닫기"
        cancelText="계속 작성"
        confirmVariant="danger"
        illustration="trash"
        onClose={() => setCreateCloseConfirmOpen(false)}
        onConfirm={closeCreateModalImmediately}
      />

      <PageMeta title="렌즈 목록" description="렌즈 마스터 목록" />
      <PageBreadcrumb pageTitle="렌즈 목록" />
      <ListPageLayout
        title="렌즈 목록"
        searchOptionsOpen={searchOptionsOpen}
        searchOptions={
          <>
            <div className="w-full sm:w-[240px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                제조사
              </p>
              <Select
                options={[{ value: "", label: "제조사 전체" }, ...partnerOptions]}
                value={manufacturerFilter}
                onChange={setManufacturerFilter}
                size="md"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                활성 여부
              </p>
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                size="md"
              />
            </div>
          </>
        }
        toolbar={
          <ListPageToolbarRow
            search={
              <DataListSearchInput
                id="lenses-list-search"
                placeholder="F Number, 초점 거리, 제조사 검색"
                value={searchKeyword}
                onChange={setSearchKeyword}
              />
            }
            actions={
              <>
                <DataListPrimaryActionButton onClick={openCreateModal}>
                  렌즈 등록
                </DataListPrimaryActionButton>
                <div className="flex items-center gap-3">
                  <DataListSearchOptionsButton
                    open={searchOptionsOpen}
                    onToggle={() => setSearchOptionsOpen((o) => !o)}
                  />
                </div>
              </>
            }
          />
        }
        pagination={
          !isAuthLoading &&
          !isLoading &&
          !error &&
          serverTotal > 0 ? (
            <TablePagination {...listPagination} />
          ) : (
            <></>
          )
        }
      >
        {isAuthLoading || (isLoading && !isPlaceholderData) ? (
          <ListPageLoading message="렌즈 목록을 불러오는 중..." />
        ) : !accessToken ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 목록을 조회할 수 있습니다.</p>
          </div>
        ) : error ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "렌즈 목록을 불러오지 못했습니다."}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">조건에 맞는 렌즈가 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  제조사
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  렌즈명
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  F Number
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  초점 거리
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  상태
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {items.map((lens) => (
                <TableRow
                  key={lens.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  onClick={() => navigate(`/lenses/${lens.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/lenses/${lens.id}`);
                    }
                  }}
                >
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {lens.manufacturerName || `업체 #${lens.manufacturerId}`}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                    {lens.lensName?.trim() || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {lens.fNumber || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {lens.focalLength || "-"}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-sm">
                    <Badge
                      size="sm"
                      color={lens.isActive === false ? "error" : "success"}
                    >
                      {lens.isActive === false ? "비활성" : "활성"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ListPageLayout>
    </>
  );
}
