---
template: design
version: 1.2
feature: frontend-claude-skill
date: 2026-03-23
author: lupin
project: vibe-bkit
---

# frontend-claude-skill Design Document

> **Summary**: 전역 스킬의 불확실한 자동 참조 문제를 CLAUDE.md 명시 + 프로젝트 로컬 스킬로 이중 해결
>
> **Project**: vibe-bkit
> **Author**: lupin
> **Date**: 2026-03-23
> **Status**: Draft
> **Planning Doc**: [frontend-claude-skill.plan.md](../01-plan/features/frontend-claude-skill.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 프론트엔드 작업 시 스킬 참조가 **명시적으로 보장**될 것
2. Next.js 전용 규칙이 **잘못 적용되지 않을 것**
3. 이 프로젝트 스택(React 19 + Vite + Tailwind v4 + Radix UI + React Query v5) 특화 규칙이 **하나의 파일에 통합**될 것

### 1.2 Design Principles

- **이중 보장**: CLAUDE.md(명시적 지시) + 로컬 스킬(컨텍스트 자동 로딩)
- **선별 적용**: vercel-react-best-practices에서 Vite 환경에 적용 가능한 규칙만 추출
- **단일 진입점**: 스킬 규칙 업데이트 시 `.claude/skills/frontend-standards/SKILL.md` 1개 파일만 수정

---

## 2. Architecture

### 2.1 스킬 계층 구조

```
~/.claude/skills/                          (전역 — 모든 프로젝트)
  ├── vercel-react-best-practices/         참조는 하되 Next.js 규칙 제외
  ├── web-design-guidelines/               UI 리뷰 시 명시적 호출
  ├── react-pr-review/                     PR 리뷰 시 명시적 호출
  └── frontend-design/                     새 UI 설계 시 자동 참조

{project}/.claude/skills/                 (프로젝트 로컬 — 이 프로젝트만)
  └── frontend-standards/          ← NEW
        └── SKILL.md               React 19 + Vite 특화 선별 규칙
```

### 2.2 실행 흐름

```
Claude Code 세션 시작
  └── .claude/skills/ 스캔 → SKILL.md frontmatter description 로드
        └── frontend-standards SKILL.md → 컨텍스트에 자동 포함

프론트엔드 작업 요청 수신
  └── CLAUDE.md "프론트엔드 스킬 참조 규칙" 섹션 → 명시적 지시
        └── 작업 유형에 따라 스킬 트리거
              ├── 컴포넌트 작성/수정 → frontend-standards 로컬 스킬 적용
              ├── UI 리뷰 요청     → /web-design-guidelines 실행
              └── PR 리뷰 요청     → /react-pr-review 실행
```

---

## 3. 변경 파일 목록

| 파일                                         | 작업 | 설명                           |
| -------------------------------------------- | ---- | ------------------------------ |
| `CLAUDE.md`                                  | 수정 | 프론트엔드 스킬 참조 섹션 추가 |
| `.claude/skills/frontend-standards/SKILL.md` | 생성 | 프로젝트 로컬 스킬             |

---

## 4. CLAUDE.md 변경 설계

### 4.1 추가 위치

현재 CLAUDE.md의 `## 코딩 컨벤션` 섹션 아래에 새 섹션 추가.

### 4.2 추가 내용

```markdown
## 프론트엔드 스킬 참조 규칙

React 컴포넌트 관련 작업 시 아래 규칙을 반드시 따를 것.

### 자동 참조 (항상 적용)

- **컴포넌트 작성/수정/리팩토링**: `frontend-standards` 로컬 스킬 규칙 적용
  - Re-render 최적화 (`rerender-*`)
  - Waterfall 제거 (`async-parallel`, `async-defer-await`)
  - Bundle 최적화 (`bundle-barrel-imports`, `bundle-conditional`)
  - React Query v5 데이터 패칭 패턴
  - Tailwind CSS v4 + Radix UI 패턴

### 명시적 호출

- **UI 코드 리뷰 요청 시**: `/web-design-guidelines` 실행
- **PR 리뷰 시**: `/react-pr-review` 실행

### 적용 제외 규칙 (Next.js 전용)

이 프로젝트는 React 19 + Vite 기반이므로 아래는 적용하지 않는다:

- `server-*` 규칙 (RSC, Server Actions 없음)
- `bundle-dynamic-imports` → Vite의 `React.lazy()` + `import()` 사용
- `rendering-hydration-*` → SSR 없음
```

---

## 5. 로컬 스킬 SKILL.md 설계

### 5.1 파일 위치

```
{project-root}/.claude/skills/frontend-standards/SKILL.md
```

> Claude Code는 세션 시작 시 `{cwd}/.claude/skills/` 를 스캔한다.
> 모노레포 루트(`/vibe-bkit/`)에서 실행하므로 루트의 `.claude/skills/`에 위치해야 한다.
> `apps/web/.claude/skills/`는 루트 실행 시 자동 로딩되지 않는다.

### 5.2 frontmatter

```yaml
---
name: frontend-standards
description: >
  React 19 + Vite 프로젝트의 프론트엔드 코딩 표준.
  React 컴포넌트 작성, 수정, 리팩토링, 코드 리뷰 시 자동 적용.
  vercel-react-best-practices에서 Vite 환경 적용 가능 규칙만 선별.
  Tailwind CSS v4, Radix UI, React Query v5 특화 패턴 포함.
---
```

> `description`이 길수록 컨텍스트 매칭 확률이 높아진다. 핵심 키워드(React, 컴포넌트, Vite)를 포함한다.

### 5.3 스킬 내용 구성

#### Section 1: 적용 조건

```markdown
## When to Apply

- React 컴포넌트 파일(`*.tsx`) 작성 또는 수정 시
- `apps/web/src/` 하위 파일 작업 시
- 프론트엔드 코드 리뷰 요청 시
- 성능 최적화 작업 시
```

#### Section 2: Re-render 최적화 (MEDIUM, 가장 빈번히 위반)

선별 규칙: `rerender-memo`, `rerender-dependencies`, `rerender-derived-state-no-effect`,
`rerender-functional-setstate`, `rerender-lazy-state-init`, `rerender-transitions`

```markdown
## Re-render 최적화

### rerender-memo

비용이 큰 연산은 useMemo/useCallback으로 메모이제이션

- BAD: const filtered = items.filter(...) // 매 렌더마다 실행
- GOOD: const filtered = useMemo(() => items.filter(...), [items])

### rerender-derived-state-no-effect

useEffect로 상태를 파생하지 말 것 — 렌더 중에 직접 파생

- BAD: useEffect(() => setFull(first + last), [first, last])
- GOOD: const full = first + last // 렌더 중 파생

### rerender-functional-setstate

이전 상태를 참조하는 setState는 함수형으로

- BAD: setCount(count + 1)
- GOOD: setCount(c => c + 1)

### rerender-lazy-state-init

초기값 계산이 비싼 경우 함수로 전달

- BAD: useState(computeExpensiveValue())
- GOOD: useState(() => computeExpensiveValue())

### rerender-transitions

긴급하지 않은 업데이트는 startTransition으로 우선순위 낮추기

- GOOD: startTransition(() => setFilter(value))
```

#### Section 3: Waterfall 제거 (CRITICAL)

선별 규칙: `async-parallel`, `async-defer-await`

```markdown
## Waterfall 제거

### async-parallel

독립적인 비동기 작업은 병렬 실행

- BAD: const a = await fetchA(); const b = await fetchB()
- GOOD: const [a, b] = await Promise.all([fetchA(), fetchB()])

### async-defer-await

await는 실제로 값이 필요한 시점에만

- BAD: const data = await fetch(); if (condition) return data
- GOOD: const promise = fetch(); if (condition) return await promise
```

#### Section 4: Bundle 최적화 (CRITICAL, Vite 적용)

선별 규칙: `bundle-barrel-imports`, `bundle-conditional`

```markdown
## Bundle 최적화

### bundle-barrel-imports

barrel(index.ts) re-export를 통한 import 금지 — 직접 import

- BAD: import { Button } from '@/components'
- GOOD: import { Button } from '@/components/button'

### bundle-conditional

조건부로만 사용하는 모듈은 lazy import

- BAD: import HeavyChart from './heavy-chart'
- GOOD: const HeavyChart = React.lazy(() => import('./heavy-chart'))

### Vite 주의: next/dynamic 대신 React.lazy() 사용

- BAD: import dynamic from 'next/dynamic'
- GOOD: const Comp = React.lazy(() => import('./comp'))
```

#### Section 5: React Query v5 패턴 (이 프로젝트 특화)

```markdown
## React Query v5 데이터 패칭 패턴

### 서비스 레이어 연계

API 호출은 반드시 `services/{domain}/queries.ts`의 옵션 팩토리를 통해

- BAD: useQuery({ queryKey: ['user'], queryFn: () => api.get('/user') })
- GOOD: useQuery(userQueryOptions())

### 단일 컴포넌트 사용 → 인라인, 복수 컴포넌트 → hooks/{domain}/

- 1개 컴포넌트에서만: 해당 컴포넌트 내부에 useQuery 인라인
- 2개 이상: hooks/{domain}/{hookName}.ts로 추출

### Suspense 경계 활용

React Query v5 suspense 모드는 Suspense 경계와 함께

- GOOD: useSuspenseQuery() + <Suspense fallback={<Skeleton />}>
```

#### Section 6: Tailwind CSS v4 패턴 (이 프로젝트 특화)

```markdown
## Tailwind CSS v4 패턴

### 인라인 스타일 금지 — Tailwind 클래스만

- BAD: style={{ color: 'red', marginTop: '8px' }}
- GOOD: className="text-red-500 mt-2"

### 조건부 클래스는 cn() 유틸리티 사용

- BAD: className={`btn ${isActive ? 'active' : ''}`}
- GOOD: className={cn('btn', isActive && 'active')}

### Tailwind v4 CSS variables 활용 (theme())

- GOOD: className="bg-[var(--color-primary)]"
```

#### Section 7: Radix UI 패턴 (이 프로젝트 특화)

```markdown
## Radix UI 패턴

### asChild 패턴 — 불필요한 DOM 중첩 방지

- BAD: <Button><a href="/link">클릭</a></Button>
- GOOD: <Button asChild><a href="/link">클릭</a></Button>

### 접근성 필수 속성

- Dialog: aria-labelledby, aria-describedby
- Select: aria-label or aria-labelledby
- Tooltip: 텍스트 컨텐츠 또는 aria-label 필수
```

---

## 6. 구현 순서

```
1. .claude/skills/frontend-standards/ 디렉토리 생성
2. SKILL.md 작성 (위 설계 내용 기반)
3. CLAUDE.md 수정 (섹션 추가)
4. 검증: 새 Claude 세션에서 스킬 로딩 확인
```

---

## 7. 검증 방법

| 검증 항목           | 방법                                                       |
| ------------------- | ---------------------------------------------------------- |
| 로컬 스킬 로딩 여부 | 새 세션에서 "frontend-standards 스킬 어떤 규칙 있어?" 질문 |
| CLAUDE.md 적용      | React 컴포넌트 작성 요청 시 re-render 규칙 자동 언급 여부  |
| Next.js 규칙 미적용 | 컴포넌트 작성 시 next/dynamic, RSC 언급 없음               |

---

## Version History

| Version | Date       | Changes       | Author |
| ------- | ---------- | ------------- | ------ |
| 0.1     | 2026-03-23 | Initial draft | lupin  |
