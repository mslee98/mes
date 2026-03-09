export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function createApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  const errorPayload = await response.json().catch(() => ({}));
  const message =
    (errorPayload as { message?: string }).message ?? fallbackMessage;

  return new ApiError(response.status, message);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isForbiddenError(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 403;
}
