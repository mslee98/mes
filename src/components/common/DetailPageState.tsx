import PageBreadcrumb from "./PageBreadCrumb";
import PageMeta from "./PageMeta";
import LoadingLottie from "./LoadingLottie";

interface DetailPageStateProps {
  title: string;
  description: string;
  pageTitle: string;
  invalidMessage?: string;
  loadingMessage?: string;
  errorMessage?: string;
}

export default function DetailPageState({
  title,
  description,
  pageTitle,
  invalidMessage,
  loadingMessage,
  errorMessage,
}: DetailPageStateProps) {
  return (
    <>
      <PageMeta title={title} description={description} />
      <PageBreadcrumb pageTitle={pageTitle} />
      {invalidMessage ? (
        <p className="text-sm text-gray-500">{invalidMessage}</p>
      ) : null}
      {loadingMessage ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message={loadingMessage} />
        </div>
      ) : null}
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </>
  );
}
