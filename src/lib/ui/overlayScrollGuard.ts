export const APP_MAIN_SCROLL_SELECTOR = "[data-app-main-scroll]";

let guardCount = 0;
let detachListeners: (() => void) | null = null;

const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

const OVERLAY_ROOT_SELECTOR = ".modal, [data-overlay-root]";

function isEventInsideOverlay(event: Event): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(OVERLAY_ROOT_SELECTOR));
}

function preventWheelAndTouch(event: Event) {
  if (isEventInsideOverlay(event)) return;
  event.preventDefault();
}

function preventScrollKeys(event: KeyboardEvent) {
  if (!SCROLL_KEYS.has(event.key)) return;
  event.preventDefault();
}

/**
 * 오버레이(Modal·Drawer) 열릴 때 배경 스크롤만 막습니다.
 *
 * `overflow: hidden`은 [data-app-main-scroll]의 스크롤바를 제거해
 * `mx-auto` 중앙 정렬 콘텐츠(카드 등)가 우측으로 밀리므로 사용하지 않습니다.
 */
export function guardAppScroll(): void {
  guardCount += 1;
  if (guardCount > 1) return;

  const mainScroll = document.querySelector<HTMLElement>(APP_MAIN_SCROLL_SELECTOR);
  if (!mainScroll) return;

  mainScroll.addEventListener("wheel", preventWheelAndTouch, { passive: false });
  mainScroll.addEventListener("touchmove", preventWheelAndTouch, { passive: false });
  document.addEventListener("keydown", preventScrollKeys);

  detachListeners = () => {
    mainScroll.removeEventListener("wheel", preventWheelAndTouch);
    mainScroll.removeEventListener("touchmove", preventWheelAndTouch);
    document.removeEventListener("keydown", preventScrollKeys);
  };
}

export function releaseAppScrollGuard(): void {
  guardCount = Math.max(0, guardCount - 1);
  if (guardCount > 0) return;

  detachListeners?.();
  detachListeners = null;
}
