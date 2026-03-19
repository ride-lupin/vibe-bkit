---
description: 변경 사항 커밋 → 푸시 → PR 생성
allowed-tools: Bash(git:*), Bash(gh:*)
argument-hint: [commit message]
---

# Commit → Push → PR

변경 사항을 커밋하고 PR을 생성합니다.

## 사용법

```
/commit-push-pr [커밋 메시지]
```

$ARGUMENTS를 커밋 메시지로 사용합니다. 생략 시 변경 사항을 분석하여 자동 생성합니다.

## 수행 작업

### 1단계: 변경 사항 확인
- `git status`로 변경된 파일 확인
- `git diff`로 내용 검토

### 2단계: 커밋
- 변경된 파일 스테이징 (민감한 파일 제외)
- 커밋 메시지 작성 및 커밋

### 3단계: 푸시
- 현재 브랜치로 푸시
- 업스트림 없으면 `-u origin {branch}` 로 설정

### 4단계: PR 생성
- `gh pr create`로 PR 생성
- 변경 사항 요약을 PR 본문에 포함

## 주의사항
- .env 파일은 절대 커밋하지 않음
- main/master 브랜치 직접 푸시 금지
