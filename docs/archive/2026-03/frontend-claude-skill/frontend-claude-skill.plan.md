---
template: plan
version: 1.2
feature: frontend-claude-skill
date: 2026-03-23
author: lupin
project: vibe-bkit
---

# frontend-claude-skill Planning Document

> **Summary**: 전역 설치된 프론트엔드 스킬이 실제 작업 시 일관되게 참조되도록 프로젝트 Claude 설정을 구성한다.
>
> **Project**: vibe-bkit
> **Author**: lupin
> **Date**: 2026-03-23
> **Status**: Draft

---

## Executive Summary

| Perspective            | Content                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Problem**            | 전역 경로에 설치된 스킬(vercel-react-best-practices 등)이 실제 작업 시 Claude에 의해 자동 참조된다는 보장이 없음 |
| **Solution**           | CLAUDE.md에 스킬 참조 규칙 명시 + 프로젝트 로컬 프론트엔드 스탠다드 스킬 생성으로 이중 보장                      |
| **Function/UX Effect** | 모든 프론트엔드 작업(컴포넌트 작성, 리팩토링, 코드 리뷰)에서 일관된 품질 기준이 자동 적용됨                      |
| **Core Value**         | "설치했으니 쓰겠지"가 아닌 "반드시 쓴다"는 명시적 규칙으로 코드 품질 기준의 신뢰성 확보                          |

---

## 1. Overview

### 1.1 Purpose

전역 설치된 프론트엔드 관련 스킬들이 Claude Code 작업 시 일관되게 참조되도록 프로젝트 수준의 설정을 구성한다.

스킬 설치만으로는 Claude가 실제 작업 시 해당 스킬을 참조한다는 보장이 없다. 컨텍스트 창 길이, 키워드 매칭 실패, 스킬 간 우선순위 충돌 등으로 인해 중요한 가이드라인이 누락될 수 있다.

### 1.2 Background

현재 전역(`~/.claude/skills/`)에 설치된 프론트엔드 관련 스킬:

| 스킬                          | 용도                        | 적용 범위                               |
| ----------------------------- | --------------------------- | --------------------------------------- |
| `vercel-react-best-practices` | React 성능 최적화 58개 규칙 | React 컴포넌트 (Next.js 규칙 일부 제외) |
| `web-design-guidelines`       | Web UI 가이드라인, 접근성   | UI 컴포넌트 전반                        |
| `react-pr-review`             | React PR 코드 리뷰 기준     | 코드 리뷰 시                            |
| `frontend-design`             | 프로덕션급 UI 설계          | 새 컴포넌트/페이지 설계 시              |

이 프로젝트는 **React 19 + Vite** 기반으로 Next.js가 아니므로, `vercel-react-best-practices`의 Next.js 전용 규칙(RSC, next/dynamic 등)은 제외하고 범용 React 규칙만 선별 적용해야 한다.

### 1.3 Related Documents

- CLAUDE.md: 현재 코딩 컨벤션 정의 (스킬 참조 섹션 없음)
- 프로젝트 스택: React 19 + Vite + TypeScript strict + Tailwind CSS v4 + Radix UI

---

## 2. Scope

### 2.1 In Scope

- [x] CLAUDE.md에 프론트엔드 스킬 참조 규칙 섹션 추가
- [x] 프로젝트 로컬 스킬 생성: `apps/web/.claude/skills/frontend-standards/`
  - vercel-react-best-practices에서 React 19 + Vite에 적용 가능한 규칙 선별
  - web-design-guidelines 핵심 규칙 통합
  - 프로젝트 스택(Tailwind v4, Radix UI, React Query v5) 특화 규칙 추가
- [x] 스킬 적용 트리거 조건 명시 (언제 어떤 스킬을 참조해야 하는지)

### 2.2 Out of Scope

- Next.js 전용 규칙 (RSC, Server Actions, next/dynamic, next/image 등)
- 백엔드(Hono.js) 관련 스킬 설정
- 자동 CI/CD 스킬 적용 (GitHub Actions 연동)
- 새 스킬 마켓플레이스 등록

---

## 3. Requirements

### 3.1 Functional Requirements

| ID    | Requirement                                                          | Priority | Status  |
| ----- | -------------------------------------------------------------------- | -------- | ------- |
| FR-01 | CLAUDE.md에 "프론트엔드 작업 시 반드시 참조할 스킬" 섹션 추가        | High     | Pending |
| FR-02 | 로컬 스킬 `frontend-standards` 생성 (React 19 + Vite 특화 규칙 포함) | High     | Pending |
| FR-03 | 스킬 적용 트리거 조건 정의 (컴포넌트 작성/수정/리뷰 시 자동 발동)    | High     | Pending |
| FR-04 | vercel-react-best-practices에서 Vite 호환 규칙 선별 문서화           | Medium   | Pending |
| FR-05 | Radix UI + Tailwind CSS v4 관련 컴포넌트 패턴 가이드 포함            | Medium   | Pending |
| FR-06 | React Query v5 데이터 패칭 패턴 규칙 포함                            | Medium   | Pending |

### 3.2 Non-Functional Requirements

| Category   | Criteria                                       | Measurement Method              |
| ---------- | ---------------------------------------------- | ------------------------------- |
| 일관성     | 모든 프론트엔드 작업에서 동일한 기준 적용      | 코드 리뷰 시 규칙 위반 0건 목표 |
| 유지보수성 | 스킬 규칙 업데이트가 1개 파일 수정으로 반영    | 로컬 스킬 파일 단일 진입점      |
| 명시성     | "왜 이 스킬을 참조하는가"가 CLAUDE.md에 명문화 | CLAUDE.md 스킬 섹션 존재 여부   |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] CLAUDE.md에 "프론트엔드 스킬 참조" 섹션이 추가됨
- [ ] `apps/web/.claude/skills/frontend-standards/SKILL.md` 파일이 생성됨
- [ ] 로컬 스킬이 React 19 + Vite 적용 가능한 규칙만 포함함 (Next.js 전용 제외)
- [ ] 스킬 트리거 조건이 명시적으로 정의됨

### 4.2 Quality Criteria

- [ ] CLAUDE.md 변경이 기존 컨벤션과 충돌하지 않음
- [ ] 로컬 스킬 파일이 Skills 2.0 frontmatter 형식 준수
- [ ] `pnpm typecheck && pnpm lint` 통과 (CLAUDE.md는 코드가 아니므로 로컬 스킬 파일 검증)

---

## 5. Risks and Mitigation

| Risk                                                     | Impact | Likelihood | Mitigation                                           |
| -------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------- |
| vercel-react-best-practices의 Next.js 규칙이 잘못 적용됨 | Medium | High       | 로컬 스킬에서 적용 가능한 규칙만 명시적으로 선별     |
| CLAUDE.md가 너무 길어져 컨텍스트 오버헤드 증가           | Low    | Medium     | 스킬 참조 규칙은 간결하게 (3-5줄) 유지               |
| 로컬 스킬과 전역 스킬 간 규칙 충돌                       | Medium | Low        | 로컬 스킬이 전역 스킬을 보완(추가)하는 방식으로 설계 |

---

## 6. Architecture Considerations

### 6.1 스킬 계층 구조

```
전역 스킬 (~/.claude/skills/)
  └── vercel-react-best-practices  ← 참조는 하되, Next.js 규칙 제외
  └── web-design-guidelines        ← UI 리뷰 시 명시적 호출
  └── react-pr-review              ← PR 리뷰 시 명시적 호출
  └── frontend-design              ← 새 UI 설계 시 자동 참조

프로젝트 로컬 스킬 (apps/web/.claude/skills/)
  └── frontend-standards/          ← NEW: 이 프로젝트 특화 규칙 집합
        └── SKILL.md               ← React 19 + Vite + Tailwind v4 규칙
```

### 6.2 CLAUDE.md 스킬 참조 섹션 구조

```markdown
## 프론트엔드 스킬 참조 규칙

### 자동 참조 (작업 시작 전 항상 확인)

- React 컴포넌트 작성/수정 시: `vercel-react-best-practices` (React 범용 규칙)
- 새 UI 설계 시: `frontend-design` 스킬 원칙 준수

### 명시적 호출

- UI 코드 리뷰 요청 시: `/web-design-guidelines` 실행
- PR 리뷰 시: `/react-pr-review` 실행
```

### 6.3 로컬 스킬 설계 방향

- **파일 위치**: `apps/web/.claude/skills/frontend-standards/SKILL.md`
- **트리거**: React 컴포넌트 작성, 수정, 리뷰 시 자동 발동
- **내용 구성**:
  1. vercel-react-best-practices에서 Vite 호환 규칙 선별 (waterfall 제거, re-render 최적화 등)
  2. Tailwind CSS v4 클래스 네이밍 패턴
  3. Radix UI 접근성 패턴
  4. React Query v5 데이터 패칭 패턴 (이 프로젝트 서비스 레이어 연계)

---

## 7. Convention Prerequisites

### 7.1 Existing Project Conventions

- [x] `CLAUDE.md` 코딩 컨벤션 섹션 존재 (스킬 참조 섹션은 없음)
- [x] ESLint 설정 존재
- [x] TypeScript strict 설정 존재
- [ ] 프론트엔드 전용 스킬 설정 없음 → 이번 작업으로 추가

### 7.2 vercel-react-best-practices 적용 가능 규칙 (Vite 환경)

| 카테고리           | 규칙                                          |    Vite 적용 여부    |
| ------------------ | --------------------------------------------- | :------------------: |
| Waterfall 제거     | `async-parallel`, `async-defer-await`         |          O           |
| Re-render 최적화   | `rerender-*` 전체                             |          O           |
| JS 성능            | `js-*` 전체                                   |          O           |
| Bundle 최적화      | `bundle-barrel-imports`, `bundle-conditional` |          O           |
| Bundle 최적화      | `bundle-dynamic-imports` (next/dynamic)       | X (Vite lazy() 사용) |
| Server-side        | `server-*` 전체                               |    X (SSR 미사용)    |
| Client 데이터 패칭 | `client-*` 전체                               |  O (React Query v5)  |

---

## 8. Next Steps

1. [ ] Design 문서 작성 (`frontend-claude-skill.design.md`)
   - 로컬 스킬 SKILL.md 구체적 내용 설계
   - CLAUDE.md 변경 내용 설계
2. [ ] 구현 (Do 단계)
   - `apps/web/.claude/skills/frontend-standards/SKILL.md` 생성
   - `CLAUDE.md` 스킬 섹션 추가

---

## Version History

| Version | Date       | Changes       | Author |
| ------- | ---------- | ------------- | ------ |
| 0.1     | 2026-03-23 | Initial draft | lupin  |
