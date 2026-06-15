import toast from "react-hot-toast";
import { isForbiddenError } from "./api/apiError";

export const notify = {
  success(message: string) {
    toast.success(message);
  },
  error(message: string) {
    toast.error(message);
  },
  forbidden(error: unknown, message: string): boolean {
    if (isForbiddenError(error)) {
      toast.error(message);
      return true;
    }
    return false;
  },
};
