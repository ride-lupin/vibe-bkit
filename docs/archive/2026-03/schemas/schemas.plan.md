---
template: plan
version: 1.2
feature: schemas
date: 2026-03-19
author: CTO Lead (Enterprise Team)
project: vibe-bkit
status: Approved
---

# Shared Zod Schemas Planning Document

> **Summary**: packages/shared에 FE/BE 공유 Zod 스키마 체계를 구축하여 타입 안전한 풀스택 데이터 검증 레이어를 완성한다
>
> **Project**: vibe-bkit
> **Version**: 0.0.1
> **Author**: CTO Lead (Enterprise Team)
> **Date**: 2026-03-19
> **Status**: Approved

---

## Executive Summary

| Perspective            | Content                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Problem**            | 현재 HealthSchema 하나만 존재. 도메인 스키마(User, Todo 등)가 없어 FE/BE 간 타입 불일치 위험이 높고, API 요청/응답 검증이 불가능              |
| **Solution**           | packages/shared에 도메인별 Zod 스키마 카탈로그를 구축하고, API 요청/응답/에러 공통 스키마를 정의하여 FE/BE가 단일 소스에서 타입과 검증을 공유 |
| **Function/UX Effect** | 런타임 데이터 검증으로 잘못된 데이터 유입 차단, react-hook-form + Zod resolver로 실시간 폼 검증 UX 제공                                       |
| **Core Value**         | 단일 스키마 정의로 FE 타입, BE 검증, DB 스키마 간 일관성 보장 (Single Source of Truth)                                                        |

---

## 1. Overview

### 1.1 Purpose

Turborepo 모노레포의 packages/shared 패키지에 완전한 Zod 스키마 체계를 구축하여:

- FE/BE 간 데이터 계약(Data Contract)을 코드로 정의
- 런타임 타입 검증을 통한 안전한 API 통신
- react-hook-form + Zod resolver 기반 폼 검증 지원
- Drizzle ORM DB 스키마와의 일관성 확보

### 1.2 Background

- dev-environment PDCA에서 Turborepo + pnpm workspace 환경 구축 완료
- packages/shared에 HealthSchema만 존재하는 초기 상태
- CLAUDE.md에서 "Zod 스키마는 packages/shared에 정의하여 FE/BE 공유" 규칙 명시
- 향후 모든 기능 개발(User, Todo 등)의 기반이 되는 스키마 인프라 필요

### 1.3 Related Documents

- Design: [schemas.design.md](../../02-design/features/schemas.design.md)
- Archive: [dev-environment.design.md](../../archive/2026-03/dev-environment/dev-environment.design.md)
- Convention: CLAUDE.md (프로젝트 루트)

---

## 2. Scope

### 2.1 In Scope

- [x] 공통 스키마: 타임스탬프, 페이지네이션, API 응답/에러 래퍼
- [x] User 도메인 스키마: 생성, 수정, 로그인, 프로필
- [x] Todo 도메인 스키마: 생성, 수정, 필터, 상태
- [x] 스키마에서 자동 추론된 TypeScript 타입 export
- [x] 파일별 모듈 분리 및 barrel export 구조
- [x] 기존 HealthSchema 유지 및 공통 패턴 적용

### 2.2 Out of Scope

- Drizzle ORM DB 스키마 변경 (별도 PDCA)
- API 라우트 구현 (별도 PDCA)
- FE 폼 컴포넌트 구현 (별도 PDCA)
- 인증/인가 미들웨어 구현 (별도 PDCA)
- E2E 테스트 (별도 PDCA)

---

## 3. Requirements

### 3.1 Functional Requirements

| ID    | Requirement                                            | Priority | Status  |
| ----- | ------------------------------------------------------ | -------- | ------- |
| FR-01 | 공통 타임스탬프 필드 스키마 (id, createdAt, updatedAt) | High     | Pending |
| FR-02 | API 응답 래퍼 스키마 (data + meta)                     | High     | Pending |
| FR-03 | API 에러 응답 스키마 (code, message, details)          | High     | Pending |
| FR-04 | 페이지네이션 요청/응답 스키마                          | Medium   | Pending |
| FR-05 | User 스키마 (기본, 생성, 수정, 로그인)                 | High     | Pending |
| FR-06 | Todo 스키마 (기본, 생성, 수정, 필터)                   | High     | Pending |
| FR-07 | 모든 스키마에서 z.infer 타입 자동 추론 및 export       | High     | Pending |
| FR-08 | 기존 HealthSchema 유지                                 | High     | Pending |

### 3.2 Non-Functional Requirements

| Category         | Criteria                                                      | Measurement Method |
| ---------------- | ------------------------------------------------------------- | ------------------ |
| 타입 안전성      | `any` 타입 0건, TypeScript strict mode 통과                   | `pnpm typecheck`   |
| 번들 크기        | Zod tree-shaking 유지, 불필요한 의존성 추가 없음              | Vite build 분석    |
| DX (개발자 경험) | import 자동완성, 스키마 기반 IDE 지원                         | TypeScript LSP     |
| 코드 컨벤션      | CLAUDE.md 규칙 준수 (type 사용, enum 금지, kebab-case 파일명) | 코드 리뷰          |
| 재사용성         | 모든 스키마가 FE/BE 양쪽에서 동일하게 사용 가능               | import 테스트      |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 모든 FR 항목 구현 완료
- [ ] `pnpm typecheck` 0 errors
- [ ] `pnpm lint` 0 errors
- [ ] `pnpm build` 성공
- [ ] apps/api에서 `@vibe-bkit/shared` 스키마 import 가능
- [ ] apps/web에서 `@vibe-bkit/shared` 스키마/타입 import 가능
- [ ] Design 문서 작성 완료

### 4.2 Quality Criteria

- [ ] enum 사용 0건 (문자열 리터럴 유니온만 사용)
- [ ] interface 사용 0건 (type만 사용)
- [ ] 모든 타입이 z.infer로 추론 (수동 타입 정의 금지)
- [ ] barrel export로 깔끔한 import path 제공

---

## 5. Risks and Mitigation

| Risk                                  | Impact | Likelihood | Mitigation                                                  |
| ------------------------------------- | ------ | ---------- | ----------------------------------------------------------- |
| Zod 스키마와 Drizzle DB 스키마 불일치 | High   | Medium     | 공통 필드 규약 정의, 향후 drizzle-zod 연동 검토             |
| 스키마 과도한 세분화로 복잡성 증가    | Medium | Low        | 도메인당 단일 파일 원칙, compose 패턴 활용                  |
| FE/BE 스키마 사용 패턴 차이           | Medium | Medium     | base/create/update 분리, FE는 form 용도, BE는 validate 용도 |
| 순환 의존성 발생                      | High   | Low        | 공통 -> 도메인 단방향 의존만 허용, barrel export 설계       |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level          | Characteristics             | Recommended For       | Selected |
| -------------- | --------------------------- | --------------------- | :------: |
| **Starter**    | Simple structure            | Static sites          |          |
| **Dynamic**    | Feature-based modules       | Web apps with backend |          |
| **Enterprise** | Strict layer separation, DI | High-traffic systems  |    X     |

### 6.2 Key Architectural Decisions

| Decision          | Options                             | Selected             | Rationale                                             |
| ----------------- | ----------------------------------- | -------------------- | ----------------------------------------------------- |
| 스키마 라이브러리 | Zod / Yup / Valibot                 | Zod                  | CLAUDE.md 명시, FE/BE 양쪽 지원, TypeScript 추론 우수 |
| 타입 정의 방식    | 수동 type / z.infer 추론            | z.infer              | 스키마와 타입 동기화 보장, 중복 제거                  |
| 파일 구조         | 단일 파일 / 도메인별 분리           | 도메인별 분리        | 확장성, 관심사 분리, 코드 탐색 용이                   |
| Export 전략       | named export / barrel               | barrel export        | 깔끔한 import path, tree-shaking 유지                 |
| enum 대안         | enum / const object / literal union | 문자열 리터럴 유니온 | CLAUDE.md "enum 절대 금지" 규칙                       |

### 6.3 스키마 계층 구조

```
packages/shared/src/schemas/
  common.ts        -- 공통 필드, 래퍼, 유틸리티 스키마
  user.ts          -- User 도메인 스키마
  todo.ts          -- Todo 도메인 스키마
  index.ts         -- barrel export (기존 HealthSchema 포함)
```

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` has coding conventions section
- [x] ESLint configuration
- [x] Prettier configuration
- [x] TypeScript configuration (`tsconfig.json`)

### 7.2 Conventions to Define/Verify

| Category          | Current State       | To Define                              | Priority |
| ----------------- | ------------------- | -------------------------------------- | :------: |
| **스키마 네이밍** | HealthSchema 존재   | `{Domain}{Purpose}Schema` (PascalCase) |   High   |
| **타입 네이밍**   | Health 존재         | `{Domain}{Purpose}` -- z.infer 추론    |   High   |
| **파일명**        | index.ts            | kebab-case (`user.ts`, `common.ts`)    |   High   |
| **리터럴 유니온** | 없음                | `z.enum()` + as const 패턴 정의        |   High   |
| **Import 패턴**   | `@vibe-bkit/shared` | 기존 barrel export 유지                |  Medium  |

### 7.3 스키마 네이밍 규칙 (이 프로젝트에서 사용할 패턴)

```
Schema Naming:
  Base entity:    {Domain}Schema          (UserSchema, TodoSchema)
  Create input:   Create{Domain}Schema    (CreateUserSchema)
  Update input:   Update{Domain}Schema    (UpdateTodoSchema)
  Response:       {Domain}ResponseSchema  (only if different from base)

Type Naming (z.infer):
  Base entity:    {Domain}                (User, Todo)
  Create input:   Create{Domain}          (CreateUser)
  Update input:   Update{Domain}          (UpdateTodo)

Literal Unions:
  Values:         {DOMAIN}_{FIELD} array  (TODO_STATUS)
  Schema:         {Domain}{Field}Schema   (TodoStatusSchema)
```

---

## 8. Next Steps

1. [x] Plan 문서 작성 (본 문서)
2. [ ] Design 문서 작성 (`schemas.design.md`)
3. [ ] 구현 (Do 단계)
4. [ ] 검증 (Check 단계)
5. [ ] 완료 보고서 (Report)

---

## Version History

| Version | Date       | Changes                          | Author   |
| ------- | ---------- | -------------------------------- | -------- |
| 0.1     | 2026-03-19 | Initial draft                    | CTO Lead |
| 1.0     | 2026-03-19 | Approved -- proceeding to Design | CTO Lead |
