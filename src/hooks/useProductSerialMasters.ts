import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDetectors } from "../api/detectors";
import { getProductList } from "../api/products";
import {
  detectorByIdMapFromList,
  productSerialMetaMapFromProducts,
} from "../domains/production-plan/serial/legacyProductSerialNumber";

const PRODUCT_LIST_SIZE = 500;

export function useProductSerialMasters(
  accessToken: string | undefined,
  enabled: boolean
) {
  const productsQuery = useQuery({
    queryKey: ["products", "productSerial"],
    queryFn: () =>
      getProductList(accessToken!, { page: 1, size: PRODUCT_LIST_SIZE }),
    enabled: Boolean(accessToken && enabled),
  });

  const detectorsQuery = useQuery({
    queryKey: ["detectors", "productSerial"],
    queryFn: () => getDetectors(accessToken!),
    enabled: Boolean(accessToken && enabled),
  });

  const productMetaById = useMemo(
    () => productSerialMetaMapFromProducts(productsQuery.data?.items ?? []),
    [productsQuery.data?.items]
  );

  const detectorById = useMemo(
    () => detectorByIdMapFromList(detectorsQuery.data ?? []),
    [detectorsQuery.data]
  );

  const isLoading = productsQuery.isLoading || detectorsQuery.isLoading;
  const isError = productsQuery.isError || detectorsQuery.isError;
  const error =
    (productsQuery.error as Error | null) ??
    (detectorsQuery.error as Error | null) ??
    null;

  return {
    productMetaById,
    detectorById,
    isLoading,
    isError,
    error,
  };
}
