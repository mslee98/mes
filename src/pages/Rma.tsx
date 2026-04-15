import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";

export default function Rma() {
  return (
    <>
      <PageMeta title="RMA" description="반품·교환·수리 요청" />
      <PageBreadcrumb pageTitle="RMA" />
      <ComponentCard title="RMA" desc="백엔드 메뉴 시드에 맞춘 화면입니다. API 연동은 이후 단계에서 추가하세요.">
        <p className="text-theme-sm text-gray-600 dark:text-gray-300">
          이 페이지는 라우트 <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">/rma</code>와 메뉴
          코드 <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">RMA</code>에 대응합니다.
        </p>
      </ComponentCard>
    </>
  );
}
