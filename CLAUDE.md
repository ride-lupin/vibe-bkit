# Development Workflow

## 프로젝트 개요

Turborepo 모노레포 기반 풀스택 웹 애플리케이션 (React 19 + Vite + Hono.js)

## 기술 스택

| 영역            | 기술                                      |
| --------------- | ----------------------------------------- |
| 모노레포        | Turborepo + pnpm                          |
| 프런트엔드      | React 19 + Vite + TypeScript strict       |
| 스타일링        | Tailwind CSS v4 + Radix UI                |
| 서버 상태       | React Query v5                            |
| 클라이언트 상태 | Zustand + persist                         |
| 검증            | Zod (FE/BE 공유)                          |
| 폼              | react-hook-form + @hookform/resolvers/zod |
| HTTP 클라이언트 | ky                                        |
| 백엔드          | Hono.js                                   |
| ORM             | Drizzle ORM                               |
| DB              | PostgreSQL (Docker Compose)               |
| E2E 테스트      | Playwright                                |
| API 테스트      | Vitest                                    |
| 라우터          | react-router-dom v7                       |

## 패키지 관리

- **항상 `pnpm` 사용** (`npm`, `yarn`, `bun` 금지)
- 새 패키지 추가: `pnpm add {package}`
- 개발 의존성: `pnpm add -D {package}`
- 워크스페이스 루트: `pnpm add -w {package}`

### shared 패키지 타입 해석

`packages/shared/package.json`의 `exports.".".types`는 `./src/index.ts`(소스 직접)로 설정되어 있다.
TypeScript가 항상 소스에서 타입을 해석하므로, **shared 수정 후 별도 빌드 없이 즉시 타입 반영**된다.
`dist/`는 외부 npm 배포 시에만 사용된다. 이 설정을 `./dist/index.d.ts`로 되돌리지 말 것.

## 개발 순서

1. 변경 사항 작성
2. 타입체크: `pnpm typecheck`
3. 린트: `pnpm lint`
4. 테스트: `pnpm test` — API 단위테스트(Vitest) + 프런트 E2E(Playwright)
   - API만: `pnpm --filter @vibe-bkit/api test`
   - Web만: `pnpm --filter @vibe-bkit/web test`
5. 빌드 확인: `pnpm build`

## 프로젝트 구조

```
/
├── CLAUDE.md
├── apps/
│   ├── web/                    # React 19 + Vite 프런트엔드
│   │   ├── playwright.config.ts
│   │   ├── e2e/                # Playwright E2E 테스트
│   │   │   ├── mocks/          # page.route() API 모킹
│   │   │   └── auth/           # 인증 E2E 시나리오
│   │   └── src/
│   │       ├── services/       # API 옵션 팩토리 ({domain}/queries.ts)
│   │       └── hooks/          # 공통 훅 ({domain}/{hookName}.ts)
│   └── api/                    # Hono.js 백엔드
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── app.ts          # Hono app 팩토리 (serve 제외)
│       │   └── index.ts        # serve() 진입점
│       └── test/               # Vitest 단위테스트
│           └── auth/           # JWT/인증 유닛 테스트
├── docs/
│   ├── 01-plan/features/       # PDCA Plan 문서
│   ├── 02-design/features/     # PDCA Design 문서
│   ├── 03-analysis/features/   # PDCA Analysis 문서
│   ├── 04-report/features/     # PDCA Report 문서
│   └── archive/                # 완료된 PDCA 아카이브
├── packages/
│   └── shared/                 # 공유 타입, Zod 스키마, 유틸리티
├── turbo.json                  # Turborepo 설정
└── pnpm-workspace.yaml
```

## 코딩 컨벤션

- `type` 선호, `interface` 자제
- **`enum` 절대 금지** → 문자열 리터럴 유니온 사용
- 컴포넌트: PascalCase, 파일: kebab-case
- Zod 스키마는 `packages/shared`에 정의하여 FE/BE 공유
- 폼 검증은 반드시 react-hook-form + Zod resolver 사용

### 프런트엔드 서비스 레이어

- API 호출 로직은 `services/{domain}/queries.ts`에 옵션 팩토리로 선언
  - `mutationFn`만 포함, `React` import 없음, 부수 효과 없음
  - 뮤테이션: `{action}MutationOptions()` 네이밍
  - 쿼리: `{resource}QueryOptions()` 네이밍
- React Query 훅(`useMutation` / `useQuery`) 선언 위치:
  - 단 1개 컴포넌트에서만 사용 → 해당 컴포넌트 내부 인라인
  - 2개 이상 컴포넌트에서 공통 사용 → `hooks/{domain}/{hookName}.ts`에 추출

## 금지 사항

- ❌ `console.log` 사용 (개발 중 임시 사용 후 반드시 제거)
- ❌ `any` 타입 사용
- ❌ `npm` 또는 `yarn` 명령어 사용
- ❌ 테스트 없이 주요 기능 커밋
- ❌ .env 파일 커밋 (환경변수는 .env.local 사용)
- ❌ 하드코딩된 URL이나 API 키

## Git 규칙

- 브랜치: `feat/`, `fix/`, `chore/` 접두사 사용
- 커밋 메시지: 한국어 또는 영어, 명령형으로 작성
- PR 전 반드시 typecheck + lint + test 통과

## 환경 변수

- 민감 정보는 반드시 `.env.local`에 보관
- 공개 변수만 `VITE_` 접두사 사용 (프런트엔드)
