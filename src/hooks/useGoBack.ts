import { useCallback } from "react";
import { useNavigate } from "react-router";

/**
 * 브라우저 히스토리와 동기화된 뒤로가기.
 * - 스택에 이전 항목이 있으면 `navigate(-1)` (브라우저 뒤로가기와 동일)
 * - 직접 URL 진입·새 탭 등이면 `fallback`으로 이동
 */
export function useGoBack(fallback = "/") {
  const navigate = useNavigate();

  return useCallback(() => {
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}

export default useGoBack;
