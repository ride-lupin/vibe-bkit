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

## PDCA 단계별 규칙

### Do 단계 (`/pdca do {feature}`)

**구현과 함께 반드시 수행할 것:**

#### 백엔드 (apps/api) — Vitest 단위 테스트

- 파일 위치: `apps/api/test/{domain}/{module}.test.ts`
- DB 의존 없이 순수 로직 테스트 — `vi.hoisted()` + `vi.mock()`으로 DB/외부 의존성 목킹
- Hono `app.request()`로 라우트 레벨 테스트 가능 (실 서버 불필요)

#### 프런트엔드 (apps/web) — Playwright E2E + Mock

- 스펙 파일: `apps/web/e2e/{domain}/{feature}.spec.ts`
- Mock 파일: `apps/web/e2e/mocks/{domain}.ts` (`page.route()` 기반)
- 실 서버 불필요 — 모든 API 응답을 `page.route()`로 인터셉트

#### Do 단계 완료 체크리스트

**아래 3단계를 순서대로 실행하고, 하나라도 실패하면 즉시 중단하고 수정한다. 모두 통과한 후에만 `/pdca analyze`로 진행할 수 있다.**

```bash
pnpm typecheck   # 1. 타입 오류 없음
pnpm lint        # 2. 린트 통과
```

3. **테스트**: 이번 작업에서 수정·추가한 파일의 도메인에 해당하는 테스트만 실행
   - `apps/api/` 변경 시 → 해당 도메인 Vitest 실행
     - 예: `apps/api/src/routes/auth.ts` 수정 → `pnpm --filter @vibe-bkit/api test test/auth/routes.test.ts`
   - `apps/web/` 변경 시 → 해당 도메인 E2E 실행
     - 예: `apps/web/src/components/login-form.tsx` 수정 → `pnpm --filter @vibe-bkit/web test e2e/auth/login.spec.ts`
   - 해당 앱 변경 없으면 생략

#### 실패 시 중단 보고 양식

단계 실패 시 다음 양식으로 보고하고 즉시 수정에 착수한다:

```
🚫 Do 단계 중단
- 실패 단계: {typecheck | build | lint | test}
- 실패 파일: {파일 경로}
- 오류 내용: {에러 메시지 또는 실패 이유 요약}
- 조치 계획: {수정할 내용 한 줄 요약}
```

수정 완료 후 실패한 단계부터 체크리스트를 재실행한다.
