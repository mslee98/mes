import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import DetailPageState from "../components/common/DetailPageState";
import ConfirmModal from "../components/common/ConfirmModal";
import FormField from "../components/form/FormField";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import InputAddonField from "../components/form/InputAddonField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import FileUploadDropzone from "../components/form/FileUploadDropzone";
import ActiveToggle from "../components/form/ActiveToggle";
import FormActionBar from "../components/form/FormActionBar";
import { TrashBinIcon } from "../icons";
import { useAuth } from "../hooks/useAuth";
import {
  checkProductBusinessCode,
  createProduct,
  deleteProductFile,
  getProduct,
  getProductFiles,
  updateProduct,
  uploadProductFiles,
} from "../api/products";
import { validateRequiredFields } from "../lib/formValidation";
import { fileTypeIconSrc } from "../lib/fileTypeIcon";

const ARRAY_TYPE_PRESET: Record<"QVGA" | "VGA" | "SXGA", { width: string; height: string }> = {
  QVGA: { width: "320", height: "256" },
  VGA: { width: "640", height: "480" },
  SXGA: { width: "1280", height: "1024" },
};
const BUSINESS_CODE_REGEX = /^[A-Z]{1,2}$/;

function normalizeNumberLike(raw: string) {
  const sanitized = raw.replace(/[^\d.]/g, "");
  const [intPart, ...decimalParts] = sanitized.split(".");
  const decimal = decimalParts.join("");
  return decimalParts.length > 0 ? `${intPart}.${decimal}` : intPart;
}

function formatAttachmentDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR");
}

export default function ProductForm() {
  const { productId } = useParams();
  const isNew = !productId;
  const id = String(productId ?? "").trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [businessCode, setBusinessCode] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState<"ENGINE" | "CAMERA">("ENGINE");
  const [arrayType, setArrayType] = useState<"QVGA" | "VGA" | "SXGA" | "CUSTOM" | "">("");
  const [arrayCustomText, setArrayCustomText] = useState("");
  const [arrayWidth, setArrayWidth] = useState("");
  const [arrayHeight, setArrayHeight] = useState("");
  const [pixelPitch, setPixelPitch] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [pendingFilesForCreate, setPendingFilesForCreate] = useState<File[]>([]);
  const [deleteTargetFileId, setDeleteTargetFileId] = useState<number | null>(null);
  const [verifiedBusinessCode, setVerifiedBusinessCode] = useState("");

  const {
    data: existing,
    isLoading: isLoadLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id, accessToken as string),
    enabled: !isNew && !!accessToken && !isAuthLoading && id !== "",
  });
  const { data: files = [] } = useQuery({
    queryKey: ["productFiles", id],
    queryFn: () => getProductFiles(id, accessToken as string),
    enabled: !isNew && !!accessToken && !isAuthLoading && id !== "",
  });
  const normalizedBusinessCode = businessCode.trim().toUpperCase();

  const uploadErrorMessage = (error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("FILE_TARGET_TYPE / PRODUCT")) {
      return "백엔드 공통코드(FILE_TARGET_TYPE/PRODUCT) 미반영 상태입니다. 시드 반영 후 다시 시도해 주세요.";
    }
    if (message.includes("401") || message.toLowerCase().includes("unauthorized")) {
      return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
    }
    return message || "첨부파일 처리에 실패했습니다.";
  };

  useEffect(() => {
    if (!existing) return;
    queueMicrotask(() => {
      setBusinessCode(String(existing.businessCode ?? "").trim().toUpperCase());
      setBusinessName(existing.businessName ?? "");
      setProductName(existing.productName ?? "");
      setProductType(existing.productType ?? "ENGINE");
      setArrayType(existing.arrayType ?? "");
      setArrayCustomText(existing.arrayCustomText ?? "");
      setArrayWidth(existing.arrayWidth != null ? String(existing.arrayWidth) : "");
      setArrayHeight(existing.arrayHeight != null ? String(existing.arrayHeight) : "");
      setPixelPitch(
        existing.pixelPitch != null && Number.isFinite(Number(existing.pixelPitch))
          ? String(Math.trunc(Number(existing.pixelPitch)))
          : ""
      );
      setDescription(existing.description ?? "");
      setIsActive(existing.isActive !== false);
      setVerifiedBusinessCode(String(existing.businessCode ?? "").trim().toUpperCase());
    });
  }, [existing]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(id, accessToken as string, {
        businessCode: normalizedBusinessCode,
        businessName: businessName.trim(),
        productName: productName.trim(),
        productType,
        arrayType: arrayType as "QVGA" | "VGA" | "SXGA" | "CUSTOM",
        arrayCustomText: arrayType === "CUSTOM" ? arrayCustomText.trim() || null : null,
        arrayWidth: Number(arrayWidth),
        arrayHeight: Number(arrayHeight),
        pixelPitch: Number(pixelPitch),
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
  const createMutation = useMutation({
    mutationFn: () =>
      createProduct(accessToken as string, {
        businessCode: normalizedBusinessCode,
        businessName: businessName.trim(),
        productName: productName.trim(),
        productType,
        arrayType: arrayType as "QVGA" | "VGA" | "SXGA" | "CUSTOM",
        arrayCustomText: arrayType === "CUSTOM" ? arrayCustomText.trim() || null : null,
        arrayWidth: Number(arrayWidth),
        arrayHeight: Number(arrayHeight),
        pixelPitch: Number(pixelPitch),
        description: description.trim() || null,
        isActive,
      }),
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      if (pendingFilesForCreate.length > 0) {
        try {
          await uploadProductFiles(
            String(created.id),
            pendingFilesForCreate,
            accessToken as string
          );
        } catch (error) {
          toast.error(uploadErrorMessage(error));
        }
      }
      toast.success("제품을 등록했습니다.");
      navigate(`/products/${created.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });
  const fileUploadMutation = useMutation({
    mutationFn: (selectedFiles: File[]) =>
      uploadProductFiles(id, selectedFiles, accessToken as string),
    onSuccess: (uploaded) => {
      queryClient.invalidateQueries({ queryKey: ["productFiles", id] });
      toast.success(`첨부파일 ${uploaded.length}건을 업로드했습니다.`);
    },
    onError: (error: Error) => toast.error(uploadErrorMessage(error)),
  });
  const fileDeleteMutation = useMutation({
    mutationFn: (fileLinkId: number) =>
      deleteProductFile(id, fileLinkId, accessToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["productFiles", id] });
      toast.success("첨부파일을 삭제했습니다.");
    },
    onError: (error: Error) => toast.error(uploadErrorMessage(error)),
  });
  const businessCodeCheckMutation = useMutation({
    mutationFn: () =>
      checkProductBusinessCode(
        accessToken as string,
        normalizedBusinessCode,
        isNew ? undefined : id
      ),
    onSuccess: (result) => {
      if (!result.available) {
        setVerifiedBusinessCode("");
        toast.error("이미 사용 중인 사업코드입니다.");
        return;
      }
      setVerifiedBusinessCode(result.businessCode);
      toast.success("사용 가능한 사업코드입니다.");
    },
    onError: (error: Error) =>
      toast.error(error.message || "사업코드 중복 확인에 실패했습니다."),
  });
  const openDeleteConfirm = (fileLinkId: number) => {
    setDeleteTargetFileId(fileLinkId);
  };
  const closeDeleteConfirm = () => {
    if (fileDeleteMutation.isPending) return;
    setDeleteTargetFileId(null);
  };
  const confirmDeleteFile = () => {
    if (deleteTargetFileId == null) return;
    fileDeleteMutation.mutate(deleteTargetFileId, {
      onSettled: () => setDeleteTargetFileId(null),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !validateRequiredFields(
        [
          { value: normalizedBusinessCode, message: "사업코드를 입력하세요." },
          { value: businessName, message: "사업명을 입력하세요." },
          { value: productName, message: "제품명을 입력하세요." },
          { value: arrayType, message: "배열 타입을 선택하세요." },
        ],
        toast.error
      )
    ) {
      return;
    }
    if (!arrayWidth.trim() || Number(arrayWidth) <= 0) {
      toast.error("Array Width는 0보다 커야 합니다.");
      return;
    }
    if (!arrayHeight.trim() || Number(arrayHeight) <= 0) {
      toast.error("Array Height는 0보다 커야 합니다.");
      return;
    }
    if (!pixelPitch.trim() || Number(pixelPitch) <= 0) {
      toast.error("Pixel Pitch는 0보다 커야 합니다.");
      return;
    }
    if (!BUSINESS_CODE_REGEX.test(normalizedBusinessCode)) {
      toast.error("사업코드는 영문 대문자 1~2자리만 입력하세요. (예: A, ZZ)");
      return;
    }
    if (verifiedBusinessCode !== normalizedBusinessCode) {
      toast.error("사업코드 중복 확인을 완료해 주세요.");
      return;
    }
    if (isNew) {
      createMutation.mutate();
      return;
    }
    updateMutation.mutate();
  };

  const handleArrayTypeChange = (next: "QVGA" | "VGA" | "SXGA" | "CUSTOM" | "") => {
    setArrayType(next);
    if (!next) return;
    if (next === "CUSTOM") return;
    const preset = ARRAY_TYPE_PRESET[next];
    setArrayWidth(preset.width);
    setArrayHeight(preset.height);
  };
  const handleDuplicateCheckClick = () => {
    businessCodeCheckMutation.mutate();
  };

  if (!isNew && !id) {
    return (
      <DetailPageState
        title="제품 수정"
        description="제품 마스터"
        pageTitle="제품 수정"
        invalidMessage="잘못된 제품 ID입니다."
      />
    );
  }

  if (isAuthLoading || (!isNew && isLoadLoading)) {
    return (
      <DetailPageState
        title="제품 수정"
        description="제품 마스터"
        pageTitle="제품 수정"
        loadingMessage="불러오는 중..."
      />
    );
  }

  if (!isNew && loadError) {
    return (
      <DetailPageState
        title="제품 수정"
        description="제품 마스터"
        pageTitle="제품 수정"
        errorMessage={
          loadError instanceof Error
            ? loadError.message
            : "제품을 불러오지 못했습니다."
        }
      />
    );
  }

  const pending = updateMutation.isPending || createMutation.isPending;

  return (
    <>
      <PageMeta title={isNew ? "제품 등록" : "제품 수정"} description="대표 제품 마스터" />
      <PageBreadcrumb pageTitle={isNew ? "제품 등록" : "제품 수정"} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <ComponentCard
          title={isNew ? "제품 등록" : "제품 수정"}
          desc={isNew ? "제품 주요 속성(유형/어레이/픽셀피치)을 등록합니다." : "제품 주요 속성(유형/어레이/픽셀피치)을 수정합니다."}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <FormField
                id="product-business-code"
                label="사업코드"
                required
                reserveHelpSpace
                control={
                  <div className="mt-1.5 flex w-full rounded-lg shadow-theme-xs">
                    <div className="min-w-0 flex-1">
                      <Input
                        id="product-business-code"
                        value={businessCode}
                        onChange={(e) => {
                          setBusinessCode(
                            e.target.value
                              .toUpperCase()
                              .replace(/[^A-Z]/g, "")
                              .slice(0, 2)
                          );
                          setVerifiedBusinessCode("");
                        }}
                        placeholder="예: A, ZZ"
                        maxLength={2}
                        className="rounded-r-none shadow-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDuplicateCheckClick}
                      disabled={
                        !BUSINESS_CODE_REGEX.test(normalizedBusinessCode) ||
                        businessCodeCheckMutation.isPending
                      }
                      className="inline-flex h-11 items-center rounded-r-lg border border-gray-300 border-l-0 px-3 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-700"
                    >
                      {businessCodeCheckMutation.isPending ? "확인 중..." : "중복 확인"}
                    </button>
                  </div>
                }
                helpText={
                  verifiedBusinessCode === normalizedBusinessCode
                    ? "중복 확인이 완료되었습니다."
                    : "우측 버튼으로 중복 확인을 진행합니다."
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                label="사업명"
                required
                reserveHelpSpace
                control={
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                }
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <FormField
                label="제품명"
                required
                reserveHelpSpace
                control={
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="표시 이름"
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="product-edit-type"
                label="제품 유형"
                required
                reserveHelpSpace
                control={
                  <Select
                    id="product-edit-type"
                    value={productType}
                    onChange={(v) => setProductType(v as "ENGINE" | "CAMERA")}
                    options={[{ value: "ENGINE", label: "ENGINE" }, { value: "CAMERA", label: "CAMERA" }]}
                    size="md"
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="product-edit-pixel-pitch"
                label="Pixel Pitch"
                required
                reserveHelpSpace
                controlMarginClassName=""
                control={
                  <InputAddonField
                    id="product-edit-pixel-pitch"
                    value={pixelPitch}
                    onChange={(value) => setPixelPitch(normalizeNumberLike(value))}
                    placeholder="예: 14"
                    addon="µm"
                    addonPlacement="outside-right"
                    addonAriaLabel="pixel pitch unit"
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="product-edit-arrayType"
                label="배열 타입"
                required
                reserveHelpSpace
                control={
                  <Select
                    id="product-edit-arrayType"
                    value={arrayType}
                    onChange={(v) =>
                      handleArrayTypeChange(v as "QVGA" | "VGA" | "SXGA" | "CUSTOM" | "")
                    }
                    options={[{ value: "", label: "배열 타입 선택" }, { value: "QVGA", label: "QVGA" }, { value: "VGA", label: "VGA" }, { value: "SXGA", label: "SXGA" }, { value: "CUSTOM", label: "CUSTOM" }]}
                    size="md"
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                label="배열수"
                required
                reserveHelpSpace
                control={
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <Input
                      value={arrayWidth}
                      onChange={(e) => setArrayWidth(e.target.value.replace(/\D/g, ""))}
                      placeholder="가로"
                      className="w-full"
                    />
                    <span className="px-1 text-base font-semibold text-gray-500 dark:text-gray-400">
                      ×
                    </span>
                    <Input
                      value={arrayHeight}
                      onChange={(e) => setArrayHeight(e.target.value.replace(/\D/g, ""))}
                      placeholder="세로"
                      className="w-full"
                    />
                  </div>
                }
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
              <FormField
                label="설명"
                reserveHelpSpace
                control={
                  <TextArea
                    value={description}
                    onChange={(v) => setDescription(v)}
                    rows={3}
                    className=""
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
                      onError={toast.error}
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
                      제품 수정 화면의 첨부파일 업로드/삭제는 저장 버튼과 별개로 즉시 반영됩니다.
                    </p>
                    <FileUploadDropzone
                      onSelectFiles={(selected) => fileUploadMutation.mutate(selected)}
                      onError={toast.error}
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
                                  onClick={() => openDeleteConfirm(Number(f.id))}
                                  disabled={fileDeleteMutation.isPending}
                                  title="첨부파일 삭제"
                                  aria-label="첨부파일 삭제"
                                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-error-600 transition-colors hover:bg-error-50 disabled:pointer-events-none disabled:opacity-40 dark:text-error-400 dark:hover:bg-error-500/15"
                                >
                                  <TrashBinIcon className="h-3.5 w-3.5" aria-hidden />
                                </button>
                                <span className="shrink-0 text-gray-500">
                                  {formatAttachmentDateTime(
                                    f.createdAt ?? f.uploadedAt ?? ""
                                  )}
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
              <ActiveToggle
                id="product-active-toggle"
                checked={isActive}
                onChange={setIsActive}
              />
            </div>
          </div>
          <FormActionBar
            submitLabel={isNew ? "등록" : "저장"}
            isPending={pending}
            submitDisabled={!accessToken}
            cancelTo={isNew ? "/products" : `/products/${id}`}
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
          onClose={closeDeleteConfirm}
          onConfirm={confirmDeleteFile}
        />
      ) : null}
    </>
  );
}
