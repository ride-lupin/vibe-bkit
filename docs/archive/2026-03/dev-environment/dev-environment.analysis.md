---
template: analysis
version: 1.2
feature: dev-environment
date: 2026-03-19
author: gap-detector
project: vibe-bkit
matchRate: 95
---

# dev-environment Gap Analysis

> **Summary**: Design 문서 대비 구현 일치율 95% — migrate.ts 사후 구현으로 상향, Minor Gap 1개 잔존 (허용)
>
> **Project**: vibe-bkit
> **Date**: 2026-03-19
> **Design Doc**: [dev-environment.design.md](../02-design/features/dev-environment.design.md)

---

## 1. Executive Summary

| 항목          | 내용                                                             |
| ------------- | ---------------------------------------------------------------- |
| Match Rate    | **95%** (22개 항목 중 21개 완전 구현, migrate.ts 사후 구현 반영) |
| Critical Gaps | 0개                                                              |
| Minor Gaps    | 1개 (middleware/logger.ts 구조적 차이, 기능 동일)                |
| Resolved Gaps | 1개 (GAP-02 migrate.ts — 사후 구현 완료)                         |
| Enhancements  | 5개 (Design 초과 구현)                                           |
| 결론          | **통과** — 리포트 단계 완료                                      |

---

## 2. 체크리스트 전체 결과

### 2.1 루트 설정 (3/3 ✅)

| 항목                  | 기대                                              | 실제                  | 상태 |
| --------------------- | ------------------------------------------------- | --------------------- | ---- |
| `pnpm-workspace.yaml` | `apps/*`, `packages/*`                            | 동일                  | ✅   |
| `turbo.json`          | build/dev/lint/typecheck/test 파이프라인          | 동일 (`ui: tui` 포함) | ✅   |
| 루트 `package.json`   | `"packageManager": "pnpm@9.15.4"`, turbo 스크립트 | 동일                  | ✅   |

### 2.2 packages/shared (3/3 ✅)

| 항목                   | 기대                                     | 실제   | 상태 |
| ---------------------- | ---------------------------------------- | ------ | ---- |
| `src/schemas/index.ts` | `HealthSchema`, `Health` 타입            | 동일   | ✅   |
| `src/types/index.ts`   | 공유 타입 export                         | 구현됨 | ✅   |
| `src/index.ts`         | `export * from './schemas'`, `'./types'` | 동일   | ✅   |

### 2.3 apps/api (6/8 ✅, 2 ⚠️)

| 항목                       | 기대                            | 실제                           | 상태 |
| -------------------------- | ------------------------------- | ------------------------------ | ---- |
| `src/index.ts`             | Hono app, logger, error handler | logger + cors + onError 구현   | ✅   |
| `src/routes/health.ts`     | GET / → HealthSchema.parse      | 동일                           | ✅   |
| `src/db/index.ts`          | Drizzle + postgres.js 연결      | 동일                           | ✅   |
| `src/db/schema.ts`         | `healthLogs` pgTable            | 동일                           | ✅   |
| `drizzle.config.ts`        | schema, dialect, dbCredentials  | 동일                           | ✅   |
| `src/middleware/logger.ts` | 커스텀 미들웨어 파일            | `hono/logger` 빌트인 직접 사용 | ⚠️   |
| `src/db/migrate.ts`        | 마이그레이션 실행 파일          | 사후 구현 완료                 | ✅   |
| `tsconfig.json`            | strict, ES2022, bundler         | `skipLibCheck: true` 추가      | ✅   |

### 2.4 apps/web (6/6 ✅)

| 항목             | 기대                                        | 실제                      | 상태 |
| ---------------- | ------------------------------------------- | ------------------------- | ---- |
| `src/main.tsx`   | QueryClient, BrowserRouter, Theme, Devtools | 동일 + `defaultOptions`   | ✅   |
| `src/lib/api.ts` | ky + `VITE_API_URL` fallback                | 동일                      | ✅   |
| `vite.config.ts` | Tailwind v4, react, path alias, proxy       | 동일                      | ✅   |
| `src/App.tsx`    | health 쿼리 UI                              | 동일 + `isError` 처리     | ✅   |
| `src/index.css`  | `@import "tailwindcss"`, Radix styles       | 동일                      | ✅   |
| `tsconfig.json`  | strict, jsx, paths                          | `skipLibCheck: true` 추가 | ✅   |

### 2.5 인프라 & 공통 (4/4 ✅)

| 항목                 | 기대                                      | 실제   | 상태 |
| -------------------- | ----------------------------------------- | ------ | ---- |
| `docker-compose.yml` | PostgreSQL 16, healthcheck, volume        | 동일   | ✅   |
| `.env.example`       | VITE_API_URL, PORT, DATABASE_URL, PG 변수 | 동일   | ✅   |
| `eslint.config.js`   | 루트 ESLint 설정                          | 구현됨 | ✅   |
| `.prettierrc`        | Prettier 설정                             | 구현됨 | ✅   |

### 2.6 기능 검증 (4/4 ✅)

| 항목                                                   | 결과                                  |
| ------------------------------------------------------ | ------------------------------------- |
| `GET http://localhost:3000/health` → `{"status":"ok"}` | ✅ 확인                               |
| `http://localhost:5173` React 앱 렌더링                | ✅ 확인                               |
| `pnpm typecheck` 전체 0 errors                         | ✅ 확인                               |
| FE ↔ BE CORS 연결                                      | ✅ 확인 (cors 미들웨어 수정으로 해결) |

---

## 3. Gap 상세

### GAP-01 — `apps/api/src/middleware/logger.ts` 미생성

| 항목       | 내용                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| **심각도** | Low                                                                     |
| **영향**   | 없음                                                                    |
| **기대**   | 커스텀 `middleware/logger.ts` 파일 생성 후 import                       |
| **실제**   | `hono/logger` 빌트인 미들웨어를 `src/index.ts`에서 직접 import          |
| **판단**   | 기능적으로 동일. 별도 파일 분리는 향후 미들웨어 확장 시 고려            |
| **권고**   | 현재 스코프(개발 환경 구축)에서 허용 — 실제 기능 개발 단계에서 리팩토링 |

### ~~GAP-02~~ RESOLVED — `apps/api/src/db/migrate.ts` 사후 구현 완료

| 항목       | 내용                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| **심각도** | ~~Low~~ → **Resolved**                                                                                |
| **기대**   | `tsx src/db/migrate.ts` 실행 가능한 마이그레이션 스크립트                                             |
| **실제**   | Check 단계 Gap 분석 후 즉시 구현. `drizzle-orm/postgres-js/migrator` 기반, 단일 커넥션(`max: 1`) 사용 |
| **해결일** | 2026-03-19                                                                                            |

---

## 4. Design 초과 구현 (Enhancements)

| 항목                         | 내용                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| CORS 미들웨어                | Design 6절 요구사항 선구현. `app.use('*', cors({...}))` 추가           |
| QueryClient `defaultOptions` | Design 5.2절 FE 에러 처리 전략 구현. `retry: 1 / 0` 설정               |
| `isError` UI 처리            | `App.tsx`에 API 연결 실패 빨간 텍스트 표시 추가                        |
| `skipLibCheck: true`         | 서드파티 라이브러리(drizzle-orm, @tanstack/react-query) 타입 호환 해결 |
| `vite-env.d.ts`              | `import.meta.env` 타입 오류 해결을 위한 Vite 타입 참조 추가            |

---

## 5. 코드 품질 스캔

| 항목               | 결과                                                                                |
| ------------------ | ----------------------------------------------------------------------------------- |
| `any` 타입 사용    | 0건 ✅                                                                              |
| `console.log` 사용 | 0건 ✅                                                                              |
| 하드코딩 URL       | 2건 (허용) — `cors` origin (`localhost:5173`), `api.ts` fallback (`localhost:3000`) |
| TypeScript strict  | 전 패키지 적용 ✅                                                                   |
| `enum` 사용        | 0건 ✅                                                                              |
| `interface` 사용   | 0건 (모두 `type` 또는 Zod infer) ✅                                                 |

> **하드코딩 URL 판단**: 두 항목 모두 개발 환경 로컬 주소이며, `.env.example`을 통해 환경변수로 재정의 가능. 허용.

---

## 6. 결론 및 다음 단계

```
Match Rate: 95% ✅ (GAP-02 사후 구현 반영)

[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ → [Report] ✅
```

**상태**: PDCA 사이클 완료. 보고서: `docs/04-report/features/dev-environment.report.md`

---

## Version History

| Version | Date       | Changes              | Author       |
| ------- | ---------- | -------------------- | ------------ |
| 0.1     | 2026-03-19 | Initial gap analysis | gap-detector |
