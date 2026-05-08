import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../lib/notify";
import { Modal } from "../ui/modal";
import Label from "./Label";
import Input from "./input/InputField";
import { useAuth } from "../../hooks/useAuth";
import {
  createPartner,
  type Partner,
  type PartnerCreatePayload,
} from "../../api/purchaseOrder";
import {
  COMMON_CODE_GROUP_PARTNER_DEFENSE_MARKET,
  commonCodesToSelectOptions,
} from "../../api/commonCode";
import { useCommonCodesByGroup } from "../../hooks/useCommonCodesByGroup";
import CountrySelect from "./CountrySelect";
import {
  DEFAULT_PARTNER_COUNTRY_CODE,
  isPartnerCountryCode,
} from "../../lib/partnerCountryOptions";

const DEFAULT_DEFENSE_MARKET = "CIVILIAN";
const PARTNER_CODE_REGEX = /^[A-Z]{1,2}$/;

export interface PartnerQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 등록 성공 시 (목록 invalidate 후 선택 반영) */
  onCreated: (partner: Partner) => void;
}

export default function PartnerQuickCreateModal({
  isOpen,
  onClose,
  onCreated,
}: PartnerQuickCreateModalProps) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [defenseMarket, setDefenseMarket] = useState("");
  const [countryCode, setCountryCode] = useState("");

  const { data: defenseMarketCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PARTNER_DEFENSE_MARKET,
    accessToken,
    { enabled: isOpen && !!accessToken }
  );

  const defenseOptions = useMemo(
    () => commonCodesToSelectOptions(defenseMarketCodes),
    [defenseMarketCodes]
  );

  useEffect(() => {
    if (!isOpen) {
      queueMicrotask(() => {
        setDefenseMarket("");
        setCountryCode("");
      });
      return;
    }
    queueMicrotask(() => {
      setCountryCode((prev) => {
        if (prev && isPartnerCountryCode(prev)) return prev;
        return DEFAULT_PARTNER_COUNTRY_CODE;
      });
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || defenseOptions.length === 0) return;
    queueMicrotask(() => {
      setDefenseMarket((prev) => {
        if (prev && defenseOptions.some((o) => o.value === prev)) return prev;
        const preferred =
          defenseOptions.find((o) => o.value === DEFAULT_DEFENSE_MARKET) ??
          defenseOptions[0];
        return preferred?.value ?? "";
      });
    });
  }, [isOpen, defenseOptions]);

  const mutation = useMutation({
    mutationFn: (payload: PartnerCreatePayload) =>
      createPartner(payload, accessToken!),
    onSuccess: (partner) => {
      notify.success("업체가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      onCreated(partner);
      setCode("");
      setName("");
      setContact("");
      setDefenseMarket("");
      setCountryCode("");
      onClose();
    },
    onError: (e: Error) => notify.error(e.message || "등록에 실패했습니다."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode || !name.trim()) {
      notify.error("업체 코드와 이름을 입력하세요.");
      return;
    }
    if (!PARTNER_CODE_REGEX.test(normalizedCode)) {
      notify.error("업체 코드는 영문 대문자 1~2자리만 입력할 수 있습니다. (예: A, ZZ)");
      return;
    }
    if (defenseOptions.length === 0) {
      notify.error("민수/군수 공통코드를 불러올 수 없습니다.");
      return;
    }
    const dm = defenseMarket.trim();
    const cc = countryCode.trim();
    if (!dm || !defenseOptions.some((o) => o.value === dm)) {
      notify.error("민수/군수를 선택하세요.");
      return;
    }
    if (!cc || !isPartnerCountryCode(cc)) {
      notify.error("국가를 선택하세요.");
      return;
    }
    mutation.mutate({
      code: normalizedCode,
      name: name.trim(),
      defenseMarket: dm,
      countryCode: cc,
      contactPhone: contact.trim() || null,
    });
  };

  const codesReady = defenseOptions.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="mx-4 max-w-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        업체 빠른 등록
      </h3>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        등록 후 목록에 반영되며, 현재 선택으로 지정됩니다.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="partner-quick-code">업체 코드 *</Label>
          <Input
            id="partner-quick-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="예: A, ZZ"
            maxLength={2}
            className="mt-1"
            autoComplete="off"
          />
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            영문 대문자 1~2자리만 입력 가능합니다. (A~Z, AA~ZZ)
          </p>
        </div>
        <div>
          <Label htmlFor="partner-quick-name">업체명 *</Label>
          <Input
            id="partner-quick-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="회사명"
            className="mt-1"
            autoComplete="organization"
          />
        </div>
        {defenseOptions.length > 0 ? (
          <div>
            <Label htmlFor="partner-quick-defense">민수 / 군수 *</Label>
            <select
              id="partner-quick-defense"
              value={defenseMarket}
              onChange={(e) => setDefenseMarket(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {defenseOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              공통코드{" "}
              <code className="text-xs">PARTNER_DEFENSE_MARKET</code>
            </p>
          </div>
        ) : isOpen ? (
          <p className="text-theme-sm text-amber-600 dark:text-amber-400">
            민수/군수 공통코드를 불러오는 중이거나 없습니다.
          </p>
        ) : null}
        {isOpen ? (
          <CountrySelect
            id="partner-quick-country"
            label="국가"
            required
            value={countryCode}
            onChange={setCountryCode}
            helpText="등록 화면에서 선택 가능한 국가만 표시됩니다."
          />
        ) : null}
        <div>
          <Label htmlFor="partner-quick-contact">담당자 / 연락처</Label>
          <Input
            id="partner-quick-contact"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="선택"
            className="mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !codesReady}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending ? "등록 중..." : "등록"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
