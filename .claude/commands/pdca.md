---
description: PDCA 사이클 관리 (plan, design, do, analyze, iterate, report, status, next)
argument-hint: '[action] [feature]'
---

bkit:pdca 스킬을 사용하여 다음 작업을 수행하세요: $ARGUMENTS

사용 가능한 액션:

- `/pdca plan {feature}` — Plan 문서 생성
- `/pdca design {feature}` — Design 문서 생성
- `/pdca do {feature}` — 구현 단계 안내
- `/pdca analyze {feature}` — Gap 분석 (gap-detector 에이전트)
- `/pdca iterate {feature}` — 자동 개선 반복 (pdca-iterator 에이전트)
- `/pdca report {feature}` — 완료 보고서 (report-generator 에이전트)
- `/pdca status` — 현재 PDCA 상태 확인
- `/pdca next` — 다음 권장 단계 안내

---

## 프로젝트 로컬 규칙: Do 단계 테스트 동반 구현

`/pdca do {feature}` 실행 시 아래 규칙을 추가로 적용한다.

### 구현과 함께 반드시 수행할 것

**1. 백엔드 코드를 구현하면 → Vitest 단위 테스트 작성 + 실행**

- 위치: `apps/api/test/{domain}/{module}.test.ts`
- 실행: `pnpm --filter @vibe-bkit/api test test/{domain}/{module}.test.ts`

**2. 프런트엔드 페이지/기능을 구현하면 → Playwright E2E 테스트 작성 + 실행**

- 스펙: `apps/web/e2e/{domain}/{feature}.spec.ts`
- Mock: `apps/web/e2e/mocks/{domain}.ts` (page.route() 기반)
- Mock 응답 body는 `@vibe-bkit/shared`의 응답 타입을 `satisfies`로 적용
- 실행: `pnpm --filter @vibe-bkit/web test e2e/{domain}/{feature}.spec.ts`

### Do 단계 완료 체크리스트

구현 완료 후 아래 순서로 실행하고 모두 통과해야 Check 단계로 진행한다:

```bash
pnpm typecheck
pnpm lint
pnpm --filter @vibe-bkit/api test test/{domain}/{module}.test.ts
pnpm --filter @vibe-bkit/web test e2e/{domain}/{feature}.spec.ts
```
