import { useState } from "react";
import toast from "react-hot-toast";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import { DangerSoftTag } from "../../components/ui/tag/DangerSoftTag";
import Button from "../../components/ui/button/Button";
import Label from "../../components/form/Label";
import { ListIcon, PencilIcon, PlusIcon } from "../../icons";
import { BUTTON_ACTION_ROLE_GUIDE, buttonClassName } from "../../lib/ui/buttonStyles";
import IconTooltip from "../../components/ui/tooltip/IconTooltip";
import ButtonTooltip from "../../components/ui/tooltip/ButtonTooltip";
import { Modal } from "../../components/ui/modal";
import InfoActionPopover from "../../components/common/InfoActionPopover";
import { DetectorTypeGuidePopover } from "../../components/common/DetectorTypeGuidePopover";
import { ProductionPlanOrderReference } from "../../components/order/ProductionPlanOrderReference";
import type { PurchaseOrderItem } from "../../api/purchaseOrder";

type UiPlaygroundGeneralTabProps = {
  supplierPreview: string[];
  isPartnerQueryLoading: boolean;
  partnerQueryError: Error | null;
  otherSuppliersCount: number;
};

export function UiPlaygroundGeneralTab({
  supplierPreview,
  isPartnerQueryLoading,
  partnerQueryError,
  otherSuppliersCount,
}: UiPlaygroundGeneralTabProps) {
  const [modalDemoOpen, setModalDemoOpen] = useState(false);

  return (
    <div className="space-y-6">
      <ComponentCard
        title="General"
        desc="버튼·뱃지·모달·툴팁 등 폼·테이블을 제외한 공통 UI 패턴입니다."
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          폼 입력·검증 메시지는 <strong>Form</strong> 탭, 목록·아코디언 테이블은{" "}
          <strong>Table</strong> 탭을 참고하세요.
        </p>
      </ComponentCard>

      <ComponentCard title="Badge">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color="primary">Primary</Badge>
          <Badge color="success">Success</Badge>
          <Badge color="error">Error</Badge>
          <Badge color="warning">Warning</Badge>
          <Badge color="info">Info</Badge>
          <Badge variant="solid" color="dark">
            Solid
          </Badge>
        </div>
      </ComponentCard>

      <ComponentCard
        title="DangerSoftTag"
        desc="시맨틱 danger 소프트 — bg-danger-soft, text-fg-danger-strong. 지연 등 경고 라벨용."
      >
        <div className="flex flex-wrap items-center gap-2">
          <DangerSoftTag>Danger</DangerSoftTag>
          <DangerSoftTag>지연 3일</DangerSoftTag>
        </div>
      </ComponentCard>

      <ComponentCard
        title="Modal"
        desc="`header`에 제목·서브타이틀을 넣으면 좌측에 표시되고, 우측에 닫기(X)가 한 줄에 배치됩니다."
      >
        <Button type="button" size="sm" onClick={() => setModalDemoOpen(true)}>
          모달 예시 열기
        </Button>
        <Modal
          isOpen={modalDemoOpen}
          onClose={() => setModalDemoOpen(false)}
          className="mx-4 max-w-md p-6"
          header={
            <>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                공정 처리
              </h3>
              <p className="mt-1 text-theme-sm text-gray-600 dark:text-gray-400">
                헤더 아래 구분선 다음이 본문 영역입니다.
              </p>
            </>
          }
        >
          <p className="text-theme-sm text-gray-700 dark:text-gray-300">
            본문: 폼·타임라인 등 실제 콘텐츠를 이곳에 둡니다.
          </p>
        </Modal>
      </ComponentCard>

      <ComponentCard
        title="Button"
        desc="variant(solid|outline|ghost) × color. 화면당 핵심 CTA 1개만 solid brand."
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              기본 variant × color
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Solid brand</Button>
              <Button variant="outline">Outline neutral</Button>
              <Button variant="outlineBrand" size="xs">
                Outline brand
              </Button>
              <Button color="success" variant="outline" size="compact">
                Success outline
              </Button>
              <Button color="warning" variant="outline" size="compact">
                Warning outline
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              actionRole (상단 액션 바)
            </p>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <Button
                actionRole="navigate"
                size="compact"
                startIcon={<ListIcon className="size-4" aria-hidden />}
              >
                목록
              </Button>
              <Button actionRole="positive" size="compact">
                접수
              </Button>
              <Button
                actionRole="edit"
                size="compact"
                startIcon={<PencilIcon className="size-4" aria-hidden />}
              >
                발주 수정
              </Button>
              <Button
                actionRole="primary"
                size="compact"
                startIcon={<PlusIcon className="size-4" aria-hidden />}
              >
                생산계획 등록
              </Button>
            </div>
            <ul className="mt-3 space-y-1 text-theme-xs text-gray-600 dark:text-gray-300">
              {BUTTON_ACTION_ROLE_GUIDE.map((item) => (
                <li key={item.role}>
                  <strong>{item.label}</strong> — {item.description}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Link + buttonClassName
            </p>
            <a
              href="/order"
              className={buttonClassName({
                actionRole: "navigate",
                size: "compact",
              })}
            >
              <ListIcon className="size-4 shrink-0" aria-hidden />
              목록
            </a>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard
        title="ProductionPlanOrderReference"
        desc="생산 계획·실제 생산 모달 상단 발주 요약 + 제품 라인 미리보기."
      >
        <ProductionPlanOrderReference
          orderNo="PO-20260521-001"
          partnerLabel={<span>EOST</span>}
          orderLines={
            [
              {
                id: 1,
                qty: 3,
                unit: "EA",
                productNameSnapshot: "MARKOS ENGINE",
                businessNameSnapshot: "ICE640_T2SL",
                detectorTypeSnapshot: "320-B",
              },
              {
                id: 2,
                qty: 2,
                unit: "EA",
                productNameSnapshot: "MARKOS LITE",
                businessNameSnapshot: "ICC640_T2SL",
                detectorTypeSnapshot: "640-A",
                lensNameSnapshot: "표준 렌즈",
              },
            ] as PurchaseOrderItem[]
          }
          dueDate="2026-05-31"
          requesterName="이민성"
        />
      </ComponentCard>

      <ComponentCard
        title="InfoActionPopover"
        desc='라벨·테이블 헤더 옆 정보 아이콘 — 안내 + 단일 액션.'
      >
        <div className="space-y-6">
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Label className="!mb-0">거래처</Label>
              <InfoActionPopover
                ariaLabel="거래처 등록 안내"
                description="필터에 쓸 거래처가 없으면 등록한 뒤 목록이 갱신됩니다."
                actionLabel="거래처 등록"
                onAction={() => toast.success("데모: 거래처 등록 액션")}
              />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Label className="!mb-0" required>
                검출기
              </Label>
              <DetectorTypeGuidePopover />
            </div>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard title="Tooltip" desc="아이콘형·버튼형 트리거 예시.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-200">
              아이콘형
            </span>
            <IconTooltip
              ariaLabel="아이콘형 툴팁 데모"
              content="라벨 보조 설명·필드 맥락 안내에 사용합니다."
            />
          </div>
          <ButtonTooltip
            label="버튼형 툴팁"
            content="CTA 클릭 전 간단한 사전 안내."
          />
        </div>
      </ComponentCard>

      <ComponentCard
        title="공통 Query 패턴"
        desc="`usePartnersQuery` + `usePartnerCommonCodes` 조합 예시."
      >
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="info">queryKey: partners + params</Badge>
            <Badge color={isPartnerQueryLoading ? "warning" : "success"}>
              {isPartnerQueryLoading ? "조회중" : "조회완료"}
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            조건: <code>type=SUPPLIER</code>,{" "}
            <code>supplierSegmentCode=OTHER</code>
          </p>
          {partnerQueryError ? (
            <p className="text-red-600">
              {partnerQueryError instanceof Error
                ? partnerQueryError.message
                : "파트너 쿼리 조회 실패"}
            </p>
          ) : (
            <>
              <p className="text-gray-700 dark:text-gray-200">
                조회 건수: <strong>{otherSuppliersCount}</strong>
              </p>
              <ul className="list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-300">
                {supplierPreview.length > 0 ? (
                  supplierPreview.map((label) => <li key={label}>{label}</li>)
                ) : (
                  <li>표시할 데이터가 없습니다.</li>
                )}
              </ul>
            </>
          )}
        </div>
      </ComponentCard>
    </div>
  );
}
