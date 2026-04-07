import toast from "react-hot-toast";
import { isForbiddenError } from "./apiError";

/** 403이면 토스트 후 true */
export function showForbiddenToast(error: unknown, message: string): boolean {
  if (isForbiddenError(error)) {
    toast.error(message);
    return true;
  }
  return false;
}
