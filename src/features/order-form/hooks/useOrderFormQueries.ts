import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDetectorSelectOptions } from "../../../hooks/useDetectorSelectOptions";
import { useOrderCommonCodes } from "../../../hooks/useOrderCommonCodes";
import { usePartnersQuery } from "../../../hooks/usePartnersQuery";
import {
  getProductList,
  type RepresentativeProduct,
} from "../../../api/products";
import { getLensList, type LensItem } from "../../../api/lenses";
import { getEmployeeDirectory, getUsers } from "../../../api/user";
import { getOrganizationTree } from "../../../api/organization";
import {
  getPurchaseOrder,
  getPurchaseOrderItems,
  getPurchaseOrderFiles,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type PurchaseOrderItem,
} from "../../../api/purchaseOrder";

const PARTNER_TYPE_CUSTOMER = "CUSTOMER";

type UseOrderFormQueriesParams = {
  isNew: boolean;
  orderId: string;
  accessToken: string | null | undefined;
};

export function useOrderFormQueries({
  isNew,
  orderId,
  accessToken,
}: UseOrderFormQueriesParams) {
  const id = orderId;

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !isNew && !!accessToken && id !== "",
  });

  const shouldFetchOrderLineItems =
    !isNew &&
    !!accessToken &&
    id !== "" &&
    !!order &&
    ((order.orderItems?.length ?? 0) === 0 && (order.items?.length ?? 0) === 0);

  const { data: orderLineItemsFetched = [] } = useQuery({
    queryKey: ["purchaseOrder", id, "lineItems"],
    queryFn: () => getPurchaseOrderItems(id, accessToken!),
    enabled: shouldFetchOrderLineItems,
  });

  const resolvedOrderLineItems = useMemo((): PurchaseOrderItem[] => {
    if (isNew || !order) return [];
    const embedded = order.orderItems ?? order.items;
    if (embedded && embedded.length > 0) return embedded;
    return orderLineItemsFetched;
  }, [isNew, order, orderLineItemsFetched]);

  const { data: files = [] } = useQuery({
    queryKey: ["purchaseOrderFiles", id],
    queryFn: () => getPurchaseOrderFiles(id, accessToken!),
    enabled: !isNew && !!accessToken && id !== "",
  });

  const { data: partners = [] } = usePartnersQuery(
    accessToken,
    { type: PARTNER_TYPE_CUSTOMER },
    { enabled: !!accessToken }
  );

  const {
    countryCodes,
    currencyCodes,
    unitCodes,
    purchaseOrderTypeCodes,
    purchaseOrderStatusCodes,
  } = useOrderCommonCodes(accessToken, !!accessToken);

  const { data: productListResult } = useQuery({
    queryKey: ["products", "select", "active", 100],
    queryFn: () =>
      getProductList(accessToken!, {
        isActive: true,
        page: 1,
        size: 100,
      }),
    enabled: !!accessToken,
  });

  const productList: RepresentativeProduct[] = useMemo(
    () =>
      (productListResult?.items ?? []).filter((p) => p.isActive !== false),
    [productListResult]
  );

  const { options: detectorSelectOptions, labelById: detectorLabelById } =
    useDetectorSelectOptions(accessToken, !!accessToken);

  const { data: lensListResult } = useQuery({
    queryKey: ["lenses", "select", "active", 100],
    queryFn: () =>
      getLensList(accessToken!, {
        isActive: true,
        page: 1,
        size: 100,
      }),
    enabled: !!accessToken,
  });

  const lensList: LensItem[] = lensListResult?.items ?? [];

  const {
    data: employeeDirectory = [],
    isLoading: employeeDirectoryLoading,
    isError: employeeDirectoryError,
  } = useQuery({
    queryKey: ["employeeDirectory"],
    queryFn: () => getEmployeeDirectory(accessToken!),
    enabled: !!accessToken,
  });

  const { data: usersForRequester = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(accessToken!),
    enabled: !!accessToken,
  });

  const { data: organizationTree = [] } = useQuery({
    queryKey: ["organizationTree"],
    queryFn: () => getOrganizationTree(accessToken!),
    enabled: !!accessToken,
  });

  return {
    order: order as PurchaseOrderDetail | undefined,
    orderLoading,
    resolvedOrderLineItems,
    files: files as PurchaseOrderFile[],
    partners,
    countryCodes,
    currencyCodes,
    unitCodes,
    purchaseOrderTypeCodes,
    purchaseOrderStatusCodes,
    productList,
    lensList,
    employeeDirectory,
    employeeDirectoryLoading,
    employeeDirectoryError,
    usersForRequester,
    organizationTree,
    detectorSelectOptions,
    detectorLabelById,
  };
}
