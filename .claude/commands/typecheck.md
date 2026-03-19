---
description: TypeScript 타입 검사 실행
allowed-tools: Bash(pnpm:*)
model: haiku
---

# TypeScript 타입 검사

전체 프로젝트의 TypeScript 타입 오류를 검사합니다.

## 수행 작업

### 1단계: 타입 검사 실행
```bash
pnpm typecheck
```

### 2단계: 오류 분석
- 타입 오류가 있으면 원인 설명
- 수정 방법 제안

## 결과 출력

- ✅ 타입 오류 없음
- ❌ 오류 발생 시: 파일명, 줄 번호, 오류 내용 정리
