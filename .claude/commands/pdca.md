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
