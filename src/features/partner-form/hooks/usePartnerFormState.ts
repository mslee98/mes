import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPartner, type Partner } from "../../../api/purchaseOrder";
import {
  DEFAULT_PARTNER_COUNTRY_CODE,
  isPartnerCountryCode,
  PARTNER_COUNTRY_TO_DIAL,
  splitPartnerPhone,
  type PartnerCountryCode,
} from "../utils/phoneUtils";
import type { PartnerFormFields } from "../utils/buildPartnerPayload";

function snapshotFromPartner(existing: Partner): PartnerFormFields {
  const phoneSrc =
    existing.contactPhone ??
    (existing.contact != null && String(existing.contact).trim() !== ""
      ? existing.contact
      : "");
  const parsed = splitPartnerPhone(String(phoneSrc).trim());
  const cc = String(existing.countryCode ?? "").trim();
  const segRaw =
    existing.supplierSegment ??
    (existing as { supplier_segment?: string | null }).supplier_segment;

  return {
    code: String(existing.code ?? "").trim().toUpperCase(),
    name: existing.name ?? "",
    countryCode:
      cc && isPartnerCountryCode(cc) ? cc : DEFAULT_PARTNER_COUNTRY_CODE,
    partnerType: String(existing.type ?? "").trim(),
    supplierSegment:
      segRaw != null && String(segRaw).trim() !== ""
        ? String(segRaw).trim()
        : "",
    businessRegistrationNo: String(existing.businessRegistrationNo ?? "").trim(),
    contactPerson: String(existing.contactPerson ?? "").trim(),
    phoneCountryCode: parsed.countryCode,
    phoneNational: parsed.national,
    contactEmail: String(existing.contactEmail ?? "").trim(),
    address: String(existing.address ?? "").trim(),
    memo: String(existing.memo ?? "").trim(),
    isActive: existing.isActive !== false,
  };
}

const EMPTY_NEW_SNAPSHOT: PartnerFormFields = {
  code: "",
  name: "",
  countryCode: DEFAULT_PARTNER_COUNTRY_CODE,
  partnerType: "",
  supplierSegment: "",
  businessRegistrationNo: "",
  contactPerson: "",
  phoneCountryCode: DEFAULT_PARTNER_COUNTRY_CODE,
  phoneNational: "",
  contactEmail: "",
  address: "",
  memo: "",
  isActive: true,
};

type UsePartnerFormStateParams = {
  isNew: boolean;
  partnerId: string;
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
};

export function usePartnerFormState({
  isNew,
  partnerId,
  accessToken,
  isAuthLoading,
}: UsePartnerFormStateParams) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState<string>(
    DEFAULT_PARTNER_COUNTRY_CODE
  );
  const [partnerType, setPartnerType] = useState("");
  const [supplierSegment, setSupplierSegment] = useState("");
  const [businessRegistrationNo, setBusinessRegistrationNo] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] =
    useState<PartnerCountryCode>(DEFAULT_PARTNER_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [isActive, setIsActive] = useState(true);

  const {
    data: existing,
    isLoading: isLoadLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: () => getPartner(partnerId, accessToken as string),
    enabled: !isNew && !!accessToken && !isAuthLoading && partnerId !== "",
  });

  const fields: PartnerFormFields = useMemo(
    () => ({
      code,
      name,
      countryCode,
      partnerType,
      supplierSegment,
      businessRegistrationNo,
      contactPerson,
      phoneCountryCode,
      phoneNational,
      contactEmail,
      address,
      memo,
      isActive,
    }),
    [
      code,
      name,
      countryCode,
      partnerType,
      supplierSegment,
      businessRegistrationNo,
      contactPerson,
      phoneCountryCode,
      phoneNational,
      contactEmail,
      address,
      memo,
      isActive,
    ]
  );

  const initialSnapshot = useMemo(() => {
    if (isNew) return EMPTY_NEW_SNAPSHOT;
    if (!existing) return null;
    return snapshotFromPartner(existing);
  }, [isNew, existing]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      initialSnapshot.code !== code.trim().toUpperCase() ||
      initialSnapshot.name !== name ||
      initialSnapshot.countryCode !== countryCode ||
      initialSnapshot.partnerType !== partnerType.trim() ||
      initialSnapshot.supplierSegment !== supplierSegment.trim() ||
      initialSnapshot.businessRegistrationNo !== businessRegistrationNo.trim() ||
      initialSnapshot.contactPerson !== contactPerson.trim() ||
      initialSnapshot.phoneCountryCode !== phoneCountryCode ||
      initialSnapshot.phoneNational !== phoneNational.trim() ||
      initialSnapshot.contactEmail !== contactEmail.trim() ||
      initialSnapshot.address !== address.trim() ||
      initialSnapshot.memo !== memo.trim() ||
      initialSnapshot.isActive !== isActive
    );
  }, [initialSnapshot, fields]);

  useEffect(() => {
    if (!existing) return;
    const snap = snapshotFromPartner(existing);
    queueMicrotask(() => {
      setCode(snap.code);
      setName(snap.name);
      setCountryCode(snap.countryCode);
      setPartnerType(snap.partnerType);
      setSupplierSegment(snap.supplierSegment);
      setBusinessRegistrationNo(snap.businessRegistrationNo);
      setContactPerson(snap.contactPerson);
      setPhoneCountryCode(snap.phoneCountryCode);
      setPhoneNational(snap.phoneNational);
      setContactEmail(snap.contactEmail);
      setAddress(snap.address);
      setMemo(snap.memo);
      setIsActive(snap.isActive);
    });
  }, [existing]);

  useEffect(() => {
    if (!isNew || !isPartnerCountryCode(countryCode)) return;
    if (phoneNational.trim() !== "") return;
    if (PARTNER_COUNTRY_TO_DIAL[countryCode]) {
      queueMicrotask(() => setPhoneCountryCode(countryCode));
    }
  }, [countryCode, isNew, phoneNational]);

  const leavePath = isNew ? "/partners" : `/partners/${partnerId}`;

  return {
    fields,
    setCode,
    setName,
    setCountryCode,
    setPartnerType,
    setSupplierSegment,
    setBusinessRegistrationNo,
    setContactPerson,
    setPhoneCountryCode,
    setPhoneNational,
    setContactEmail,
    setAddress,
    setMemo,
    setIsActive,
    isDirty,
    leavePath,
    isLoadLoading,
    loadError,
    existing,
  };
}
