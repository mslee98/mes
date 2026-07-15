import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";
import { useGoBack } from "./useGoBack";

/** 폼 이탈 가드 — dirty 시 라우터 이동·취소 버튼 모두 ConfirmLeaveModal로 확인 */
export function useConfirmLeave(isDirty: boolean, onLeave: () => void) {
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const leaveAfterConfirmRef = useRef(false);
  const allowNextNavigationRef = useRef(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !allowNextNavigationRef.current &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      leaveAfterConfirmRef.current = false;
      setLeaveModalOpen(true);
    }
  }, [blocker.state]);

  useEffect(() => {
    if (blocker.state === "unblocked") {
      allowNextNavigationRef.current = false;
    }
  }, [blocker.state]);

  const allowNextNavigation = useCallback(() => {
    allowNextNavigationRef.current = true;
  }, []);

  const onLeaveConfirm = useCallback(() => {
    setLeaveModalOpen(false);
    if (blocker.state === "blocked") {
      blocker.proceed();
      return;
    }
    if (leaveAfterConfirmRef.current) {
      leaveAfterConfirmRef.current = false;
      onLeave();
    }
  }, [blocker, onLeave]);

  const onLeaveCancel = useCallback(() => {
    setLeaveModalOpen(false);
    leaveAfterConfirmRef.current = false;
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  }, [blocker]);

  const requestLeave = useCallback(() => {
    if (!isDirty) {
      onLeave();
      return;
    }
    leaveAfterConfirmRef.current = true;
    setLeaveModalOpen(true);
  }, [isDirty, onLeave]);

  return {
    leaveModalOpen,
    onLeaveConfirm,
    onLeaveCancel,
    requestLeave,
    allowNextNavigation,
  };
}

/** `useConfirmLeave` + `useGoBack(fallback)` — 취소·브라우저 뒤로가기와 동일 스택 */
export function useConfirmLeaveWithGoBack(isDirty: boolean, fallback: string) {
  const goBack = useGoBack(fallback);
  return useConfirmLeave(isDirty, goBack);
}
