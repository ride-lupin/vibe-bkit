import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { logoutMutationOptions } from '@/services/auth/queries'
import { profileQueryOptions } from '@/services/user/queries'

export function HomePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const { data: profile, isLoading } = useQuery(profileQueryOptions())

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
      {isLoading ? (
        <p>불러오는 중...</p>
      ) : profile ? (
        <section>
          <dl>
            <dt>이름</dt>
            <dd>{profile.data.name}</dd>
            <dt>이메일</dt>
            <dd>{profile.data.email}</dd>
            <dt>권한</dt>
            <dd>{profile.data.role}</dd>
            <dt>연락처</dt>
            <dd>{profile.data.phone}</dd>
          </dl>
        </section>
      ) : null}
      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
      >
        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
      </button>
    </main>
  )
}
