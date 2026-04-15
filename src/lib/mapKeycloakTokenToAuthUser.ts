import type { KeycloakTokenParsed } from "keycloak-js";
import type { AuthUser } from "../types/authUser";

type JwtPayload = Record<string, unknown>;

function payloadOf(parsed: KeycloakTokenParsed): JwtPayload {
  return parsed as JwtPayload;
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function uniqueKeys(...keys: (string | undefined)[]): string[] {
  return [...new Set(keys.filter((k): k is string => !!k && k.trim().length > 0))];
}

/**
 * 표시용 이름: 성·이름이 있으면 `성 이름`(예: 이 민성), 없으면 `name` 등 폴백.
 */
function displayNameFromPayload(payload: JwtPayload): string | undefined {
  const fam = nonEmptyString(payload.family_name);
  const given = nonEmptyString(payload.given_name);
  if (fam && given) return `${fam} ${given}`;
  if (fam) return fam;
  if (given) return given;
  return (
    nonEmptyString(payload.user_full_name_ko) ??
    nonEmptyString(payload.name) ??
    nonEmptyString(payload.preferred_username) ??
    nonEmptyString(payload.email)
  );
}

/** Keycloak `group`(경로 1개) 또는 `groups` 배열에서 문자열 경로만 수집 */
function rawGroupPaths(payload: JwtPayload): string[] {
  const raw = payload.groups ?? payload.group;
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

/** `/회사/팀/파트` → `회사 > 팀 > 파트` */
function formatGroupPath(path: string): string {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" > ");
}

/** 사번: `preferred_username`(로그인 아이디=사번) 우선, 이후 커스텀 클레임·백엔드 관례 필드 */
function employeeNoFromPayload(
  payload: JwtPayload,
  employeeNoClaim?: string
): number {
  const keys = uniqueKeys(
    "preferred_username",
    employeeNoClaim,
    "employee_no",
    "employeeNo"
  );

  for (const key of keys) {
    const raw = payload[key];
    if (raw == null || String(raw).trim() === "") continue;
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }

  return 0;
}

function realmRolesFromPayload(payload: JwtPayload): string[] {
  const realm = payload.realm_access as { roles?: unknown } | undefined;
  if (!Array.isArray(realm?.roles)) return [];
  return realm.roles.filter((r): r is string => typeof r === "string");
}

/**
 * Keycloak `tokenParsed` → 앱용 `AuthUser`.
 *
 * `tokenParsed`는 액세스 토큰 JWT 페이로드(이미 디코딩됨)와 동일하다.
 */
export function mapKeycloakTokenToAuthUser(
  parsed: KeycloakTokenParsed | undefined,
  employeeNoClaim?: string
): AuthUser | null {
  if (!parsed) return null;

  const p = payloadOf(parsed);
  const preferred = nonEmptyString(p.preferred_username);
  const groupPaths = rawGroupPaths(p);
  const groupsDisplay = groupPaths.map(formatGroupPath);

  return {
    employeeNo: employeeNoFromPayload(p, employeeNoClaim),
    name: displayNameFromPayload(p),
    sub: typeof parsed.sub === "string" ? parsed.sub : undefined,
    email: nonEmptyString(parsed.email),
    preferredUsername: preferred,
    accessTokenPayload: p,
    realmRoles: realmRolesFromPayload(p),
    resourceAccess: p.resource_access,
    /** JWT `group` / `groups` 원문 경로 */
    groupPaths,
    /** 각 경로를 `조직 > 하위 > …` 형태로 */
    groupsDisplay,
  };
}
