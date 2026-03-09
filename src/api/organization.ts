const BASE =
  import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000";

export type OrganizationUnitType =
  | "COMPANY"
  | "HEADQUARTERS"
  | "DEPARTMENT"
  | string;

export interface OrganizationUnitNode {
  id: number;
  name: string;
  code: string;
  type: OrganizationUnitType;
  sortOrder: number;
  isActive: boolean;
  parentId: number | null;
  children: OrganizationUnitNode[];
}

export async function getOrganizationTree(): Promise<OrganizationUnitNode[]> {
  const res = await fetch(`${BASE}/organization-unit/tree`, {
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "조직도를 불러오지 못했습니다."
    );
  }

  return res.json();
}
