# Plan: 프런트엔드 스타일링 기술 스택 적용

## Executive Summary

| 항목    | 내용                                                        |
| ------- | ----------------------------------------------------------- |
| Feature | frontend-styling                                            |
| 시작일  | 2026-03-23                                                  |
| 목표    | 인라인 스타일 제거 → Tailwind CSS v4 + Radix UI 클래스 적용 |
| 범위    | apps/web/src 내 3개 파일                                    |

### Value Delivered

| 관점               | 내용                                                                 |
| ------------------ | -------------------------------------------------------------------- |
| Problem            | 인라인 스타일로 작성된 컴포넌트 — 유지보수 어렵고 디자인 일관성 없음 |
| Solution           | Tailwind CSS v4 유틸리티 클래스 + Radix UI Themes 적용으로 통일      |
| Function/UX Effect | 일관된 디자인 시스템, 반응형 대응 용이, 클래스 기반 스타일 관리      |
| Core Value         | 이미 설치된 스택을 실제 코드에 연결하여 스타일링 기준선 확립         |

---

## 현재 상태 (As-Is)

### 환경 구성 — 이미 완료

| 항목                | 상태   | 파일                         |
| ------------------- | ------ | ---------------------------- |
| tailwindcss v4      | 설치됨 | package.json devDependencies |
| @tailwindcss/vite   | 설치됨 | package.json devDependencies |
| @radix-ui/themes v3 | 설치됨 | package.json dependencies    |
| vite 플러그인       | 적용됨 | vite.config.ts               |
| CSS import          | 적용됨 | src/index.css                |
| Theme 프로바이더    | 적용됨 | src/main.tsx                 |

### 인라인 스타일 현황 (변경 대상)

| 파일                            | 인라인 스타일 위치                                                                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/login.tsx`           | `<main>` — display, flexDirection, alignItems, padding                                                                                                              |
| `src/pages/home.tsx`            | `<main>` — padding, `<button>` — marginTop, padding, cursor                                                                                                         |
| `src/components/login-form.tsx` | `<form>` — display, flexDirection, gap, width<br>`<input>` x2 — display, width, padding, marginTop<br>`<span>` x3 — color, fontSize<br>`<button>` — padding, cursor |

---

## 목표 (To-Be)

### 변환 원칙

1. **Tailwind 유틸리티 클래스**로 인라인 `style={}` 완전 제거
2. **Radix UI Themes** 토큰 기반 클래스(`text-`, `bg-` 등) 활용 가능한 경우 우선 사용
3. 기능·로직 코드는 변경하지 않음 (스타일만 변경)
4. Playwright E2E 테스트는 스타일 무관 — 기존 테스트 그대로 통과 확인

### 각 파일 변환 방향

#### `src/pages/login.tsx`

```
style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'4rem 2rem' }}
→ className="flex flex-col items-center px-8 py-16"
```

#### `src/pages/home.tsx`

```
style={{ padding: '2rem' }}
→ className="p-8"

style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
→ className="mt-4 px-4 py-2 cursor-pointer ..."
```

#### `src/components/login-form.tsx`

```
form:   style={{ display:'flex', flexDirection:'column', gap:'1rem', width:'320px' }}
        → className="flex flex-col gap-4 w-80"

input:  style={{ display:'block', width:'100%', padding:'0.5rem', marginTop:'0.25rem' }}
        → className="block w-full px-2 py-2 mt-1 ..."

span:   style={{ color:'red', fontSize:'0.875rem' }}
        → className="text-red-500 text-sm"

button: style={{ padding:'0.75rem', cursor:'pointer' }}
        → className="py-3 w-full cursor-pointer ..."
```

---

## 구현 범위

### 변경 파일 (3개)

- `apps/web/src/pages/login.tsx`
- `apps/web/src/pages/home.tsx`
- `apps/web/src/components/login-form.tsx`

### 변경하지 않는 것

- 기능 로직 (mutation, query, form 제출 등)
- 테스트 파일 (E2E 테스트는 기능 기준이므로 스타일 변경 무관)
- 환경 설정 파일 (이미 완료됨)

---

## 완료 기준 (Definition of Done)

- [ ] 3개 파일에서 `style={}` 인라인 스타일 속성 완전 제거
- [ ] Tailwind 유틸리티 클래스로 동등한 시각적 결과 구현
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm lint` 통과
- [ ] `pnpm --filter @vibe-bkit/web test` (Playwright E2E) 통과

---

## PDCA 다음 단계

- Design 불필요 (UI 구조 변경 없이 클래스 치환만 수행)
- `/pdca do frontend-styling` 으로 바로 구현 단계 진행
