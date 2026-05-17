import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import DetailPageState from "../components/common/DetailPageState";
import ConfirmModal from "../components/common/ConfirmModal";
import FormField from "../components/form/FormField";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import InputAddonField from "../components/form/InputAddonField";
import FileUploadDropzone from "../components/form/FileUploadDropzone";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { renderPartnerOptionLabel } from "../components/form/PartnerOptionLabel";
import { TrashBinIcon } from "../icons";
import { useAuth } from "../hooks/useAuth";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import {
  createLens,
  deleteLensFile,
  getLens,
  getLensFiles,
  updateLens,
  uploadLensFiles,
} from "../api/lenses";
import {
  PARTNER_SUPPLIER_SEGMENT_OTHER,
  PARTNER_TYPE_SUPPLIER,
} from "../lib/partnerPredicates";
import { toPartnerSearchableSelectOptions } from "../lib/partnerSelectOptions";
import { validateRequiredFields } from "../lib/formValidation";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";
import { normalizeDecimalInput } from "../lib/numberInput";
import { formatDateTimeKo } from "../lib/dateFormat";

const LENS_MANUFACTURER_SUPPLIER_SEGMENT_CODE = PARTNER_SUPPLIER_SEGMENT_OTHER;

export default function LensForm() {
  const { lensId } = useParams();
  const isNew = !lensId;
  const id = String(lensId ?? "").trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [manufacturerId, setManufacturerId] = useState("");
  const [lensName, setLensName] = useState("");
  const [fNumber, setFNumber] = useState("");
  const [focalLength, setFocalLength] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pendingFilesForCreate, setPendingFilesForCreate] = useState<File[]>([]);
  const [deleteTargetFileId, setDeleteTargetFileId] = useState<number | null>(null);

  const { data: partners = [], isLoading: isPartnersLoading } = usePartnersQuery(
    accessToken,
    {
      type: PARTNER_TYPE_SUPPLIER,
      supplierSegmentCode: LENS_MANUFACTURER_SUPPLIER_SEGMENT_CODE,
    },
    { enabled: !!accessToken && !isAuthLoading }
  );
  const { countryCodes } = usePartnerCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const {
    data: existing,
    isLoading: isLensLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["lens", id],
    queryFn: () => getLens(id, accessToken as string),
    enabled: !isNew && !!accessToken && !isAuthLoading && id !== "",
  });
  const { data: files = [] } = useQuery({
    queryKey: ["lensFiles", id],
    queryFn: () => getLensFiles(id, accessToken as string),
    enabled: !isNew && !!accessToken && !isAuthLoading && id !== "",
  });

  const uploadErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FILE_TARGET_TYPE / LENS")) {
      return "백엔드 공통코드(FILE_TARGET_TYPE/LENS) 미반영 상태입니다. 시드 반영 후 다시 시도해 주세요.";
    }
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    }
    return message || "첨부파일 처리에 실패했습니다.";
  };

  useEffect(() => {
    if (!existing) return;
    setManufacturerId(
      existing.manufacturerId != null ? String(existing.manufacturerId) : ""
    );
    setLensName(existing.lensName?.trim() || "");
    setFNumber(existing.fNumber ?? "");
    setFocalLength(existing.focalLength ?? "");
    setIsActive(existing.isActive !== false);
  }, [existing]);

  const manufacturerOptions = useMemo(
    () => toPartnerSearchableSelectOptions(partners, countryCodes),
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
        try {
          await uploadLensFiles(
            created.id,
            pendingFilesForCreate,
            accessToken as string
          );
        } catch (error) {
          notify.error(uploadErrorMessage(error));
        }
      }
      notify.success("렌즈를 등록했습니다.");
      navigate(`/lenses/${created.id}`);
    },
    onError: (e: Error) => notify.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateLens(id, accessToken as string, {
        manufacturerId: manufacturerId.trim(),
        lensName: lensName.trim(),
        fNumber: fNumber.trim(),
        focalLength: focalLength.trim(),
        isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lensList"] });
      queryClient.invalidateQueries({ queryKey: ["lens", id] });
      notify.success("렌즈를 수정했습니다.");
      navigate(`/lenses/${id}`);
    },
    onError: (e: Error) => notify.error(e.message || "수정에 실패했습니다."),
  });
  const fileUploadMutation = useMutation({
    mutationFn: (selectedFiles: File[]) =>
      uploadLensFiles(id, selectedFiles, accessToken as string),
    onSuccess: (uploaded) => {
      queryClient.invalidateQueries({ queryKey: ["lensFiles", id] });
      notify.success(`첨부파일 ${uploaded.length}건을 업로드했습니다.`);
    },
    onError: (error: Error) => notify.error(uploadErrorMessage(error)),
  });
  const fileDeleteMutation = useMutation({
    mutationFn: (fileLinkId: number) =>
      deleteLensFile(id, fileLinkId, accessToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lensFiles", id] });
      notify.success("첨부파일을 삭제했습니다.");
    },
    onError: (error: Error) => notify.error(uploadErrorMessage(error)),
  });

  const handleSubmit = (e: React.FormEvent) => {
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
    if (isNew) {
      createMutation.mutate();
      return;
    }
    updateMutation.mutate();
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && !id) {
    return (
      <DetailPageState
        title="렌즈 수정"
        description="렌즈 마스터"
        pageTitle="렌즈 수정"
        invalidMessage="잘못된 렌즈 ID입니다."
      />
    );
  }

  if (isAuthLoading || (!isNew && isLensLoading) || isPartnersLoading) {
    return (
      <DetailPageState
        title={isNew ? "렌즈 등록" : "렌즈 수정"}
        description="렌즈 마스터"
        pageTitle={isNew ? "렌즈 등록" : "렌즈 수정"}
        loadingMessage="불러오는 중..."
      />
    );
  }

  if (!isNew && loadError) {
    return (
      <DetailPageState
        title="렌즈 수정"
        description="렌즈 마스터"
        pageTitle="렌즈 수정"
        errorMessage={
          loadError instanceof Error
            ? loadError.message
            : "렌즈를 불러오지 못했습니다."
        }
      />
    );
  }

  return (
    <>
      <PageMeta title={isNew ? "렌즈 등록" : "렌즈 수정"} description="렌즈 마스터" />
      <PageBreadcrumb pageTitle={isNew ? "렌즈 등록" : "렌즈 수정"} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <ComponentCard
          title={isNew ? "렌즈 등록" : "렌즈 수정"}
          desc={
            isNew
              ? "렌즈 기본 정보(제조사/렌즈명/F Number/초점 거리)를 등록합니다."
              : "렌즈 기본 정보(제조사/렌즈명/F Number/초점 거리)를 수정합니다."
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <SearchableSelectWithCreate
                id="lens-manufacturer"
                label="제조사 (업체 선택)"
                required
                value={manufacturerId}
                onChange={setManufacturerId}
                options={manufacturerOptions}
                formatOptionLabel={renderPartnerOptionLabel}
                placeholder="검색하여 업체 선택"
                addTrigger="none"
                addButtonLabel=""
                onAddClick={() => {}}
              />
            </div>
            <div className="min-w-0">
              <FormField
                label="렌즈명"
                required
                reserveHelpSpace
                control={
                  <Input
                    value={lensName}
                    onChange={(e) => setLensName(e.target.value)}
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="lens-fnumber"
                label="F Number"
                required
                reserveHelpSpace
                controlMarginClassName=""
                control={
                  <InputAddonField
                    id="lens-fnumber"
                    value={fNumber}
                    onChange={(value) => setFNumber(normalizeDecimalInput(value))}
                    placeholder="예: 1.4"
                    addon="F/"
                    addonPlacement="outside-left"
                    addonAriaLabel="f-number prefix"
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="lens-focal-length"
                label="초점 거리"
                required
                reserveHelpSpace
                controlMarginClassName=""
                control={
                  <InputAddonField
                    id="lens-focal-length"
                    value={focalLength}
                    onChange={(value) => setFocalLength(normalizeDecimalInput(value))}
                    placeholder="예: 25"
                    addon="mm"
                    addonPlacement="outside-right"
                    addonAriaLabel="focal-length unit"
                  />
                }
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <Label>첨부파일</Label>
              <div className="mt-1.5 space-y-3">
                {isNew ? (
                  <>
                    <FileUploadDropzone
                      onSelectFiles={(selected) =>
                        setPendingFilesForCreate((prev) =>
                          [...prev, ...selected].slice(0, 20)
                        )
                      }
                      onError={notify.error}
                      disabled={pending}
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
                            className="flex items-center py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <img
                                src={fileTypeIconSrc(file.name)}
                                alt=""
                                className="h-5 w-5 shrink-0"
                                decoding="async"
                              />
                              <span className="truncate text-gray-800 dark:text-gray-200">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingFilesForCreate((prev) =>
                                    prev.filter((_, i) => i !== index)
                                  )
                                }
                                title="첨부파일 제거"
                                aria-label="첨부파일 제거"
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-600 transition-colors hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/15"
                              >
                                <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </div>
                          </li>
                        ))
                      )}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-theme-xs text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300">
                      렌즈 수정 화면의 첨부파일 업로드/삭제는 저장 버튼과 별개로 즉시 반영됩니다.
                    </p>
                    <FileUploadDropzone
                      onSelectFiles={(selected) => fileUploadMutation.mutate(selected)}
                      onError={notify.error}
                      disabled={fileUploadMutation.isPending || fileDeleteMutation.isPending}
                      multiple
                      buttonLabel="파일 선택"
                      uploadGuideText="아래 버튼을 눌러 파일을 업로드하세요."
                    />
                    {fileUploadMutation.isPending ? (
                      <span className="text-theme-xs text-gray-500">업로드 중...</span>
                    ) : null}
                    <ul className="divide-y divide-gray-100 text-theme-sm dark:divide-white/5">
                      {files.length === 0 ? (
                        <li className="py-2 text-gray-500">첨부파일이 없습니다.</li>
                      ) : (
                        files.map((f) => {
                          const fileName = f.file?.originalName ?? f.fileName ?? "-";
                          return (
                            <li key={f.id} className="flex items-center py-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <img
                                  src={fileTypeIconSrc(fileName)}
                                  alt=""
                                  className="h-5 w-5 shrink-0"
                                  decoding="async"
                                />
                                <span className="truncate text-gray-800 dark:text-gray-200">
                                  {fileName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setDeleteTargetFileId(Number(f.id))}
                                  disabled={fileDeleteMutation.isPending}
                                  title="첨부파일 삭제"
                                  aria-label="첨부파일 삭제"
                                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-600 transition-colors hover:bg-error-50 disabled:pointer-events-none disabled:opacity-40 dark:text-error-400 dark:hover:bg-error-500/15"
                                >
                                  <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                                </button>
                                <span className="shrink-0 text-gray-500">
                                  {formatDateTimeKo(f.createdAt ?? f.uploadedAt ?? "", {
                                    emptyFallback: "",
                                  })}
                                </span>
                              </div>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </>
                )}
              </div>
            </div>
            <div className="sm:col-span-2 flex items-center pt-1">
              <Toggle
                id="lens-active-toggle"
                checked={isActive}
                onChange={setIsActive}
              />
            </div>
          </div>
          <FormActionBar
            submitLabel={isNew ? "등록" : "저장"}
            isPending={pending}
            submitDisabled={!accessToken}
            cancelTo={isNew ? "/lenses" : `/lenses/${id}`}
          />
        </ComponentCard>
      </form>
      {!isNew ? (
        <ConfirmModal
          isOpen={deleteTargetFileId != null}
          title="첨부파일을 삭제할까요?"
          message="수정 화면에서 첨부파일 삭제는 즉시 반영되며, 저장 버튼과 무관하게 바로 삭제됩니다."
          confirmText="즉시 삭제"
          cancelText="취소"
          confirmVariant="danger"
          illustration="trash"
          isConfirming={fileDeleteMutation.isPending}
          onClose={() => {
            if (fileDeleteMutation.isPending) return;
            setDeleteTargetFileId(null);
          }}
          onConfirm={() => {
            if (deleteTargetFileId == null) return;
            fileDeleteMutation.mutate(deleteTargetFileId, {
              onSettled: () => setDeleteTargetFileId(null),
            });
          }}
        />
      ) : null}
    </>
  );
}
