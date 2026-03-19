---
template: design
version: 1.2
feature: dev-environment
date: 2026-03-19
author: lupin
project: vibe-bkit
status: Draft
---

# 백엔드/프론트엔드 개발 환경 구축 Design Document

> **Summary**: Turborepo + pnpm workspace 기반 3개 패키지(apps/web, apps/api, packages/shared) 상세 구성 설계
>
> **Project**: vibe-bkit
> **Version**: 0.1.0
> **Author**: lupin
> **Date**: 2026-03-19
> **Status**: Draft
> **Planning Doc**: [dev-environment.plan.md](../01-plan/features/dev-environment.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- `pnpm dev` 한 명령으로 FE(port 5173) + BE(port 3000) 동시 실행
- `packages/shared` Zod 스키마·타입을 FE/BE에서 import 가능
- TypeScript strict mode 전 패키지 적용
- Turbo 파이프라인 캐시 기반 빌드 최적화
- Docker Compose로 PostgreSQL 로컬 DB 원클릭 실행

### 1.2 Design Principles

- **단순성**: 최소 설정으로 동작하는 환경 우선
- **타입 안전성**: `any` 금지, strict mode, 공유 스키마
- **재현성**: `.env.example` + Docker Compose로 누구나 동일 환경 구축
- **컨벤션 일관성**: CLAUDE.md 규칙 모든 패키지에 적용

---

## 2. Architecture

### 2.1 전체 구조도

```
┌──────────────────────────────────────────────────────────┐
│                    vibe-bkit (Turborepo)                  │
│                                                          │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │   apps/web       │    │   apps/api       │             │
│  │  React 19 + Vite │    │   Hono.js        │             │
│  │  port: 5173      │───▶│   port: 3000     │───▶ DB     │
│  │  Tailwind v4     │    │   Drizzle ORM    │    (5432)  │
│  │  React Query v5  │    │   Zod validate   │             │
│  └────────┬─────────┘    └────────┬─────────┘             │
│           │                       │                       │
│           └──────────┬────────────┘                       │
│                      ▼                                    │
│           ┌─────────────────────┐                        │
│           │   packages/shared   │                        │
│           │   Zod schemas       │                        │
│           │   Shared types      │                        │
│           │   Utilities         │                        │
│           └─────────────────────┘                        │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────┐
          │  Docker Compose          │
          │  PostgreSQL 16 (5432)    │
          └──────────────────────────┘
```

### 2.2 Turbo 파이프라인 데이터 흐름

```
pnpm dev
  └── turbo dev
        ├── packages/shared (tsc --watch)
        ├── apps/api        (hono dev, port 3000)
        └── apps/web        (vite dev, port 5173)

pnpm build
  └── turbo build (캐시 기반)
        ├── packages/shared → dist/
        ├── apps/api        → dist/
        └── apps/web        → dist/
```

### 2.3 패키지 의존성

| 패키지 | 의존 패키지 | 용도 |
|--------|------------|------|
| `apps/web` | `packages/shared` | Zod 스키마, 공유 타입 |
| `apps/api` | `packages/shared` | Zod 스키마 검증, 공유 타입 |
| `packages/shared` | 없음 | 독립 패키지 |

---

## 3. 패키지별 상세 설계

### 3.1 루트 설정 파일

#### `pnpm-workspace.yaml`
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

#### `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "ui": "tui",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

#### 루트 `package.json`
```json
{
  "name": "vibe-bkit",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "latest",
    "@typescript-eslint/eslint-plugin": "^8",
    "@typescript-eslint/parser": "^8",
    "eslint": "^9",
    "prettier": "^3",
    "typescript": "^5.7"
  }
}
```

---

### 3.2 `packages/shared`

#### 역할
FE/BE 공유 Zod 스키마, TypeScript 타입, 유틸리티 함수

#### 디렉토리 구조
```
packages/shared/
├── src/
│   ├── schemas/
│   │   └── index.ts        # Zod 스키마 export
│   ├── types/
│   │   └── index.ts        # 공유 타입 export
│   └── index.ts            # 루트 export
├── package.json
└── tsconfig.json
```

#### `package.json`
```json
{
  "name": "@vibe-bkit/shared",
  "version": "0.0.1",
  "private": true,
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5.7"
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

#### `src/index.ts` (초기 헬스체크 스키마 예시)
```typescript
export * from './schemas'
export * from './types'
```

#### `src/schemas/index.ts`
```typescript
import { z } from 'zod'

export const HealthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
})

export type Health = z.infer<typeof HealthSchema>
```

---

### 3.3 `apps/api` (Hono.js)

#### 디렉토리 구조
```
apps/api/
├── src/
│   ├── routes/
│   │   └── health.ts       # GET /health
│   ├── middleware/
│   │   └── logger.ts       # 요청 로그 미들웨어
│   ├── db/
│   │   ├── schema.ts       # Drizzle 스키마 정의
│   │   ├── migrate.ts      # 마이그레이션 실행
│   │   └── index.ts        # DB 연결
│   └── index.ts            # Hono 앱 진입점
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

#### `package.json`
```json
{
  "name": "@vibe-bkit/api",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/db/migrate.ts"
  },
  "dependencies": {
    "@hono/node-server": "^1",
    "@vibe-bkit/shared": "workspace:*",
    "drizzle-orm": "^0.38",
    "hono": "^4",
    "postgres": "^3",
    "zod": "^3"
  },
  "devDependencies": {
    "@types/node": "^22",
    "drizzle-kit": "^0.30",
    "tsx": "^4",
    "typescript": "^5.7",
    "vitest": "^3"
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

#### `src/index.ts`
```typescript
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { healthRoute } from './routes/health'

const app = new Hono()

app.use(logger())
app.route('/health', healthRoute)

const port = Number(process.env.PORT) || 3000

serve({ fetch: app.fetch, port }, () => {
  console.info(`API running on http://localhost:${port}`)
})

export type AppType = typeof app
```

#### `src/routes/health.ts`
```typescript
import { Hono } from 'hono'
import { HealthSchema } from '@vibe-bkit/shared'

export const healthRoute = new Hono()

healthRoute.get('/', (c) => {
  const response = HealthSchema.parse({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
  return c.json(response)
})
```

#### `src/db/index.ts`
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

#### `src/db/schema.ts`
```typescript
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// 초기 헬스체크용 더미 테이블 — 실제 도메인 테이블은 기능 개발 시 추가
export const healthLogs = pgTable('health_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow(),
  message: text('message'),
})
```

#### `drizzle.config.ts`
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

---

### 3.4 `apps/web` (React 19 + Vite)

#### 디렉토리 구조
```
apps/web/
├── src/
│   ├── components/
│   │   └── ui/             # Radix UI 기반 공통 컴포넌트
│   ├── features/           # 기능별 모듈
│   ├── lib/
│   │   └── api.ts          # ky HTTP 클라이언트
│   ├── stores/             # Zustand 스토어
│   ├── routes/             # react-router-dom v7 라우트
│   ├── types/              # FE 전용 타입
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

#### `package.json`
```json
{
  "name": "@vibe-bkit/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/themes": "^3",
    "@tanstack/react-query": "^5",
    "@tanstack/react-query-devtools": "^5",
    "@vibe-bkit/shared": "workspace:*",
    "ky": "^1",
    "react": "^19",
    "react-dom": "^19",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3",
    "react-router-dom": "^7",
    "zustand": "^5",
    "zod": "^3"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "typescript": "^5.7",
    "vite": "^6"
  }
}
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

#### `vite.config.ts`
```typescript
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

#### `src/index.css` (Tailwind v4)
```css
@import "tailwindcss";
@import "@radix-ui/themes/styles.css";
```

#### `src/main.tsx`
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Theme } from '@radix-ui/themes'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Theme>
          <App />
        </Theme>
      </BrowserRouter>
      <ReactQueryDevtools />
    </QueryClientProvider>
  </StrictMode>,
)
```

#### `src/lib/api.ts`
```typescript
import ky from 'ky'

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
})
```

#### `src/App.tsx` (초기 헬스체크 UI)
```typescript
import { useQuery } from '@tanstack/react-query'
import type { Health } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

export default function App() {
  const { data, isLoading } = useQuery<Health>({
    queryKey: ['health'],
    queryFn: () => api.get('health').json<Health>(),
    staleTime: 30_000,
  })

  return (
    <main>
      <h1>vibe-bkit</h1>
      {isLoading ? (
        <p>API 연결 중...</p>
      ) : (
        <p>API 상태: {data?.status} ({data?.timestamp})</p>
      )}
    </main>
  )
}
```

---

### 3.5 Docker Compose

#### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-vibe}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-vibe1234}
      POSTGRES_DB: ${POSTGRES_DB:-vibe_bkit}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-vibe}']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

---

### 3.6 환경 변수

#### `.env.example`
```bash
# FE (apps/web) — VITE_ 접두사 필수
VITE_API_URL=http://localhost:3000

# BE (apps/api)
PORT=3000
DATABASE_URL=postgresql://vibe:vibe1234@localhost:5432/vibe_bkit

# Docker Compose
POSTGRES_USER=vibe
POSTGRES_PASSWORD=vibe1234
POSTGRES_DB=vibe_bkit
POSTGRES_PORT=5432
```

---

## 4. API 명세

### 4.1 엔드포인트 목록 (초기 환경 확인용)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | /health | API 서버 헬스체크 | 불필요 |

### 4.2 `GET /health`

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-03-19T00:00:00.000Z"
}
```

> 이 스키마는 `packages/shared`의 `HealthSchema` (Zod)로 검증됨

---

## 5. 에러 처리 전략

### 5.1 BE (Hono.js)

```typescript
// apps/api/src/index.ts에 전역 에러 핸들러 추가
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status)
  }
  return c.json({ error: 'Internal Server Error' }, 500)
})
```

### 5.2 FE (React Query)

```typescript
// QueryClient 전역 에러 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: 0 },
  },
})
```

---

## 6. 보안 고려사항

- [ ] `.env.local`은 gitignore (민감 정보 커밋 금지)
- [ ] `VITE_` 접두사: 클라이언트 공개 변수만 사용
- [ ] DB 비밀번호: Docker 환경변수, 코드에 하드코딩 금지
- [ ] CORS: Hono cors 미들웨어로 허용 origin 제한 (개발: localhost)

---

## 7. 테스트 계획

| 유형 | 대상 | 도구 | 확인 항목 |
|------|------|------|-----------|
| 수동 테스트 | `GET /health` | curl / 브라우저 | JSON 응답 확인 |
| 수동 테스트 | React 앱 | 브라우저 | API 상태 화면 렌더링 |
| 타입 검사 | 전체 패키지 | `pnpm typecheck` | 0 errors |
| 린트 | 전체 패키지 | `pnpm lint` | 0 errors |
| 빌드 | 전체 패키지 | `pnpm build` | 성공 |

---

## 8. 구현 순서 (Do 단계 체크리스트)

1. [ ] **루트 설정**: `pnpm-workspace.yaml`, `turbo.json`, 루트 `package.json`
2. [ ] **packages/shared**: 패키지 초기화, `HealthSchema` 작성
3. [ ] **apps/api**: Hono.js 초기화, `/health` 라우트, Drizzle 설정
4. [ ] **apps/web**: Vite 초기화, Tailwind v4, Radix UI, React Query 설정
5. [ ] **Docker**: `docker-compose.yml` 작성
6. [ ] **공통 설정**: 루트 ESLint, Prettier, `.env.example`
7. [ ] **연결 검증**:
   - `docker-compose up -d` → PostgreSQL 실행 확인
   - `pnpm install` → 의존성 설치
   - `pnpm dev` → FE(5173) + BE(3000) 동시 실행
   - `curl http://localhost:3000/health` → `{"status":"ok"}` 확인
   - 브라우저 `http://localhost:5173` → API 상태 화면 확인
   - `pnpm typecheck` → 0 errors
   - `pnpm lint` → 0 errors
   - `pnpm build` → 빌드 성공

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-19 | Initial draft | lupin |
