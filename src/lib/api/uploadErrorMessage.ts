export type UploadErrorMessageOptions = {
  defaultMessage?: string;
  /** FILE_TARGET_TYPE / {value} 미반영 시 안내 — 예: "PRODUCT", "LENS" */
  fileTargetType?: string;
};

/** 첨부파일 업로드/삭제 mutation 공통 오류 메시지 */
export function uploadErrorMessage(
  error: unknown,
  options?: UploadErrorMessageOptions
): string {
  const defaultMessage =
    options?.defaultMessage ?? "첨부파일 업로드에 실패했습니다.";
  const message = error instanceof Error ? error.message : "";

  if (
    options?.fileTargetType &&
    message.includes(`FILE_TARGET_TYPE / ${options.fileTargetType}`)
  ) {
    return `백엔드 공통코드(FILE_TARGET_TYPE/${options.fileTargetType}) 미반영 상태입니다. 시드 반영 후 다시 시도해 주세요.`;
  }
  if (
    message.includes("401") ||
    message.toLowerCase().includes("unauthorized")
  ) {
    return "로그인이 만료되었습니다. 다시 로그인해 주세요.";
  }
  if (message.includes("파일을 1개 이상 선택해 주세요")) {
    return "업로드할 파일을 먼저 선택해 주세요.";
  }
  return message || defaultMessage;
}
