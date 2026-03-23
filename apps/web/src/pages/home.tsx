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
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">홈</h1>
      {isLoading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : profile ? (
        <section>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-medium text-gray-500">이름</dt>
            <dd>{profile.data.name}</dd>
            <dt className="font-medium text-gray-500">이메일</dt>
            <dd>{profile.data.email}</dd>
            <dt className="font-medium text-gray-500">권한</dt>
            <dd>{profile.data.role}</dd>
            <dt className="font-medium text-gray-500">연락처</dt>
            <dd>{profile.data.phone}</dd>
          </dl>
        </section>
      ) : null}
      <button
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
      </button>
    </main>
  )
}
