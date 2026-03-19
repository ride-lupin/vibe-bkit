---
template: plan
version: 1.2
feature: dev-environment
date: 2026-03-19
author: lupin
project: vibe-bkit
status: Draft
---

# 백엔드/프론트엔드 개발 환경 구축 Planning Document

> **Summary**: Turborepo 모노레포 기반 React 19 + Vite (FE) / Hono.js (BE) 개발 환경 초기 구성
>
> **Project**: vibe-bkit
> **Version**: 0.1.0
> **Author**: lupin
> **Date**: 2026-03-19
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 빈 레포에서 프론트엔드(React 19+Vite)와 백엔드(Hono.js)를 동시에 개발할 수 있는 모노레포 구조가 없음 |
| **Solution** | Turborepo + pnpm workspace로 `apps/web`, `apps/api`, `packages/shared` 3개 패키지를 구성 |
| **Function/UX Effect** | `pnpm dev` 한 명령으로 FE+BE 동시 실행, 공유 타입·Zod 스키마를 즉시 활용 가능 |
| **Core Value** | 일관된 TypeScript strict 환경에서 FE/BE가 스키마를 공유하며 타입 안전하게 협업 |

---

## 1. Overview

### 1.1 Purpose

Turborepo 모노레포 환경을 구성하여 React 19 + Vite 프론트엔드와 Hono.js 백엔드를 단일 레포에서 효율적으로 개발할 수 있는 기반을 마련한다.

### 1.2 Background

- CLAUDE.md에 기술 스택이 정의되어 있으나 실제 코드 구조가 없는 상태
- FE/BE 공유 Zod 스키마 및 타입을 위한 `packages/shared` 패키지 필요
- Docker Compose로 PostgreSQL DB 로컬 실행 환경 필요
- turbo 파이프라인으로 캐시 기반 빌드 최적화 필요

### 1.3 Related Documents

- 기술 스택 정의: `CLAUDE.md`
- 코드 리뷰 기준: `.claude/agents/code-reviewer.md`

---

## 2. Scope

### 2.1 In Scope

- [ ] 루트 `package.json` + `pnpm-workspace.yaml` + `turbo.json` 설정
- [ ] `apps/web` — React 19 + Vite + TypeScript strict 초기화
- [ ] `apps/api` — Hono.js + TypeScript strict 초기화
- [ ] `packages/shared` — 공유 타입 및 Zod 스키마 패키지 초기화
- [ ] `docker-compose.yml` — PostgreSQL 로컬 DB 환경
- [ ] 루트 ESLint + Prettier 공통 설정
- [ ] Turbo 파이프라인 (`build`, `dev`, `lint`, `typecheck`) 설정
- [ ] 각 패키지 `tsconfig.json` (strict mode)
- [ ] `apps/web` Tailwind CSS v4 + Radix UI 초기 설정
- [ ] `apps/api` Drizzle ORM 초기 설정 (DB 연결)
- [ ] 루트 `.env.example` 작성

### 2.2 Out of Scope

- 실제 비즈니스 기능 구현 (인증, CRUD 등)
- Playwright E2E 테스트 설정
- CI/CD 파이프라인 (GitHub Actions)
- 프로덕션 배포 설정

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | `pnpm dev` 실행 시 FE(port 5173) + BE(port 3000) 동시 구동 | High | Pending |
| FR-02 | `packages/shared`의 타입/스키마를 FE·BE에서 import 가능 | High | Pending |
| FR-03 | `pnpm typecheck` 실행 시 전체 패키지 타입 검사 통과 | High | Pending |
| FR-04 | `pnpm build` 실행 시 Turbo 캐시 기반 전체 빌드 성공 | High | Pending |
| FR-05 | `docker-compose up -d` 로 PostgreSQL 로컬 DB 실행 | Medium | Pending |
| FR-06 | `apps/api`에서 Drizzle ORM으로 DB 연결 확인 | Medium | Pending |
| FR-07 | `pnpm lint` 실행 시 전체 패키지 lint 통과 | Medium | Pending |
| FR-08 | Tailwind CSS v4 및 Radix UI 기본 컴포넌트 렌더링 확인 | Medium | Pending |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| 개발 경험 | `pnpm dev` cold start < 5초 | 터미널 실행 시간 측정 |
| 타입 안전성 | TypeScript strict mode, `any` 금지 | `pnpm typecheck` 0 errors |
| 코드 품질 | ESLint 0 errors, Prettier 적용 | `pnpm lint` 통과 |
| 빌드 재현성 | Turbo 캐시로 재빌드 속도 80% 단축 | 캐시 히트율 |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 3개 패키지 (`apps/web`, `apps/api`, `packages/shared`) 초기화 완료
- [ ] `pnpm dev` 로 FE + BE 동시 실행 확인
- [ ] `packages/shared` → `apps/web`, `apps/api` import 동작 확인
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm build` 전부 통과
- [ ] PostgreSQL Docker 컨테이너 실행 및 Drizzle 연결 확인
- [ ] `.env.example` 작성 완료

### 4.2 Quality Criteria

- [ ] TypeScript strict mode 활성화 (모든 패키지)
- [ ] ESLint + Prettier 설정 (모든 패키지)
- [ ] `enum` 사용 없음 (문자열 리터럴 유니온 사용)
- [ ] `console.log` 없음

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Tailwind CSS v4 API 변경 (v3과 다름) | Medium | High | `@tailwindcss/vite` 플러그인 사용, v4 공식 문서 참조 |
| pnpm workspace 패키지 간 타입 해석 오류 | High | Medium | `tsconfig.json` `paths` 설정 및 `composite: true` 적용 |
| Drizzle ORM + Hono.js 버전 충돌 | Medium | Low | 최신 stable 버전 고정, lockfile 관리 |
| Docker PostgreSQL 포트 충돌 (5432) | Low | Low | `docker-compose.yml`에서 포트 커스터마이징 가능하도록 `.env` 변수 사용 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Selected |
|-------|-----------------|:--------:|
| **Starter** | 단순 구조 | ☐ |
| **Dynamic** | Feature 기반 모듈, BaaS 통합 | ☑ |
| **Enterprise** | 레이어 분리, DI, 마이크로서비스 | ☐ |

> **선택**: Dynamic — Turborepo 모노레포 구조이지만 현재 단계는 MVP 수준의 풀스택 앱

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| 모노레포 도구 | Turborepo / Nx / Lerna | **Turborepo** | 빠른 캐시 빌드, 설정 단순 |
| FE 프레임워크 | Next.js / React+Vite / Remix | **React 19 + Vite** | CLAUDE.md 정의 스택 |
| BE 프레임워크 | Express / Fastify / Hono | **Hono.js** | 경량, TypeScript 네이티브, Edge 지원 |
| 패키지 매니저 | npm / yarn / pnpm | **pnpm** | workspace 지원, 디스크 절약 |
| ORM | Prisma / Drizzle / TypeORM | **Drizzle ORM** | TypeScript 타입 안전, 경량 |
| 스타일링 | Tailwind v3 / Tailwind v4 / CSS Modules | **Tailwind CSS v4** | CLAUDE.md 정의 스택 |
| UI 컴포넌트 | shadcn/ui / Radix UI / MUI | **Radix UI** | 접근성 + 커스터마이징 |

### 6.3 Monorepo Folder Structure

```
vibe-bkit/
├── apps/
│   ├── web/                    # React 19 + Vite
│   │   ├── src/
│   │   │   ├── components/     # 공통 UI 컴포넌트
│   │   │   ├── features/       # 기능별 모듈
│   │   │   ├── lib/            # 유틸리티, API 클라이언트 (ky)
│   │   │   ├── stores/         # Zustand 스토어
│   │   │   ├── routes/         # react-router-dom v7 라우트
│   │   │   ├── types/          # FE 전용 타입
│   │   │   └── main.tsx
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/                    # Hono.js
│       ├── src/
│       │   ├── routes/         # Hono 라우터
│       │   ├── middleware/     # 인증, 로깅 등
│       │   ├── db/             # Drizzle 스키마 + migrations
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/                 # 공유 패키지
│       ├── src/
│       │   ├── schemas/        # Zod 스키마 (FE/BE 공유)
│       │   ├── types/          # 공유 TypeScript 타입
│       │   └── utils/          # 공유 유틸리티
│       ├── tsconfig.json
│       └── package.json
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
└── CLAUDE.md
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` 코딩 컨벤션 섹션 존재
- [ ] ESLint 설정 (구성 예정)
- [ ] Prettier 설정 (구성 예정)
- [ ] TypeScript 설정 (구성 예정)

### 7.2 Conventions to Define

| Category | Rule | Priority |
|----------|------|:--------:|
| **타입** | `type` 선호, `interface` 자제, `enum` 절대 금지 | High |
| **네이밍** | 컴포넌트: PascalCase, 파일: kebab-case | High |
| **폴더** | 기능별 모듈 (`features/`) 구조 | High |
| **환경변수** | FE: `VITE_` 접두사, BE: 접두사 없음 | High |
| **에러처리** | Hono `HTTPException`, FE `React Query` 에러 바운더리 | Medium |

### 7.3 Environment Variables

| Variable | Purpose | Scope |
|----------|---------|-------|
| `VITE_API_URL` | BE API 엔드포인트 | FE Client |
| `DATABASE_URL` | PostgreSQL 연결 문자열 | BE Server |
| `POSTGRES_USER` | DB 사용자명 | Docker |
| `POSTGRES_PASSWORD` | DB 비밀번호 | Docker |
| `POSTGRES_DB` | DB 이름 | Docker |
| `PORT` | API 서버 포트 (기본 3000) | BE Server |

---

## 8. Implementation Order

1. **루트 설정** — `pnpm-workspace.yaml`, `turbo.json`, 루트 `package.json`
2. **packages/shared** — TypeScript 패키지 초기화, Zod 설치
3. **apps/api** — Hono.js + Drizzle ORM + TypeScript 초기화
4. **apps/web** — React 19 + Vite + Tailwind v4 + Radix UI 초기화
5. **docker-compose.yml** — PostgreSQL 서비스 정의
6. **공통 설정** — ESLint + Prettier (루트), `.env.example`
7. **연결 확인** — `pnpm dev` 실행, shared import 테스트, DB 연결 확인

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`dev-environment.design.md`)
2. [ ] 구현 시작 (`/pdca do dev-environment`)

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft | lupin |
