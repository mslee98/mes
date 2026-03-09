# 인증 (로그인 / 로그아웃 / 토큰) 가이드

이 문서는 프로젝트에서 구현한 **로그인**, **로그아웃**, **Access Token / Refresh Token** 처리 방식과 관련 파일, 백엔드 API 규약을 정리한 것입니다.

---

## 1. 개요

| 구분 | 설명 |
|------|------|
| **Access Token** | 메모리(React state)에만 보관. API 호출 시 사용. 새로고침 시 사라짐. |
| **Refresh Token** | 백엔드가 로그인 응답에서 **Set-Cookie**로 설정. 브라우저가 쿠키로 보관·전송. |
| **사용자 정보 (user)** | 메모리 + **sessionStorage**에 보관. 새로고침 후 refresh 응답에 user가 없어도 화면에 이름 등 표시 유지. |

- 모든 인증 API 요청에는 **`credentials: 'include'`** 를 사용해 쿠키가 전송되도록 되어 있습니다.

---

## 2. 인증 흐름

### 2.1 로그인

1. 사용자가 **사번(employeeNo)** 과 **비밀번호**를 입력해 로그인 요청.
2. **POST** `{BASE_URL}/auth/login` 호출  
   - Body: `{ "employeeNo": number, "password": string }`  
   - `credentials: 'include'` 로 요청.
3. 성공 시:
   - 응답 JSON에서 **access_token**(또는 `accessToken`, `token`) → **메모리**에 저장.
   - 응답 JSON에서 **user** (employeeNo, name 등) → **메모리** + **sessionStorage**에 저장.
   - 백엔드가 **Set-Cookie**로 `refresh_token` 설정 → 브라우저가 쿠키로 저장.
4. 실패 시: 에러 메시지를 화면에 표시.

### 2.2 앱 시작 / 새로고침

1. 앱 로드 시 메모리는 비어 있음 (access token 없음).
2. **POST** `{BASE_URL}/auth/refresh` 호출  
   - Body 없음.  
   - **`credentials: 'include'`** 로 요청 → 브라우저가 자동으로 **Cookie: refresh_token** 전송.
3. 성공 시:
   - 응답의 **access_token** → 메모리에 저장 → 로그인 상태 복구.
   - 응답에 **user**가 있고 `name`이 있으면 → 해당 user로 메모리·sessionStorage 갱신.
   - 응답에 user가 없거나 name이 없으면 → **sessionStorage**에 저장해 둔 user로 복원 (이름 유지).
4. 실패 시 (401 등): access token·user·sessionStorage 정리 후 비로그인 상태로 처리.

### 2.3 로그아웃

1. **POST** `{BASE_URL}/auth/logout` 호출  
   - **`credentials: 'include'`** 로 요청 → 서버에서 refresh token 쿠키 삭제.
2. 클라이언트: 메모리의 access token·user 제거, sessionStorage의 user 제거.

---

## 3. 백엔드 API 규약

### 3.1 로그인

- **POST** `http://localhost:3000/auth/login`
- **Request Body**
  ```json
  { "employeeNo": 10001, "password": "10001" }
  ```
- **Response (200)**
  - JSON: `access_token` (또는 `accessToken`, `token`), `user` (선택)
  - Set-Cookie: `refresh_token=...` (쿠키 이름·옵션은 백엔드 정책에 따름)
- **Response (4xx)**  
  - JSON: `{ "message": "에러 메시지" }` 등

### 3.2 토큰 재발급 (Refresh)

- **POST** `http://localhost:3000/auth/refresh`
- **Cookie**  
  - `refresh_token` (로그인 시 백엔드가 Set-Cookie로 설정한 값이 `credentials: 'include'` 로 자동 전송)
- **Request Body**  
  - 없음 (토큰은 쿠키로만 전달)
- **Response (200)**
  - JSON: `access_token`, `expires_in_seconds` (선택)
  - Set-Cookie: 새 `refresh_token` (선택, 백엔드 정책에 따름)
  - JSON에 `user` 포함 시 클라이언트에서 이름 등 표시에 사용

### 3.3 로그아웃

- **POST** `http://localhost:3000/auth/logout`
- **Cookie**  
  - `credentials: 'include'` 로 refresh_token 쿠키 전송
- **동작**  
  - 서버에서 Refresh Token 쿠키 삭제. 클라이언트는 Access Token·user 제거.

---

## 4. 관련 파일

| 경로 | 역할 |
|------|------|
| `src/api/auth.ts` | 로그인(`login`), 토큰 재발급(`refresh`), 로그아웃(`logout`) API 호출 및 타입 정의 |
| `src/api/authCookie.ts` | (참고) 클라이언트에서 refresh token 쿠키를 직접 다루는 유틸. 현재 흐름에서는 백엔드 Set-Cookie만 사용 |
| `src/context/AuthContext.tsx` | 로그인 상태(accessToken, user), 로그인/로그아웃 함수, 앱 시작 시 refresh 호출, sessionStorage user 보관 |
| `src/components/auth/SignInForm.tsx` | 로그인 폼: 사번·비밀번호 입력, `useAuth().login` 호출, 에러 표시 |
| `src/layout/AppHeader.tsx` | 로그인 여부에 따라 "로그인" 버튼 또는 사용자 드롭다운 표시 |
| `src/components/header/UserDropdown.tsx` | 로그인된 사용자 이름(또는 사번) 표시, 로그아웃 버튼 → `useAuth().logout` 호출 |
| `src/main.tsx` | `AuthProvider`로 앱 전체 감싸서 `useAuth()` 사용 가능하도록 구성 |

---

## 5. 환경 변수 (`.env.local`)

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `VITE_AUTH_BASE_URL` | 인증 API 베이스 URL | `http://localhost:3000` |
| `VITE_AUTH_REFRESH_COOKIE_NAME` | (참고) refresh token 쿠키 이름. 현재는 백엔드 Set-Cookie 정책에 따름 | `refreshToken` |

- Vite는 `VITE_` 접두사가 붙은 변수만 클라이언트에 노출합니다.
- `.env.local` 수정 후에는 개발 서버를 다시 실행해야 반영됩니다.

---

## 6. 클라이언트 저장소 정리

| 저장 위치 | 저장 내용 | 용도 |
|-----------|-----------|------|
| **메모리 (React state)** | `accessToken`, `user` | 로그인 상태, API 호출, 헤더 표시 |
| **쿠키 (브라우저)** | `refresh_token` | 백엔드가 Set-Cookie로 설정. 앱 새로고침 시 `/auth/refresh` 호출에 사용 |
| **sessionStorage** | `auth_user` (user 객체) | 새로고침 후 refresh 응답에 user/name이 없을 때 헤더 이름 표시 유지 |

- Access Token은 **localStorage 등에 저장하지 않습니다** (메모리만 사용).
- 탭을 닫으면 sessionStorage는 비워지므로, 새 탭에서만 refresh로 복구할 경우 refresh 응답에 `user`가 있으면 이름이 표시됩니다.

---

## 7. UI 동작 요약

- **비로그인**  
  - AppHeader에 "로그인" 버튼 표시 → 클릭 시 `/signin`으로 이동.
- **로그인**  
  - AppHeader에 사용자 드롭다운 표시  
    - `user.name`이 있으면 이름(예: 홍길동), 없으면 `사번 {employeeNo}` 표시.  
  - 드롭다운 내 "로그아웃" 클릭 → `logout()` 호출 후 비로그인 상태로 전환.

---

## 8. CORS / 쿠키 (개발 시 참고)

- 프론트와 백엔드가 다른 포트(예: 5173 vs 3000)이면 **cross-origin**이 됩니다.
- refresh_token 쿠키가 정상 저장·전송되려면 백엔드에서:
  - **CORS**: `Access-Control-Allow-Origin`에 프론트 주소 지정, `Access-Control-Allow-Credentials: true`
  - **Set-Cookie**: 필요 시 `SameSite=None; Secure` 등 쿠키 옵션 설정

이렇게 맞춰 두면 새로고침 후에도 `/auth/refresh`로 로그인 상태가 유지됩니다.
