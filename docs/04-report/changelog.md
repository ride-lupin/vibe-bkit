# Changelog

모든 주요 변경 사항을 이 파일에 기록합니다.

## [2026-03-19] - Shared Zod Schemas PDCA Complete

### Added

- `packages/shared/src/schemas/common.ts`: 공통 필드 및 API 래퍼 스키마 8개 (BaseEntity, Pagination, ApiResponse, ApiError)
- `packages/shared/src/schemas/user.ts`: User 도메인 스키마 5개 (User, CreateUser, UpdateUser, UserRole, Login)
- `packages/shared/src/schemas/todo.ts`: Todo 도메인 스키마 6개 (Todo, CreateTodo, UpdateTodo, TodoStatus, TodoPriority, TodoFilter)
- `packages/shared/src/schemas/health.ts`: 기존 HealthSchema 분리 (파일 이동)
- Barrel export `packages/shared/src/schemas/index.ts`: 37개 스키마/타입 통합 export
- z.infer 기반 자동 타입 추론: 16개 TypeScript 타입 자동 생성
- 완료 보고서: `docs/04-report/features/schemas.report.md`

### Changed

- `packages/shared/src/schemas/` 디렉토리 구조 개선: 도메인별 모듈 분리
- Literal Union 패턴 도입: `as const` + `z.enum()` (enum 키워드 금지 준수)

### Convention Compliance

- TypeScript strict mode: 0 errors
- enum 사용: 0 (금지 규칙 준수)
- interface 사용: 0 (type only)
- any 타입: 0
- 파일명: 모두 kebab-case ✅
- 모든 타입: z.infer 자동 추론 ✅

### Quality Metrics

- **Match Rate**: 100% (Design ↔ Implementation)
- **Files Created**: 5개
- **Schemas**: 20개
- **Types**: 16개
- **Total Exports**: 37개
- **Code Lines**: ~400

### PDCA Completion

- Plan: [schemas.plan.md](./features/../01-plan/features/schemas.plan.md) ✅ Approved
- Design: [schemas.design.md](./features/../02-design/features/schemas.design.md) ✅ Approved
- Do: Implementation Complete ✅
- Check: Gap Analysis (100% match) ✅
- Report: [schemas.report.md](./features/schemas.report.md) ✅ Completed

---

## Upcoming Features (Backlog)

### Next Immediate Actions

1. **User 기능 PDCA** (계획 예정)
   - User API 라우트 구현
   - 회원가입, 로그인, 프로필 관리
   - Dependency: schemas PDCA (완료됨)

2. **Todo 기능 PDCA** (계획 예정)
   - Todo CRUD API 라우트 구현
   - Dependency: schemas PDCA (완료됨)

3. **FE 폼 컴포넌트 PDCA** (계획 예정)
   - react-hook-form + Zod resolver 기반 재사용 가능한 폼 컴포넌트
   - Dependency: schemas PDCA (완료됨)

### Medium-term (3~4주)

- 인증 미들웨어 (Hono.js JWT validation)
- Drizzle ORM 스키마 동기화
- E2E 테스트 (Playwright)

### Future (Backlog)

- 스키마 단위 테스트 (Vitest)
- OpenAPI/Swagger 자동 생성
- 다국어 에러 메시지 (i18n)
- 스키마 버전 관리 전략
- XSS 방지 유틸리티
