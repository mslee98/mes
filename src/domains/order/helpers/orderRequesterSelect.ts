import type { EmployeeDirectoryItem } from "../../../api/user";
import { tryDecodeLegacyUser } from "../../../lib/legacySelectValue";

export function parseRequesterNameFromSelect(
  selectValue: string,
  users: EmployeeDirectoryItem[]
): string {
  if (!selectValue) return "";
  const legacy = tryDecodeLegacyUser(selectValue);
  if (legacy !== null) return legacy;
  return (
    users.find((u) => String(u.employeeNo) === selectValue)?.name?.trim() ?? ""
  );
}

/** `users.employee_no` — select value는 사번 문자열 */
export function parseRequesterEmployeeNoFromSelect(
  selectValue: string
): string | null {
  const raw = String(selectValue ?? "").trim();
  if (!raw) return null;
  if (tryDecodeLegacyUser(raw) !== null) return null;
  return raw;
}
