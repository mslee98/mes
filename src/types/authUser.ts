/** 레거시 로그인·Keycloak JWT 공통으로 쓰는 최소 사용자 표현 */
export type AuthUser = {
  employeeNo: number;
  name?: string;
  jobCategory?: string;
  jobPosition?: string;
  [key: string]: unknown;
};
