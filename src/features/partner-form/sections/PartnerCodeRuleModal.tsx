import { Modal } from "../../../components/ui/modal";
import { PARTNER_TYPE_SUPPLIER } from "../utils/phoneUtils";

type CodeSlotRow = {
  code: string;
  names: string[];
  label: string;
};

type PartnerCodeRuleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  partnerType: string;
  selectedPartnerTypeLabel: string;
  selectedSupplierSegmentLabel: string;
  isCodeInputReady: boolean;
  isCodeRuleLoading: boolean;
  codeSlotRows: CodeSlotRow[];
  onSelectCode: (code: string) => void;
};

export function PartnerCodeRuleModal({
  isOpen,
  onClose,
  partnerType,
  selectedPartnerTypeLabel,
  selectedSupplierSegmentLabel,
  isCodeInputReady,
  isCodeRuleLoading,
  codeSlotRows,
  onSelectCode,
}: PartnerCodeRuleModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 w-full max-w-3xl p-6 sm:p-7"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        업체 코드 현황
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        현재 선택한 업체 유형/협력사 부문 기준으로 코드 정의 기준을 안내합니다.
      </p>

      <div className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40 sm:grid-cols-2">
        <div>
          <p className="text-gray-500 dark:text-gray-400">업체 유형</p>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {selectedPartnerTypeLabel}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">협력사 부문</p>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">
            {partnerType === PARTNER_TYPE_SUPPLIER
              ? selectedSupplierSegmentLabel
              : "해당 없음"}
          </p>
        </div>
      </div>

      {!isCodeInputReady ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300">
          정확한 규칙 안내를 위해 업체 유형(협력사인 경우 부문까지)을 먼저
          선택하세요.
        </div>
      ) : null}

      <div className="mt-5 max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                적용 대상
              </th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                업체명
              </th>
              <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                적용
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {!isCodeInputReady ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  코드 슬롯을 보려면 업체 유형/협력사 부문을 먼저 선택하세요.
                </td>
              </tr>
            ) : isCodeRuleLoading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  코드 슬롯을 조회하는 중...
                </td>
              </tr>
            ) : (
              codeSlotRows.map((row) => (
                <tr
                  key={row.code}
                  className={
                    row.names.length > 0
                      ? "bg-red-50/70 dark:bg-red-500/10"
                      : "bg-green-50/70 dark:bg-green-500/10"
                  }
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                    {row.label}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={row.names.length > 0}
                      onClick={() => {
                        onSelectCode(row.code);
                        onClose();
                      }}
                      className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    >
                      사용
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          확인
        </button>
      </div>
    </Modal>
  );
}
