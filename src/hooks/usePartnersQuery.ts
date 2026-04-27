import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  getPartners,
  type GetPartnersParams,
  type Partner,
} from "../api/purchaseOrder";

type UsePartnersQueryOptions = Omit<
  UseQueryOptions<Partner[], Error, Partner[], readonly unknown[]>,
  "queryKey" | "queryFn"
>;

function normalizePartnerParams(params?: GetPartnersParams): GetPartnersParams {
  const usage = String(params?.usage ?? "").trim();
  const supplierSegmentCode = String(params?.supplierSegmentCode ?? "").trim();
  const type = String(params?.type ?? "").trim();
  return {
    ...(usage ? { usage } : {}),
    ...(supplierSegmentCode ? { supplierSegmentCode } : {}),
    ...(type ? { type } : {}),
  };
}

export function partnersQueryKey(params?: GetPartnersParams) {
  return ["partners", normalizePartnerParams(params)] as const;
}

export function usePartnersQuery(
  accessToken: string | null | undefined,
  params?: GetPartnersParams,
  options?: UsePartnersQueryOptions
) {
  const normalizedParams = normalizePartnerParams(params);
  return useQuery({
    queryKey: partnersQueryKey(normalizedParams),
    queryFn: () => getPartners(accessToken as string, normalizedParams),
    ...options,
  });
}
