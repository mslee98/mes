import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import Badge from "../components/ui/badge/Badge";
import { DangerSoftTag } from "../components/ui/tag/DangerSoftTag";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import InputAddonField from "../components/form/InputAddonField";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import TimePickerInput from "../components/form/TimePickerInput";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import { EnvelopeIcon, ListIcon, PencilIcon, PlusIcon, UserIcon } from "../icons";
import { BUTTON_ACTION_ROLE_GUIDE, buttonClassName } from "../lib/buttonStyles";
import IconTooltip from "../components/ui/tooltip/IconTooltip";
import ButtonTooltip from "../components/ui/tooltip/ButtonTooltip";
import { useAuth } from "../hooks/useAuth";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { PARTNER_TYPE_SUPPLIER, PARTNER_SUPPLIER_SEGMENT_OTHER } from "../lib/partnerPredicates";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { validateRequiredFields } from "../lib/formValidation";
import { Modal } from "../components/ui/modal";
import InfoActionPopover from "../components/common/InfoActionPopover";
import { DetectorTypeGuidePopover } from "../components/common/DetectorTypeGuidePopover";
import { ProductionPlanOrderSummary } from "../components/order/ProductionPlanOrderSummary";

export default function UIPlayground() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [weight, setWeight] = useState("");
  const [timeOnSelect, setTimeOnSelect] = useState("09:30");
  const [timeOnSave, setTimeOnSave] = useState("14:00");
  const [modalDemoOpen, setModalDemoOpen] = useState(false);
  const [demoMonth, setDemoMonth] = useState("");
  const queryEnabled = !!accessToken && !isAuthLoading;
  const { countryCodes } = usePartnerCommonCodes(accessToken, queryEnabled);
  const {
    data: otherSuppliers = [],
    isLoading: isPartnerQueryLoading,
    error: partnerQueryError,
  } = usePartnersQuery(
    accessToken,
    {
      type: PARTNER_TYPE_SUPPLIER,
      supplierSegmentCode: PARTNER_SUPPLIER_SEGMENT_OTHER,
    },
    { enabled: queryEnabled }
  );

  const supplierPreview = useMemo(
    () =>
      otherSuppliers
        .slice(0, 5)
        .map((partner) => partnerSelectLabel(partner, countryCodes)),
    [otherSuppliers, countryCodes]
  );

  const runValidationDemo = () => {
    const valid = validateRequiredFields(
      [
        { value: name, message: "이름은 필수입니다." },
        { value: dueDate, message: "예정일은 필수입니다." },
      ],
      toast.error
    );
    if (valid) {
      toast.success("검증 통과");
    }
  };

  return (
    <>
      <PageMeta title="UI 디자인 시스템" description="UI 디자인 시스템" />
      <PageBreadcrumb pageTitle="UI 디자인 시스템" />

      <div className="space-y-6">
        <ComponentCard
          title="개요"
          desc="공통 UI, 콘텐츠 검증, 공통 쿼리 패턴을 한 화면에서 확인하는 페이지입니다."
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            URL: <code>/ui</code>
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            최근 공통화 항목: <code>buttonStyles</code> (액션 역할),{" "}
            <code>ProductionPlanOrderSummary</code>, <code>InfoActionPopover</code>,{" "}
            <code>Toggle</code>, <code>FormActionBar</code>, <code>TimePickerInput</code>
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
          desc="`header`에 제목·서브타이틀을 넣으면 좌측에 표시되고, 우측에 닫기(X)가 한 줄에 배치됩니다. 그 아래 border로 본문과 구분됩니다."
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
          desc="variant(solid|outline|ghost) × color(brand|neutral|success|warning|danger). 화면당 핵심 CTA 1개만 solid brand."
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
                actionRole (상단 액션 바 — 발주 상세와 동일)
              </p>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                <Button actionRole="navigate" size="compact" startIcon={<ListIcon className="size-4" aria-hidden />}>
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
                Link + buttonClassName (앵커 버튼)
              </p>
              <a
                href="/order"
                className={buttonClassName({ actionRole: "navigate", size: "compact" })}
              >
                <ListIcon className="size-4 shrink-0" aria-hidden />
                목록
              </a>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="ProductionPlanOrderSummary"
          desc="생산 계획·실제 생산 모달 상단 발주 스냅샷 — 납품 요약 카드와 동일한 그라데이션 + dl 그리드."
        >
          <ProductionPlanOrderSummary
            orderNo="PO-20260521-001"
            partnerLabel={<span>EOST</span>}
            productName="MARKOS ENGINE"
            businessName="ICE640_T2SL"
            detectorLabel="320-B"
            lensLabel="—"
            qtyLabel="5 EA"
            dueDate="2026-05-31"
            requesterName="이민성"
          />
        </ComponentCard>

        <ComponentCard
          title="InfoActionPopover"
          desc={
            '라벨·테이블 헤더 옆 정보 아이콘 — 안내 문구 + 단일 액션. SearchableSelectWithCreate의 addTrigger="popover" 및 발주 검출기 타입 안내에 사용합니다.'
          }
        >
          <div className="space-y-6">
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Label className="!mb-0">거래처 (라벨 + 팝오버 패턴)</Label>
                <InfoActionPopover
                  ariaLabel="거래처 등록 안내"
                  description="필터에 쓸 거래처가 없으면 등록한 뒤 목록이 갱신됩니다."
                  actionLabel="거래처 등록"
                  onAction={() => toast.success("데모: 거래처 등록 액션")}
                />
              </div>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                납품 목록 필터·발주 폼 셀렉트와 동일한 트리거 배치입니다.
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <Label className="!mb-0" required>
                  검출기
                </Label>
                <DetectorTypeGuidePopover />
              </div>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                발주 등록·상세 제품 라인 — 「타입 표 확인」으로{" "}
                <code>/iddca-type</code>을 새 탭에서 엽니다.
              </p>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Tooltip"
          desc="공통 Tooltip 코어를 기반으로 아이콘형/버튼형 트리거를 사용하는 예시입니다."
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-200">
                아이콘형 안내
              </span>
              <IconTooltip
                ariaLabel="아이콘형 툴팁 데모"
                content="아이콘형 툴팁은 라벨 보조 설명이나 필드 맥락 안내에 사용합니다."
              />
            </div>
            <ButtonTooltip
              label="버튼형 툴팁"
              content="버튼형 툴팁은 CTA 클릭 전 간단한 사전 안내를 제공할 때 사용합니다."
            />
          </div>
        </ComponentCard>

        <ComponentCard title="Form Controls">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ui-name" required>
                이름
              </Label>
              <Input
                id="ui-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="mt-1"
              />
            </div>
            <div>
              <DatePicker
                id="ui-due-date"
                label="예정일"
                value={dueDate}
                onValueChange={setDueDate}
                placeholder="년-월-일"
              />
            </div>
            <div>
              <DatePicker
                id="ui-month-only"
                label="월만 선택 (flatpickr monthSelect)"
                value={demoMonth ? `${demoMonth}-01` : ""}
                monthOnly
                onValueChange={(v) => setDemoMonth(String(v ?? "").slice(0, 7))}
                compact
              />
              <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                값:{" "}
                <code className="text-gray-800 dark:text-gray-200">
                  {demoMonth || "—"}
                </code>
              </p>
            </div>
            <div className="sm:col-span-2">
              <Label
                htmlFor="ui-memo"
                className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
              >
                메모
              </Label>
              <TextArea
                id="ui-memo"
                rows={4}
                value={memo}
                onChange={setMemo}
                placeholder="컴포넌트 테스트용 텍스트"
              />
            </div>
            <div className="sm:col-span-2">
              <Toggle
                id="ui-active-toggle"
                checked={active}
                onChange={setActive}
              />
            </div>
          </div>

          <FormActionBar
            className="mt-4"
            submitLabel="검증 실행"
            submitDisabled={false}
            onCancel={() => {
              setName("");
              setMemo("");
              setDueDate("");
              setDemoMonth("");
              setTimeOnSelect("09:30");
              setTimeOnSave("14:00");
              setActive(true);
              setEmail("");
              setUsername("");
              setWebsite("");
              setWeight("");
            }}
            cancelLabel="초기화"
          >
            <button
              type="button"
              onClick={runValidationDemo}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              validateRequiredFields 데모 실행
            </button>
          </FormActionBar>
        </ComponentCard>

        <ComponentCard
          title="TimePickerInput"
          desc="12시간제 패널. commitMode로 즉시 반영(onSelect, 기본) 또는 저장 시 반영(onSave)을 선택합니다. onSelect에서는 분을 고르면 자동 반영 후 패널이 닫힙니다."
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <TimePickerInput
                id="ui-time-on-select"
                label='즉시 반영 (commitMode="onSelect", 기본)'
                value={timeOnSelect}
                onChange={setTimeOnSelect}
                commitMode="onSelect"
              />
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                현재 값:{" "}
                <code className="text-gray-800 dark:text-gray-200">
                  {timeOnSelect || "—"}
                </code>
              </p>
            </div>
            <div>
              <TimePickerInput
                id="ui-time-on-save"
                label='저장 시 반영 (commitMode="onSave")'
                value={timeOnSave}
                onChange={setTimeOnSave}
                commitMode="onSave"
                closeOnMinuteSelect={false}
              />
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                현재 값:{" "}
                <code className="text-gray-800 dark:text-gray-200">
                  {timeOnSave || "—"}
                </code>
              </p>
            </div>
            <div className="sm:col-span-2">
              <TimePickerInput
                id="ui-time-compact"
                label="compact (표·모달용)"
                value={timeOnSelect}
                onChange={setTimeOnSelect}
                compact
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="Input Addons (좌/우 아이콘·텍스트)"
          desc="좌측/우측에 SVG 아이콘 또는 텍스트를 붙여 입력 맥락을 명확히 하는 패턴입니다."
        >
          <div className="space-y-5">
            <div>
              <Label htmlFor="ui-input-email">이메일 (좌측 SVG)</Label>
              <InputAddonField
                id="ui-input-email"
                value={email}
                onChange={setEmail}
                placeholder="name@example.com"
                addon={<EnvelopeIcon className="size-5" />}
                addonPlacement="inside-left"
                addonAriaLabel="email icon"
              />
            </div>

            <div>
              <Label htmlFor="ui-input-username">Username (좌측 SVG)</Label>
              <InputAddonField
                id="ui-input-username"
                value={username}
                onChange={setUsername}
                placeholder="elonmusk"
                addon={<UserIcon className="size-4" />}
                addonPlacement="outside-left"
                addonAriaLabel="username icon"
              />
            </div>

            <div>
              <Label htmlFor="ui-input-website">Website (좌측 텍스트)</Label>
              <InputAddonField
                id="ui-input-website"
                value={website}
                onChange={setWebsite}
                placeholder="flowbite.com"
                addon="https://"
                addonPlacement="outside-left"
                addonAriaLabel="website prefix"
              />
            </div>

            <div>
              <Label htmlFor="ui-input-weight">Weight (우측 텍스트)</Label>
              <InputAddonField
                id="ui-input-weight"
                value={weight}
                onChange={setWeight}
                placeholder="12.5"
                addon="kg"
                addonPlacement="outside-right"
                addonAriaLabel="weight unit"
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="공통 Query 패턴"
          desc="`usePartnersQuery` + `usePartnerCommonCodes` 조합으로 렌즈 제조사(OTHER 협력사) 목록을 불러오는 예시입니다."
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
                  조회 건수: <strong>{otherSuppliers.length}</strong>
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
    </>
  );
}
