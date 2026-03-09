import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Modal } from "../components/ui/modal";
import { registerApiErrorHandler } from "../lib/queryClient";
import type { ApiError } from "../lib/apiError";

export default function ApiFeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const [forbiddenError, setForbiddenError] = useState<ApiError | null>(null);

  const handleApiError = useCallback((error: ApiError) => {
    setForbiddenError(error);
  }, []);

  useEffect(() => {
    registerApiErrorHandler(handleApiError);

    return () => {
      registerApiErrorHandler(null);
    };
  }, [handleApiError]);

  const closeModal = useCallback(() => {
    setForbiddenError(null);
  }, []);

  const handleGoBack = useCallback(() => {
    closeModal();

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  }, [closeModal, navigate]);

  const handleGoHome = useCallback(() => {
    closeModal();
    navigate("/", { replace: true });
  }, [closeModal, navigate]);

  return (
    <>
      {children}
      <Modal
        isOpen={forbiddenError !== null}
        onClose={closeModal}
        className="mx-4 max-w-md p-6 sm:p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 8V12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 16H12.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            접근 권한이 없습니다
          </h3>
          <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
            권한이 없습니다. 관리자에게 문의하세요.
          </p>
          {forbiddenError?.message &&
            forbiddenError.message !== "권한이 없습니다. 관리자에게 문의하세요." && (
              <p className="mt-2 text-xs leading-5 text-gray-400 dark:text-gray-500">
                {forbiddenError.message}
              </p>
            )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
            >
              돌아가기
            </button>
            <button
              type="button"
              onClick={handleGoHome}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
