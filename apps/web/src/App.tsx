import { useQuery } from '@tanstack/react-query'
import type { Health } from '@vibe-bkit/shared'
import { api } from '@/lib/api'

export default function App() {
  const { data, isLoading, isError } = useQuery<Health>({
    queryKey: ['health'],
    queryFn: () => api.get('health').json<Health>(),
    staleTime: 30_000,
  })

  return (
    <main style={{ padding: '2rem' }}>
      <h1>vibe-bkit</h1>
      {isLoading && <p>API 연결 중...</p>}
      {isError && <p style={{ color: 'red' }}>API 연결 실패</p>}
      {data && (
        <p>
          API 상태: {data.status} ✅ ({data.timestamp})
        </p>
      )}
    </main>
  )
}
