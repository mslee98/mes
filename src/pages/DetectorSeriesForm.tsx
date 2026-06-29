import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { mutationErrorNotify } from "../lib/api/mutationOnError";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ConfirmLeaveModal from "../components/common/ConfirmLeaveModal";
import ConfirmModal from "../components/common/ConfirmModal";
import DetailPageState from "../components/common/DetailPageState";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import { useAuth } from "../hooks/useAuth";
import { useConfirmLeave } from "../hooks/useConfirmLeave";
import { useProductPermissions } from "../hooks/useProductPermissions";
import {
  createDetectorSeries,
  deleteDetectorSeries,
  getDetectorSeriesList,
  updateDetectorSeries,
} from "../api/detectorSeries";

export default function DetectorSeriesForm() {
  const { seriesId } = useParams();
  const isNew = seriesId == null || seriesId === "new";
  const idNum = isNew ? NaN : Number(String(seriesId ?? "").trim());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canManageProducts } = useProductPermissions();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data: seriesList = [], isLoading: isListLoading } = useQuery({
    queryKey: ["detectorSeries", true],
    queryFn: () =>
      getDetectorSeriesList(accessToken as string, { includeInactive: true }),
    enabled: !isNew && !!accessToken && !isAuthLoading && Number.isFinite(idNum),
  });

  const existing = !isNew
    ? seriesList.find((s) => s.id === idNum)
    : undefined;

  const initialSnapshot = useMemo(() => {
    if (isNew) {
      return {
        code: "",
        name: "",
        description: "",
        sortOrder: "0",
        isActive: true,
      };
    }
    if (!existing) return null;
    return {
      code: existing.code ?? "",
      name: existing.name ?? "",
      description: existing.description ?? "",
      sortOrder: String(existing.sortOrder ?? 0),
      isActive: existing.isActive !== false,
    };
  }, [isNew, existing]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      initialSnapshot.code !== code ||
      initialSnapshot.name !== name ||
      initialSnapshot.description !== description ||
      initialSnapshot.sortOrder !== sortOrder ||
      initialSnapshot.isActive !== isActive
    );
  }, [initialSnapshot, code, name, description, sortOrder, isActive]);

  const { leaveModalOpen, onLeaveConfirm, onLeaveCancel, requestLeave } =
    useConfirmLeave(isDirty, () => navigate("/detectors"));

  useEffect(() => {
    if (!existing) return;
    setCode(existing.code ?? "");
    setName(existing.name ?? "");
    setDescription(existing.description ?? "");
    setSortOrder(String(existing.sortOrder ?? 0));
    setIsActive(existing.isActive !== false);
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const sortParsed = Number.parseInt(sortOrder, 10);
      const sort =
        Number.isFinite(sortParsed) && sortParsed >= 0 ? sortParsed : 0;
      if (isNew) {
        return createDetectorSeries(accessToken as string, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          sortOrder: sort,
          isActive,
        });
      }
      return updateDetectorSeries(accessToken as string, idNum, {
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        sortOrder: sort,
        isActive,
      });
    },
    onSuccess: (saved) => {
      notify.success(isNew ? "시리즈를 등록했습니다." : "시리즈를 저장했습니다.");
      queryClient.invalidateQueries({ queryKey: ["detectorSeries"] });
      if (isNew) {
        navigate("/detectors", { replace: true });
        return;
      }
      navigate(`/detector-series/${saved.id}/edit`, { replace: true });
    },
    onError: (e) =>
      mutationErrorNotify(e, {
        forbiddenMessage: isNew
          ? "검출기 시리즈 등록 권한이 없습니다."
          : "검출기 시리즈 수정 권한이 없습니다.",
        fallbackMessage: "저장에 실패했습니다.",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDetectorSeries(accessToken as string, idNum),
    onSuccess: () => {
      notify.success("시리즈와 소속 검출기가 삭제되었습니다.");
      void queryClient.invalidateQueries({ queryKey: ["detectorSeries"] });
      void queryClient.invalidateQueries({ queryKey: ["detectors"] });
      setDeleteOpen(false);
      navigate("/detectors");
    },
    onError: (e) =>
      mutationErrorNotify(e, {
        forbiddenMessage: "검출기 시리즈 삭제 권한이 없습니다.",
        fallbackMessage: "시리즈를 삭제하지 못했습니다.",
      }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProducts) {
      notify.error("제품 관리 권한(product.manage)이 없습니다.");
      return;
    }
    if (!code.trim() || !name.trim()) {
      notify.error("코드와 이름은 필수입니다.");
      return;
    }
    saveMutation.mutate();
  };

  const pending = saveMutation.isPending || deleteMutation.isPending;
  const loadError = !isNew && !isListLoading && !existing && Number.isFinite(idNum);

  if (!canManageProducts) {
    return (
      <DetailPageState
        title="검출기 시리즈"
        description="검출기 시리즈 마스터"
        pageTitle="검출기 시리즈"
        invalidMessage="제품 관리 권한(product.manage)이 필요합니다."
      />
    );
  }

  if (loadError) {
    return (
      <DetailPageState
        title="검출기 시리즈 수정"
        description="검출기 시리즈 마스터"
        pageTitle="검출기 시리즈 수정"
        invalidMessage="시리즈를 찾을 수 없습니다. 목록에서 다시 선택해 주세요."
      />
    );
  }

  const seriesTitleForDelete =
    existing?.name?.trim() ||
    existing?.code?.trim() ||
    (Number.isFinite(idNum) ? `#${idNum}` : "이 시리즈");

  const deleteConfirmMessage = `시리즈「${seriesTitleForDelete}」을(를) 삭제합니다. 이 시리즈에 속한 검출기는 데이터베이스 규칙에 따라 함께 삭제됩니다. 생산 계획 또는 제품 시리얼에 연결된 검출기가 하나라도 있으면 삭제되지 않습니다. 삭제 후에는 복구할 수 없습니다. 계속할까요?`;

  return (
    <>
      <PageMeta
        title={isNew ? "검출기 시리즈 등록" : "검출기 시리즈 수정"}
        description="검출기 시리즈"
      />
      <PageBreadcrumb
        pageTitle={isNew ? "시리즈 등록" : "시리즈 수정"}
      />
      <form onSubmit={handleSubmit}>
        <ComponentCard
          title={isNew ? "시리즈 등록" : "시리즈 수정"}
          headerEnd={
            !isNew ? (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={pending || isListLoading || !accessToken}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                시리즈 삭제
              </button>
            ) : null
          }
        >
          {isListLoading && !isNew ? (
            <p className="text-sm text-gray-500">불러오는 중…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="series-code">코드 *</Label>
                <Input
                  id="series-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="예: HD_SERIES_A"
                />
              </div>
              <div>
                <Label htmlFor="series-name">이름 *</Label>
                <Input
                  id="series-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="표시 이름"
                />
              </div>
              <div>
                <Label htmlFor="series-sort">정렬 순서</Label>
                <Input
                  id="series-sort"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="series-desc">설명</Label>
                <TextArea
                  id="series-desc"
                  rows={3}
                  value={description}
                  onChange={setDescription}
                  placeholder="선택 사항"
                />
              </div>
              <div className="sm:col-span-2 flex items-center pt-1">
                <Toggle
                  id="series-active"
                  checked={isActive}
                  onChange={setIsActive}
                />
              </div>
            </div>
          )}
          <FormActionBar
            submitLabel={isNew ? "등록" : "저장"}
            isPending={saveMutation.isPending}
            submitDisabled={
              !accessToken || isListLoading || deleteMutation.isPending
            }
            onCancel={requestLeave}
          />
        </ComponentCard>
      </form>

      {!isNew ? (
        <ConfirmModal
          isOpen={deleteOpen}
          title="검출기 시리즈 삭제"
          message={deleteConfirmMessage}
          confirmText="삭제"
          confirmVariant="danger"
          illustration="trash"
          isConfirming={deleteMutation.isPending}
          onClose={() => {
            if (!deleteMutation.isPending) setDeleteOpen(false);
          }}
          onConfirm={() => deleteMutation.mutate()}
        />
      ) : null}

      <ConfirmLeaveModal
        isOpen={leaveModalOpen}
        onClose={onLeaveCancel}
        onConfirm={onLeaveConfirm}
      />
    </>
  );
}
