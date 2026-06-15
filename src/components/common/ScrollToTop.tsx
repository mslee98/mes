import { useEffect } from "react";
import { useLocation } from "react-router";

const APP_MAIN_SCROLL_SELECTOR = "[data-app-main-scroll]";

export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainScroll = document.querySelector<HTMLElement>(APP_MAIN_SCROLL_SELECTOR);
    if (mainScroll) {
      mainScroll.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
      return;
    }

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [pathname]);

  return null;
}
