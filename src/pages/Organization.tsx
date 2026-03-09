import { useQuery } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import { getOrganizationTree, type OrganizationUnitNode } from "../api/organization";
import OrganizationTreeNode from "../components/organization/OrganizationTreeNode";

export default function Organization() {
  const {
    data: tree = [],
    isLoading,
    error,
  } = useQuery<OrganizationUnitNode[]>({
    queryKey: ["organizationTree"],
    queryFn: getOrganizationTree,
  });

  return (
    <>
      <PageMeta title="조직도" description="조직도 페이지" />
      <PageBreadcrumb pageTitle="조직도" />
      <ComponentCard title="조직도">
        {isLoading && (
          <div className="flex items-center justify-center min-h-[300px] text-gray-500 dark:text-gray-400">
            <span className="text-sm">조직도를 불러오는 중...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center min-h-[300px]">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "조직도를 불러오지 못했습니다."}
            </p>
          </div>
        )}
        {!isLoading && !error && tree.length === 0 && (
          <div className="flex items-center justify-center min-h-[300px] text-gray-500 dark:text-gray-400">
            <p className="text-sm">표시할 조직이 없습니다.</p>
          </div>
        )}
        {!isLoading && !error && tree.length > 0 && (
          <div className="py-2 space-y-1">
            {tree.map((node) => (
              <OrganizationTreeNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </ComponentCard>
    </>
  );
}
