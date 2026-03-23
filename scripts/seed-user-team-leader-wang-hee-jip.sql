-- =============================================================================
-- 시드 보완 예시: 왕희집 → 부서 팀장(is_team_leader) + 직위/직급(수석·팀장)
-- 실제 DB 테이블·컬럼명에 맞게 수정한 뒤 백엔드 시드 또는 마이그레이션에 반영하세요.
-- 프론트는 GET /users 응답의 userOrganizations[].isTeamLeader (또는 is_team_leader)를 사용합니다.
-- =============================================================================

-- (1) 사용자-조직 소속: 팀장 플래그
-- 예시 테이블명: user_organizations, 컬럼: user_id, is_team_leader
/*
UPDATE user_organizations AS uo
SET is_team_leader = TRUE
FROM users AS u
WHERE uo.user_id = u.id
  AND u.name = '왕희집';
*/

-- (2) 직위·직급이 별도 마스터(FK)인 경우: 수석 / 팀장 코드에 맞춰 연결
-- positions.code = 'SENIOR_STAFF' (수석), job_titles.code = 'TEAM_LEAD' (팀장) 등 실제 시드값 사용
/*
UPDATE user_organizations AS uo
SET
  position_id = (SELECT id FROM positions WHERE code = 'SENIOR_STAFF' LIMIT 1),
  job_title_id = (SELECT id FROM job_titles WHERE code = 'TEAM_LEAD' LIMIT 1)
FROM users AS u
WHERE uo.user_id = u.id
  AND u.name = '왕희집';
*/

-- ORM 시드(TypeORM/Prisma 등)를 쓰는 경우: 위와 동일한 의미로
--  - 해당 사용자의 primary(또는 대상 부서) userOrganization 레코드에 isTeamLeader: true
--  - position / jobTitle 관계를 수석·팀장에 맞는 엔티티로 설정
