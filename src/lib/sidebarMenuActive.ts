/**
 * 사이드바 메뉴 path 활성 판별.
 * DB 메뉴 path와 실제 라우트가 다를 때(검출기 타입 표 등) 동일 메뉴 섹션으로 묶는다.
 */
const MENU_PATH_EXTRA_ACTIVE: Record<string, readonly string[]> = {
  "/detectors": ["/iddca-type", "/iddca-type-table"],
  "/production/plans": ["/production/overview"],
  "/production/units": ["/production/overview"],
};

export function pathnameMatchesMenuPath(pathname: string, menuPath: string): boolean {
  if (!menuPath) return false;
  if (menuPath === "/") return pathname === "/";
  if (pathname === menuPath || pathname.startsWith(`${menuPath}/`)) return true;

  const extras = MENU_PATH_EXTRA_ACTIVE[menuPath];
  if (!extras) return false;

  return extras.some(
    (extra) => pathname === extra || pathname.startsWith(`${extra}/`)
  );
}
