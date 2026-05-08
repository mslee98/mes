import { notify } from "./notify";

/** 403이면 토스트 후 true */
export function showForbiddenToast(error: unknown, message: string): boolean {
  return notify.forbidden(error, message);
}
