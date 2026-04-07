import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ListPageLoading from "../components/common/ListPageLoading";
import { getOrganizationTree, type OrganizationUnitNode } from "../api/organization";
import OrganizationTreeNode from "../components/organization/OrganizationTreeNode";
import { useAuth } from "../context/AuthContext";
import { COMMON_CODE_GROUP_ORG_TYPE } from "../api/commonCode";

export default function Organization() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const {
    data: tree = [],
    isLoading,
    error,
  } = useQuery<OrganizationUnitNode[]>({
    queryKey: ["organizationTree", Boolean(accessToken)],
    queryFn: () => getOrganizationTree(accessToken ?? undefined),
    enabled: !isAuthLoading,
  });

  const { data: orgTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_ORG_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const orgTypeLabels = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of orgTypeCodes) {
      if (c.isActive !== false) {
        m[c.code] = (c.name ?? "").trim() || c.code;
      }
    }
    return m;
  }, [orgTypeCodes]);

  return (
    <>
      <PageMeta title="조직도" description="조직도 페이지" />
      <PageBreadcrumb pageTitle="조직도" />
      <ComponentCard title="조직도">
        {isLoading && (
          <ListPageLoading message="조직도를 불러오는 중..." minHeight={300} />
        )}
        {error && (
          <div className="flex min-h-[300px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "조직도를 불러오지 못했습니다."}
            </p>
          </div>
        )}
        {!isLoading && !error && tree.length === 0 && (
          <div className="flex min-h-[300px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">표시할 조직이 없습니다.</p>
          </div>
        )}
        {!isLoading && !error && tree.length > 0 && (
          <div className="space-y-1 py-2">
            {tree.map((node) => (
              <OrganizationTreeNode
                key={node.id}
                node={node}
                orgTypeLabels={
                  Object.keys(orgTypeLabels).length ? orgTypeLabels : undefined
                }
              />
            ))}
          </div>
        )}
      </ComponentCard>
    </>
  );
}
