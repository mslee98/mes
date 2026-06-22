import type { Hook } from "flatpickr/dist/types/options";
import type { Instance } from "flatpickr/dist/types/instance";

const FLATPICKR_OVERLAY_Z_INDEX = "99999";

function repositionCalendar(instance: Instance): void {
  (instance as Instance & { _positionCalendar?: () => void })._positionCalendar?.();
}

export function applyFlatpickrOverlayZIndex(instance: Instance): void {
  instance.calendarContainer?.style.setProperty(
    "z-index",
    FLATPICKR_OVERLAY_Z_INDEX,
    "important"
  );
}

/** 스크롤·리사이즈 시 달력 위치 재계산 (모달·검색 패널 대응) */
export function bindFlatpickrRepositionOnScroll(instance: Instance): () => void {
  const onReposition = () => repositionCalendar(instance);
  window.addEventListener("scroll", onReposition, true);
  window.addEventListener("resize", onReposition);
  return () => {
    window.removeEventListener("scroll", onReposition, true);
    window.removeEventListener("resize", onReposition);
  };
}

export function createFlatpickrOverlayHooks(): {
  onReady: Hook;
  onOpen: Hook;
  onClose: Hook;
} {
  let unbindReposition: (() => void) | null = null;

  return {
    onReady: (_dates, _str, instance) => {
      applyFlatpickrOverlayZIndex(instance);
    },
    onOpen: (_dates, _str, instance) => {
      applyFlatpickrOverlayZIndex(instance);
      unbindReposition?.();
      unbindReposition = bindFlatpickrRepositionOnScroll(instance);
    },
    onClose: () => {
      unbindReposition?.();
      unbindReposition = null;
    },
  };
}
