import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { logoutMutationOptions } from '@/services/auth/queries'

export function HomePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const logoutMutation = useMutation({
    ...logoutMutationOptions(),
    onSettled: () => {
      clearAuth()
      navigate('/login')
    },
  })

  return (
    <main style={{ padding: '2rem' }}>
      <h1>홈</h1>
      <p>로그인에 성공했습니다.</p>
      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
      </button>
    </main>
  )
}
