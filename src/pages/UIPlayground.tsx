import { useMemo, useState } from "react";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ConfirmModal from "../components/common/ConfirmModal";
import AlertModal from "../components/common/AlertModal";
import SegmentedControl from "../components/common/SegmentedControl";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import InputAddonField from "../components/form/InputAddonField";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import { EnvelopeIcon, UserIcon } from "../icons";
import IconTooltip from "../components/ui/tooltip/IconTooltip";
import ButtonTooltip from "../components/ui/tooltip/ButtonTooltip";
import { useAuth } from "../hooks/useAuth";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { PARTNER_TYPE_SUPPLIER, PARTNER_SUPPLIER_SEGMENT_OTHER } from "../lib/partnerPredicates";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { validateRequiredFields } from "../lib/formValidation";
import { ApiError } from "../lib/apiError";
import { badgeColorByDomain } from "../lib/badgeStatusColor";

const SAMPLE_STATUS_CODES = [
  { code: "PO_REGISTERED", name: "등록" },
  { code: "PO_APPROVED", name: "승인 완료" },
  { code: "PO_REJECTED", name: "반려" },
] as const;

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
  const [toggleGray, setToggleGray] = useState(false);
  const [navigationTab, setNavigationTab] = useState<"basic" | "icon" | "badge">("basic");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [statusCode, setStatusCode] = useState<(typeof SAMPLE_STATUS_CODES)[number]["code"]>(
    "PO_REGISTERED"
  );

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
      notify.error
    );
    if (valid) {
      notify.success("검증 통과");
    }
  };

  const statusName =
    SAMPLE_STATUS_CODES.find((item) => item.code === statusCode)?.name ?? statusCode;

  return (
    <>
      <PageMeta title="UI 디자인 시스템" description="UI 디자인 시스템" />
      <PageBreadcrumb pageTitle="UI 디자인 시스템" />

      <div className="space-y-6">
        <ComponentCard
          title="개요"
          desc="공통 UI 규칙과 금지 패턴을 한 화면에서 확인하는 미니 디자인 시스템 페이지입니다."
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            URL: <code>/ui</code>
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            표준: <code>Toggle</code>, <code>SegmentedControl</code>, <code>AlertModal</code>,{" "}
            <code>notify</code>, <code>badgeColorByDomain</code>
          </p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            금지 패턴: <code>react-hot-toast</code> 직접 호출, 페이지별 임의 모달/탭/토글 재구현
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

        <ComponentCard title="Status (Badge + Common-code Name 매핑)">
          <div className="space-y-3">
            <SegmentedControl
              value={statusCode}
              onChange={(value) => setStatusCode(value as (typeof SAMPLE_STATUS_CODES)[number]["code"])}
              ariaLabel="샘플 상태 코드"
              options={SAMPLE_STATUS_CODES.map((item) => ({
                value: item.code,
                label: `${item.name} (${item.code})`,
              }))}
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge color={badgeColorByDomain("order", statusName)}>{statusName}</Badge>
              <span className="text-gray-600 dark:text-gray-300">
                code: <code>{statusCode}</code> → name: <code>{statusName}</code>
              </span>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Button">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
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

        <ComponentCard title="Navigation (SegmentedControl)">
          <div className="space-y-3">
            <SegmentedControl
              value={navigationTab}
              onChange={setNavigationTab}
              ariaLabel="네비게이션 샘플"
              options={[
                { value: "basic", label: "기본" },
                { value: "icon", label: "아이콘형" },
                {
                  value: "badge",
                  label: (
                    <span className="inline-flex items-center gap-2">
                      배지형 <Badge size="sm" color="warning">NEW</Badge>
                    </span>
                  ),
                },
              ]}
            />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              선택된 탭: <strong>{navigationTab}</strong>
            </p>
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

        <ComponentCard title="Selection (통합 Toggle)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle
              id="ui-toggle-brand"
              checked={active}
              onChange={setActive}
              activeLabel="활성"
              inactiveLabel="비활성"
              variant="brand"
            />
            <Toggle
              id="ui-toggle-gray"
              checked={toggleGray}
              onChange={setToggleGray}
              activeLabel="사용"
              inactiveLabel="미사용"
              variant="gray"
            />
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            이전 <code>ActiveToggle</code>/<code>Switch</code>를 단일 <code>Toggle</code>로 통합했습니다.
          </p>
        </ComponentCard>

        <ComponentCard title="Feedback (notify)">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => notify.success("성공 토스트 예시")}>Success</Button>
            <Button variant="outline" onClick={() => notify.error("실패 토스트 예시")}>
              Error
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                notify.forbidden(
                  new ApiError(403, "권한이 없습니다. 관리자에게 문의하세요."),
                  "권한 에러 토스트 예시"
                )
              }
            >
              Forbidden
            </Button>
          </div>
        </ComponentCard>

        <ComponentCard title="Overlay (ConfirmModal / AlertModal)">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setConfirmOpen(true)}>ConfirmModal 열기</Button>
            <Button variant="outline" onClick={() => setAlertOpen(true)}>
              AlertModal 열기
            </Button>
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
      <ConfirmModal
        isOpen={confirmOpen}
        title="삭제 확인"
        message="이 항목을 삭제하면 복구할 수 없습니다."
        confirmText="삭제"
        confirmVariant="danger"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          notify.success("삭제 확인 처리");
          setConfirmOpen(false);
        }}
      />
      <AlertModal
        isOpen={alertOpen}
        onClose={() => setAlertOpen(false)}
        title="접근 권한이 없습니다"
        message="권한이 없습니다. 관리자에게 문의하세요."
        illustration="warning"
        actions={[
          { label: "닫기", onClick: () => setAlertOpen(false), variant: "secondary" },
          {
            label: "홈으로 이동",
            onClick: () => {
              notify.success("홈 이동 액션 예시");
              setAlertOpen(false);
            },
            variant: "primary",
          },
        ]}
      />
    </>
  );
}
