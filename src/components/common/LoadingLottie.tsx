import { useEffect, useState } from "react";
import Lottie from "lottie-react";

const DEFAULT_LOADING_URL = "/assets/loading.json";

export type LoadingLottieProps = {
  /** Lottie 애니메이션 JSON 객체. 지정 시 animationUrl보다 우선 */
  animationData?: object;
  /** public 폴더 기준 Lottie JSON 경로 (예: /assets/loading.json) */
  animationUrl?: string;
  /** 로딩 문구 */
  message?: string;
  /** 애니메이션 컨테이너 크기 (width/height) */
  size?: number;
  className?: string;
};

export default function LoadingLottie({
  animationData: animationDataProp,
  animationUrl = DEFAULT_LOADING_URL,
  message,
  size = 120,
  className = "",
}: LoadingLottieProps) {
  const [fetchedData, setFetchedData] = useState<object | null>(null);
  const [fetchError, setFetchError] = useState(false);

  const url = animationDataProp ? undefined : animationUrl;

  useEffect(() => {
    if (animationDataProp || !url) return;
    let cancelled = false;
    setFetchError(false);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load animation");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setFetchedData(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [animationDataProp, url]);

  const animationData = animationDataProp ?? fetchedData;

  if (fetchError) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${className}`}
        style={{ minHeight: size + 40 }}
      >
        <div
          className="animate-spin rounded-full border-2 border-gray-200 border-t-brand-500"
          style={{ width: size, height: size }}
        />
        {message && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        )}
      </div>
    );
  }

  if (!animationData) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 ${className}`}
        style={{ minHeight: size + 40 }}
      >
        <div
          className="animate-spin rounded-full border-2 border-gray-200 border-t-brand-500"
          style={{ width: size, height: size }}
        />
        {message && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      style={{ minHeight: size + 40 }}
    >
      <Lottie
        animationData={animationData}
        loop
        style={{ width: size, height: size }}
      />
      {message && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
}
