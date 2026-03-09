import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError, isForbiddenError, type ApiError } from "./apiError";

type ApiErrorHandler = (error: ApiError) => void;

let apiErrorHandler: ApiErrorHandler | null = null;

export function registerApiErrorHandler(handler: ApiErrorHandler | null) {
  apiErrorHandler = handler;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isForbiddenError(error)) {
        apiErrorHandler?.(error);
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isForbiddenError(error)) {
        apiErrorHandler?.(error);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && (error.status === 401 || error.status === 403)) {
          return false;
        }

        return failureCount < 1;
      },
    },
  },
});
