---
description: ESLint 오류 자동 수정
allowed-tools: Bash(pnpm:*)
model: haiku
---

# Lint 자동 수정

ESLint 오류를 자동으로 수정합니다.

## 수행 작업

### 1단계: 린트 실행 및 자동 수정
```bash
pnpm lint --fix
```

### 2단계: 수정 결과 확인
- 자동 수정된 파일 목록 표시
- 수동 수정이 필요한 항목 안내

## 결과 출력

✅ 린트 완료
**수정된 파일**: {목록}
**수동 수정 필요**: {목록 (있을 경우)}
