import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import AlertModal from "../components/common/AlertModal";
import { useGoBack } from "../hooks/useGoBack";
import { registerApiErrorHandler } from "../lib/queryClient";
import type { ApiError } from "../lib/api/apiError";

export default function ApiFeedbackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const goBack = useGoBack("/");
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
    goBack();
  }, [closeModal, goBack]);

  const handleGoHome = useCallback(() => {
    closeModal();
    navigate("/", { replace: true });
  }, [closeModal, navigate]);

  return (
    <>
      {children}
      <AlertModal
        isOpen={forbiddenError !== null}
        onClose={handleGoBack}
        title="접근 권한이 없습니다"
        message="권한이 없습니다. 관리자에게 문의하세요."
        illustration="warning"
        description={
          forbiddenError?.message &&
          forbiddenError.message !== "권한이 없습니다. 관리자에게 문의하세요."
            ? forbiddenError.message
            : undefined
        }
        actions={[
          { label: "돌아가기", onClick: handleGoBack, variant: "primary" },
          { label: "홈으로 이동", onClick: handleGoHome, variant: "secondary" },
        ]}
      />
    </>
  );
}
