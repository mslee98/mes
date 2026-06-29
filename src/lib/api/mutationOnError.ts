import { notify } from "../notify";
import { isForbiddenError } from "./apiError";

export type MutationErrorNotifyOptions = {
  forbiddenMessage?: string;
  fallbackMessage?: string;
};

/** mutation onError 공통 — 403이면 forbidden 메시지, 아니면 fallback 또는 Error.message */
export function mutationErrorNotify(
  error: unknown,
  options: MutationErrorNotifyOptions
): void {
  const forbiddenMessage =
    options.forbiddenMessage ?? "권한이 없습니다.";
  const fallbackMessage =
    options.fallbackMessage ?? "요청 처리에 실패했습니다.";

  if (notify.forbidden(error, forbiddenMessage)) {
    return;
  }
  if (error instanceof Error && error.message.trim()) {
    notify.error(error.message);
    return;
  }
  notify.error(fallbackMessage);
}

/** notify.forbidden만 필요할 때 */
export function isMutationForbidden(error: unknown): boolean {
  return isForbiddenError(error);
}
