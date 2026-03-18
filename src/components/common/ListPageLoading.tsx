import LoadingLottie from "./LoadingLottie";

function SkeletonRow({ isFirst }: { isFirst?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${isFirst ? "pb-4" : "py-4"}`}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2.5 h-2.5 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="ml-4 h-2.5 w-12 shrink-0 rounded-full bg-gray-300 dark:bg-gray-600" />
    </div>
  );
}

export type ListPageLoadingProps = {
  /** 로딩 문구 */
  message: string;
  /** 스켈레톤 행 개수 (기본 5) */
  skeletonRows?: number;
  /** 최소 높이(px). 메뉴 등 큰 영역은 480 등으로 지정 (기본 320) */
  minHeight?: number;
};

/**
 * 목록 페이지 로딩: 스켈레톤 위에 Lottie 로더 오버레이
 */
export default function ListPageLoading({
  message,
  skeletonRows = 5,
  minHeight = 320,
}: ListPageLoadingProps) {
  return (
    <div className="relative w-full" style={{ minHeight }}>
      {/* 스켈레톤 (배경) */}
      <div
        role="status"
        className="w-full animate-pulse rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-800 md:p-6"
        aria-label="로딩 중"
      >
        <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
          {Array.from({ length: skeletonRows }, (_, i) => (
            <SkeletonRow key={i} isFirst={i === 0} />
          ))}
        </div>
        <span className="sr-only">Loading...</span>
      </div>

      {/* Lottie 로더 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[2px] dark:bg-gray-900/70">
        <LoadingLottie message={message} size={100} />
      </div>
    </div>
  );
}
