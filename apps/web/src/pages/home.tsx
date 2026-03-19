import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'

export function HomePage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const handleLogout = async () => {
    try {
      await api.post('auth/logout')
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>홈</h1>
      <p>로그인에 성공했습니다.</p>
      <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
        로그아웃
      </button>
    </main>
  )
}
