import { useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { ReactComponent as ArrowDownOnSquareIcon } from "../../icons/arrow-down-on-square.svg?react";

type FileUploadDropzoneProps = {
  onSelectFile: (file: File) => void;
  onError?: (message: string) => void;
  accept?: string;
  disabled?: boolean;
  maxFileSizeMb?: number;
  buttonLabel?: string;
  uploadGuideText?: string;
  className?: string;
};

export default function FileUploadDropzone({
  onSelectFile,
  onError,
  accept,
  disabled = false,
  maxFileSizeMb = 30,
  buttonLabel = "파일 선택",
  uploadGuideText = "아래 버튼을 눌러 파일을 업로드하세요.",
  className = "",
}: FileUploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleOpenFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleSelectedFile = (file: File | null | undefined) => {
    if (!file) return;

    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      onError?.(`파일 크기는 최대 ${maxFileSizeMb}MB까지 업로드할 수 있습니다.`);
      return;
    }

    onSelectFile(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    handleSelectedFile(file);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    handleSelectedFile(file);
  };

  return (
    <div className={`flex w-full items-center justify-center ${className}`}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex h-52 w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-4 transition-colors ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
            : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <ArrowDownOnSquareIcon
            className="mb-3 h-8 w-8 text-gray-500 dark:text-gray-400"
            aria-hidden
          />
          <p className="mb-1 text-sm text-gray-700 dark:text-gray-300">
            {uploadGuideText}
          </p>
          <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
            최대 파일 크기: <span className="font-semibold">{maxFileSizeMb}MB</span>
          </p>

          <button
            type="button"
            onClick={handleOpenFileDialog}
            disabled={disabled}
            className="inline-flex items-center rounded-lg border border-transparent bg-brand-500 px-3 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        </div>
      </div>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
}
