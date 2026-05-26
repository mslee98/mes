export const LEGACY_USER_PREFIX = "legacy-user:";
export const LEGACY_DEPT_PREFIX = "legacy-dept:";

export function legacyUserValue(name: string): string {
  return `${LEGACY_USER_PREFIX}${encodeURIComponent(name)}`;
}

export function tryDecodeLegacyUser(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_USER_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_USER_PREFIX.length));
  } catch {
    return null;
  }
}

export function legacyDeptValue(path: string): string {
  return `${LEGACY_DEPT_PREFIX}${encodeURIComponent(path)}`;
}

export function tryDecodeLegacyDept(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_DEPT_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_DEPT_PREFIX.length));
  } catch {
    return null;
  }
}
