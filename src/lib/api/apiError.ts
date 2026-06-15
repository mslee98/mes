export type ApiErrorDetail = {
  unitId?: string;
  unitCode?: string;
  reason?: string;
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: ApiErrorDetail[];

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: ApiErrorDetail[] }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export async function createApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  const errorPayload = await response.json().catch(() => ({}));
  const body = errorPayload as {
    message?: string;
    reason?: string;
    code?: string;
    details?: ApiErrorDetail[];
  };
  const message = body.message ?? body.reason ?? fallbackMessage;

  return new ApiError(response.status, message, {
    code: body.code,
    details: Array.isArray(body.details) ? body.details : undefined,
  });
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isForbiddenError(error: unknown): error is ApiError {
  return isApiError(error) && error.status === 403;
}
