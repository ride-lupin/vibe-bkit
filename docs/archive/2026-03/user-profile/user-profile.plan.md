# Plan: user-profile

## Executive Summary

| 항목    | 내용                                                       |
| ------- | ---------------------------------------------------------- |
| Feature | user-profile                                               |
| 작성일  | 2026-03-19                                                 |
| 목표    | 로그인 후 홈 진입 시 프로필 조회 렌더링 + 연락처 필드 추가 |
| 범위    | BE (DB 마이그레이션 + API) + FE (홈 화면 렌더링)           |

### Value Delivered

| 관점          | 내용                                                                  |
| ------------- | --------------------------------------------------------------------- |
| Problem       | 로그인 후 홈에 사용자 정보가 없어 누가 로그인했는지 알 수 없음        |
| Solution      | `GET /users/me` API + 홈 화면 프로필 카드로 즉시 노출                 |
| Function / UX | 이름, 이메일, 권한, 연락처 4개 필드를 카드 형태로 렌더링              |
| Core Value    | 유저 컨텍스트를 앱 내에서 항상 확인 가능 → 신뢰성 있는 세션 상태 표현 |

---

## 요구사항

### 기능 요구사항

1. **연락처 필드 추가** — `users` 테이블에 `phone` 컬럼 추가 (한국 휴대폰 번호: `010-XXXX-XXXX` 형식, **필수값 NOT NULL**)
2. **프로필 조회 API** — `GET /users/me` (JWT 인증 필수) → 이름, 이메일, 권한, 연락처 반환
3. **홈 화면 렌더링** — 로그인 후 홈 진입 시 프로필 자동 조회 후 4개 필드 표시

### 비기능 요구사항

- `phone` 포맷은 Zod 스키마로 BE/FE 공유 검증
- JWT 인증 미들웨어는 재사용 가능한 Hono 미들웨어로 분리
- 프로필 쿼리는 서비스 레이어(`services/user/queries.ts`)에 선언
- 테스트: Vitest (API 라우트) + Playwright E2E (홈 화면 렌더링)

---

## 기술 설계 방향

### DB 마이그레이션 (Drizzle ORM)

`apps/api/src/db/schema.ts`의 `users` 테이블에 `phone` 컬럼 추가:

- 타입: `text NOT NULL` (필수값)
- `drizzle-kit generate`가 생성한 마이그레이션 SQL을 **수동 편집** — 기존 행 데이터 마이그레이션 포함

**마이그레이션 SQL 전략 (기존 계정 대응):**

`db:generate`가 생성한 파일에 아래 순서로 SQL 추가:

```sql
-- 1. 컬럼 추가 (임시 DEFAULT로 기존 행 채우기)
ALTER TABLE "users" ADD COLUMN "phone" text NOT NULL DEFAULT '000-0000-0000';

-- 2. 테스트 계정 실제 번호로 업데이트
UPDATE "users" SET phone = '010-1234-5678' WHERE email = 'test@example.com';

-- 3. 임시 DEFAULT 제거 (이후 신규 행은 앱에서 반드시 입력)
ALTER TABLE "users" ALTER COLUMN "phone" DROP DEFAULT;
```

**seed.ts 업데이트:** `phone` 필드 추가 + `onConflictDoUpdate`로 기존 테스트 계정 phone 값 갱신

### 공유 스키마 변경 (`packages/shared`)

```
UserSchema          ← phone 필드 추가 (required: z.string().regex(/^010-\d{4}-\d{4}$/))
PublicUserSchema    ← phone 포함하도록 pick 업데이트
ProfileResponseSchema ← apiResponseSchema(PublicUserSchema) 신규 추가
```

inferred types 추가: `ProfileResponse`

### API (`apps/api`)

**신규 파일:**

- `src/middleware/auth.ts` — Bearer 토큰 추출 → `verifyAccessToken` → `c.set('userId', sub)`
- `src/routes/users.ts` — `GET /users/me` (auth 미들웨어 적용)

**수정 파일:**

- `src/app.ts` — `/users` 라우트 등록

**응답 구조:**

```json
{
  "data": {
    "id": "...",
    "email": "user@example.com",
    "name": "홍길동",
    "role": "user",
    "phone": "010-1234-5678"
  }
}
```

**오류 응답:**

- 토큰 없음/만료: `401 UNAUTHORIZED`
- 유저 미존재: `404 USER_NOT_FOUND`

### 프런트엔드 (`apps/web`)

**서비스 레이어:**

```
apps/web/src/services/user/queries.ts
  profileQueryOptions()  ← GET /users/me
```

**홈 화면 (`src/pages/home.tsx`):**

- `useQuery(profileQueryOptions())` — staleTime: 5분
- 로딩 중: 스켈레톤 or 로딩 텍스트
- 성공: 프로필 카드 렌더링 (이름, 이메일, 권한, 연락처)
- 실패(401): 로그아웃 처리 (현재 `clearAuth` + navigate 패턴 유지)

### 테스트 계획

**Vitest (API):** `apps/api/test/users/routes.test.ts`

- `GET /users/me` 정상 흐름: 유효한 Bearer 토큰 → 200 + 프로필 반환
- 토큰 없음 → 401 UNAUTHORIZED
- 유효하지 않은 토큰 → 401 UNAUTHORIZED
- DB 유저 미존재 → 404 USER_NOT_FOUND

**Playwright E2E:** `apps/web/e2e/user/profile.spec.ts`

- 로그인 후 홈 진입 → 프로필 4개 필드 렌더링 확인
- API 오류(401) → 로그아웃 리디렉션 확인

---

## 구현 파일 목록

| #   | 파일                                    | 작업 | 설명                                        |
| --- | --------------------------------------- | ---- | ------------------------------------------- |
| 1   | `apps/api/src/db/schema.ts`             | 수정 | `users` 테이블에 `phone` 컬럼 추가          |
| 2   | `packages/shared/src/schemas/user.ts`   | 수정 | `phone` 필드 + `ProfileResponseSchema` 추가 |
| 3   | `packages/shared/src/schemas/index.ts`  | 수정 | 신규 스키마/타입 export                     |
| 4   | `apps/api/src/middleware/auth.ts`       | 신규 | JWT Bearer 인증 미들웨어                    |
| 5   | `apps/api/src/routes/users.ts`          | 신규 | `GET /users/me` 라우트                      |
| 6   | `apps/api/src/app.ts`                   | 수정 | `/users` 라우트 등록                        |
| 7   | `apps/web/src/services/user/queries.ts` | 신규 | `profileQueryOptions()` 서비스 팩토리       |
| 8   | `apps/web/src/pages/home.tsx`           | 수정 | 프로필 조회 + 렌더링                        |
| 9   | `apps/web/e2e/mocks/user.ts`            | 신규 | `page.route()` 기반 프로필 API 목킹         |
| 10  | `apps/web/e2e/user/profile.spec.ts`     | 신규 | 홈 화면 프로필 렌더링 E2E                   |
| 11  | `apps/api/test/users/routes.test.ts`    | 신규 | `GET /users/me` Vitest 단위 테스트          |

**DB 마이그레이션 순서:**

```bash
# 1. 마이그레이션 파일 생성
pnpm --filter @vibe-bkit/api db:generate

# 2. 생성된 SQL 파일 수동 편집 — 기존 계정 데이터 마이그레이션 SQL 추가
#    (임시 DEFAULT → 테스트 계정 UPDATE → DEFAULT DROP)

# 3. 마이그레이션 적용
pnpm --filter @vibe-bkit/api db:migrate

# 4. seed 재실행 — onConflictDoUpdate로 테스트 계정 phone 값 확인/보정
pnpm --filter @vibe-bkit/api db:seed
```

---

## 제약 및 결정 사항

| 항목              | 결정                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| phone 포맷        | 한국 휴대폰 번호만 허용: `^010-\d{4}-\d{4}$`                                                           |
| phone 필수 여부   | DB NOT NULL, Zod required — 기존 계정은 마이그레이션 SQL에서 임시 DEFAULT → UPDATE → DROP DEFAULT 처리 |
| 인증 방식         | Authorization Bearer 헤더 (기존 `lib/api.ts`의 `injectToken` 활용)                                     |
| ProfileResponse   | 기존 `PublicUser`에 phone 추가 — 별도 타입 신설 없이 확장                                              |
| 홈 화면 쿼리 위치 | 단일 컴포넌트 사용 → `home.tsx` 내 인라인 `useQuery`                                                   |
| 로딩 UX           | 단순 텍스트 ("불러오는 중...") — 디자인 시스템 없는 현 단계에 적합                                     |
