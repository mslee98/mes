import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCommonCodeGroups,
  getCommonCodesByGroup,
  type CommonCodeGroup,
  type CommonCodeItem,
} from "../api/commonCode";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Input from "../components/form/input/InputField";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../hooks/useAuth";

const EMPTY_GROUPS: CommonCodeGroup[] = [];
const EMPTY_CODES: CommonCodeItem[] = [];

function containsKeyword(value: string, keyword: string) {
  return value.toLowerCase().includes(keyword);
}

export default function CommonCode() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [groupKeyword, setGroupKeyword] = useState("");
  const [codeKeyword, setCodeKeyword] = useState("");
  const [selectedGroupCode, setSelectedGroupCode] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["commonCodeGroups"],
    queryFn: () => getCommonCodeGroups(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });

  const groups = data ?? EMPTY_GROUPS;
  const filteredGroups = useMemo(() => {
    const keyword = groupKeyword.trim().toLowerCase();

    if (!keyword) {
      return groups;
    }

    return groups.filter((group) =>
      [group.name, group.code, group.description].some((value) =>
        containsKeyword(value, keyword)
      )
    );
  }, [groupKeyword, groups]);

  useEffect(() => {
    if (filteredGroups.length === 0) {
      setSelectedGroupCode(null);
      return;
    }

    if (
      selectedGroupCode == null ||
      !filteredGroups.some((group) => group.code === selectedGroupCode)
    ) {
      setSelectedGroupCode(filteredGroups[0].code);
    }
  }, [filteredGroups, selectedGroupCode]);

  useEffect(() => {
    setCodeKeyword("");
  }, [selectedGroupCode]);

  const selectedGroup =
    filteredGroups.find((group) => group.code === selectedGroupCode) ?? null;

  const {
    data: codesData,
    isLoading: isCodesLoading,
    error: codesError,
  } = useQuery({
    queryKey: ["commonCodeGroups", selectedGroupCode, "codes"],
    queryFn: () => getCommonCodesByGroup(selectedGroupCode as string, accessToken as string),
    enabled: !!selectedGroupCode && !!accessToken && !isAuthLoading,
  });

  const codes = codesData ?? EMPTY_CODES;
  const filteredCodes = useMemo(() => {
    const keyword = codeKeyword.trim().toLowerCase();

    if (!keyword) {
      return codes;
    }

    return codes.filter((code) =>
      [code.name, code.code, code.description].some((value) =>
        containsKeyword(value, keyword)
      )
    );
  }, [codeKeyword, codes]);

  return (
    <>
      <PageMeta title="공통 코드 관리" description="공통 코드 관리 페이지" />
      <PageBreadcrumb pageTitle="공통 코드 관리" />

      <div className="space-y-6">
        <ComponentCard
          title="공통 코드 관리"
          desc="드롭다운, 라디오 버튼, 필터 조건처럼 여러 화면에서 반복 사용하는 선택값을 그룹과 코드 기준으로 조회합니다."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="활성 그룹 수" value={groups.length} />
            <SummaryCard
              label="선택 그룹 코드 수"
              value={selectedGroup ? codes.length : 0}
            />
            <SummaryCard
              label="조회 기준"
              value="활성 그룹/코드"
            />
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            현재 조회 API는 활성 상태인 공통 코드 그룹과 코드만 반환합니다.
          </div>
        </ComponentCard>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
          <ComponentCard
            title="코드 그룹"
            desc="그룹을 선택하면 오른쪽에서 해당 그룹의 활성 코드 목록을 확인할 수 있습니다."
          >
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="그룹 이름, 코드, 설명 검색"
                value={groupKeyword}
                onChange={(event) => setGroupKeyword(event.target.value)}
              />

              {isAuthLoading || isLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <LoadingLottie message="공통 코드 그룹을 불러오는 중..." />
                </div>
              ) : !accessToken ? (
                <EmptyState message="로그인 후 공통 코드 그룹을 조회할 수 있습니다." />
              ) : error ? (
                <ErrorState
                  message={
                    error instanceof Error
                      ? error.message
                      : "공통 코드 그룹을 불러오지 못했습니다."
                  }
                />
              ) : filteredGroups.length === 0 ? (
                <EmptyState message="조건에 맞는 공통 코드 그룹이 없습니다." />
              ) : (
                <div className="space-y-2">
                  {filteredGroups.map((group) => {
                    const isSelected = group.code === selectedGroupCode;

                    return (
                      <button
                        key={group.code}
                        type="button"
                        onClick={() => setSelectedGroupCode(group.code)}
                        className={`w-full rounded-xl border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-brand-300 bg-brand-50 dark:border-brand-500/40 dark:bg-brand-500/10"
                            : "border-gray-200 hover:border-brand-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-brand-500/30 dark:hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                              {group.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <code>{group.code}</code>
                            </p>
                          </div>
                          <Badge
                            size="sm"
                            color={group.isActive ? "success" : "error"}
                          >
                            {group.isActive ? "활성" : "비활성"}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                          {group.description || "설명 없음"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ComponentCard>

          <ComponentCard
            title={selectedGroup ? `${selectedGroup.name} 코드 목록` : "코드 목록"}
            desc={
              selectedGroup
                ? selectedGroup.description || "선택한 그룹의 활성 코드 목록입니다."
                : "왼쪽에서 코드 그룹을 선택해주세요."
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge size="sm" color="primary">
                    {selectedGroup?.code ?? "GROUP_CODE"}
                  </Badge>
                  {selectedGroup && (
                    <Badge
                      size="sm"
                      color={selectedGroup.isActive ? "success" : "error"}
                    >
                      {selectedGroup.isActive ? "활성" : "비활성"}
                    </Badge>
                  )}
                </div>
                <div className="w-full md:max-w-sm">
                  <Input
                    type="text"
                    placeholder="코드 값, 이름, 설명 검색"
                    value={codeKeyword}
                    onChange={(event) => setCodeKeyword(event.target.value)}
                    disabled={!selectedGroup}
                  />
                </div>
              </div>

              {!selectedGroup ? (
                <EmptyState message="조회할 공통 코드 그룹을 선택해주세요." />
              ) : isCodesLoading ? (
                <div className="flex min-h-[240px] items-center justify-center">
                  <LoadingLottie message="공통 코드 목록을 불러오는 중..." />
                </div>
              ) : codesError ? (
                <ErrorState
                  message={
                    codesError instanceof Error
                      ? codesError.message
                      : "공통 코드 목록을 불러오지 못했습니다."
                  }
                />
              ) : filteredCodes.length === 0 ? (
                <EmptyState message="조건에 맞는 공통 코드가 없습니다." />
              ) : (
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                    <TableRow>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        코드
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        이름
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        설명
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        정렬
                      </TableCell>
                      <TableCell
                        isHeader
                        className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        상태
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                    {filteredCodes.map((code) => (
                      <TableRow key={`${code.groupCode}-${code.code}`}>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          <code>{code.code}</code>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                          {code.name}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {code.description || "-"}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {code.sortOrder}
                        </TableCell>
                        <TableCell className="px-5 py-4 text-sm">
                          <Badge
                            size="sm"
                            color={code.isActive ? "success" : "error"}
                          >
                            {code.isActive ? "활성" : "비활성"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ComponentCard>
        </div>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center text-gray-500 dark:text-gray-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
    </div>
  );
}
