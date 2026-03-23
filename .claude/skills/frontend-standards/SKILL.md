---
name: frontend-standards
description: >
  React 19 + Vite 프로젝트의 프론트엔드 코딩 표준. React 컴포넌트 작성, 수정,
  리팩토링, 코드 리뷰 시 자동 적용. vercel-react-best-practices에서 Vite 환경에
  적용 가능한 규칙만 선별. Tailwind CSS v4, Radix UI, React Query v5 특화 패턴 포함.
  barrel import 금지, re-render 최적화, waterfall 제거, bundle 최적화 규칙 포함.
---

# Frontend Standards — React 19 + Vite

이 프로젝트(vibe-bkit)의 프론트엔드 코딩 표준. `apps/web/src/` 하위 모든 작업에 적용.

## When to Apply

- `apps/web/src/` 하위 파일(`.tsx`, `.ts`) 작성 또는 수정 시
- React 컴포넌트 리팩토링 시
- 프론트엔드 코드 리뷰 요청 시
- 성능 최적화 작업 시

## 적용 제외 (Next.js 전용 — 이 프로젝트 해당 없음)

- `server-*` 규칙 (RSC, Server Actions 없음)
- `bundle-dynamic-imports` (next/dynamic) → Vite의 `React.lazy()` 사용
- `rendering-hydration-*` (SSR 없음)

---

## 1. Re-render 최적화

### rerender-derived-state-no-effect

useEffect로 상태를 파생하지 말 것 — 렌더 중에 직접 파생

```ts
// BAD
useEffect(() => setFullName(first + ' ' + last), [first, last])

// GOOD
const fullName = first + ' ' + last
```

### rerender-memo

비용이 큰 연산은 useMemo/useCallback으로 메모이제이션

```ts
// BAD
const filtered = items.filter((x) => x.active) // 매 렌더마다 실행

// GOOD
const filtered = useMemo(() => items.filter((x) => x.active), [items])
```

### rerender-functional-setstate

이전 상태를 참조하는 setState는 함수형으로

```ts
// BAD
setCount(count + 1)

// GOOD
setCount((c) => c + 1)
```

### rerender-lazy-state-init

초기값 계산이 비싼 경우 함수로 전달

```ts
// BAD
useState(computeExpensiveValue())

// GOOD
useState(() => computeExpensiveValue())
```

### rerender-transitions

긴급하지 않은 UI 업데이트는 startTransition으로 우선순위 낮추기

```ts
// GOOD — 검색 필터처럼 긴급하지 않은 업데이트
startTransition(() => setFilter(value))
```

### rerender-dependencies

effect 의존성 배열에 객체/함수 대신 primitive 값을 사용

```ts
// BAD — obj가 매 렌더마다 새 참조 → effect 재실행
useEffect(() => {
  fetchData(obj.id)
}, [obj])

// GOOD — primitive 값으로 의존성 분리
useEffect(() => {
  fetchData(id)
}, [id])
```

### rerender-use-ref-transient-values

렌더를 일으키지 않아야 하는 빈번한 값은 useRef로

```ts
// BAD — 매 mousemove마다 리렌더
const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

// GOOD
const mousePos = useRef({ x: 0, y: 0 })
```

---

## 2. Waterfall 제거

### async-parallel

독립적인 비동기 작업은 병렬 실행

```ts
// BAD — 순차 실행 (waterfall)
const user = await fetchUser()
const posts = await fetchPosts()

// GOOD — 병렬 실행
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()])
```

### async-defer-await

await는 실제로 값이 필요한 시점에만

```ts
// BAD — 조건에 상관없이 먼저 await
const data = await fetchData()
if (!condition) return null
return data

// GOOD — 필요한 시점에 await
const promise = fetchData()
if (!condition) return null
return await promise
```

---

## 3. Bundle 최적화

### bundle-barrel-imports

barrel(index.ts) re-export를 통한 import 금지 — 직접 경로로 import

```ts
// BAD — tree-shaking 방해
import { Button, Input, Modal } from '@/components'

// GOOD — 직접 import
import { Button } from '@/components/button'
import { Input } from '@/components/input'
```

### bundle-conditional

조건부로만 사용하는 무거운 컴포넌트는 lazy import

```ts
// BAD — 항상 번들에 포함
import HeavyChart from './heavy-chart'

// GOOD — 필요할 때만 로딩 (React.lazy, NOT next/dynamic)
const HeavyChart = React.lazy(() => import('./heavy-chart'))
// <Suspense fallback={<Skeleton />}><HeavyChart /></Suspense>
```

---

## 4. React Query v5 패턴

### 서비스 레이어 연계 (이 프로젝트 필수)

API 호출은 반드시 `services/{domain}/queries.ts`의 옵션 팩토리를 통해

```ts
// BAD — 인라인 queryFn
useQuery({ queryKey: ['user'], queryFn: () => api.get('/user') })

// GOOD — 옵션 팩토리 사용
useQuery(userQueryOptions())
```

### 훅 위치 결정 규칙

- 1개 컴포넌트에서만 사용 → 컴포넌트 내부 인라인
- 2개 이상 컴포넌트에서 공통 사용 → `hooks/{domain}/{hookName}.ts`로 추출

### Suspense 경계 활용

```tsx
// GOOD
function UserProfile() {
  const { data } = useSuspenseQuery(userQueryOptions())
  return <div>{data.name}</div>
}

// 부모에서 Suspense 경계
;<Suspense fallback={<ProfileSkeleton />}>
  <UserProfile />
</Suspense>
```

### mutationFn만, 부수 효과 없음

`services/{domain}/queries.ts`의 뮤테이션 옵션은 `mutationFn`만 포함.
`onSuccess`, `onError` 등 부수 효과는 컴포넌트의 `useMutation` 호출부에서 처리.

```ts
// services/auth/queries.ts — GOOD
export const loginMutationOptions = () => ({
  mutationFn: (data: LoginInput) => authApi.login(data),
})

// 컴포넌트 — GOOD
const { mutate } = useMutation({
  ...loginMutationOptions(),
  onSuccess: () => navigate('/dashboard'),
})
```

---

## 5. Tailwind CSS v4 패턴

### 인라인 스타일 금지

```tsx
// BAD
<div style={{ color: 'red', marginTop: '8px' }}>

// GOOD
<div className="text-red-500 mt-2">
```

### 조건부 클래스는 cn() 유틸리티

```tsx
// BAD
<div className={`btn ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`}>

// GOOD
<div className={cn('btn', isActive ? 'bg-blue-500' : 'bg-gray-200')}>
```

### 반응형 우선 설계

```tsx
// GOOD — mobile-first
<div className="text-sm md:text-base lg:text-lg">
```

---

## 6. Radix UI 패턴

### asChild — 불필요한 DOM 중첩 방지

```tsx
// BAD — button > a 이중 중첩
<Button>
  <a href="/link">클릭</a>
</Button>

// GOOD — a 태그가 버튼 스타일을 받음
<Button asChild>
  <a href="/link">클릭</a>
</Button>
```

### 접근성 필수 속성

```tsx
// Dialog
<Dialog.Title id="dialog-title">제목</Dialog.Title>
<Dialog.Content aria-labelledby="dialog-title" aria-describedby="dialog-desc">

// Select
<Select.Root>
  <Select.Trigger aria-label="정렬 기준 선택">

// Tooltip — 텍스트 또는 aria-label 필수
<Tooltip.Content>삭제</Tooltip.Content>
```

---

## 7. JavaScript 성능

### js-set-map-lookups

반복 조회가 필요한 경우 Set/Map으로 O(1) 조회

```ts
// BAD — O(n) 반복 조회
const isSelected = selectedIds.includes(id)

// GOOD — O(1) 조회
const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
const isSelected = selectedSet.has(id)
```

### js-early-exit

조건 불충족 시 조기 반환

```ts
// BAD
function process(items) {
  if (items.length > 0) {
    // 실제 로직
  }
}

// GOOD
function process(items) {
  if (items.length === 0) return
  // 실제 로직
}
```
