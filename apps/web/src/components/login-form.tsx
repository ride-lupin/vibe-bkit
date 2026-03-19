import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { LoginSchema, type Login, type LoginResponse } from '@vibe-bkit/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

export function LoginForm() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Login>({
    resolver: zodResolver(LoginSchema),
  })

  const onSubmit = async (data: Login) => {
    setServerError(null)
    try {
      const res = await api.post('auth/login', { json: data }).json<LoginResponse>()
      setAccessToken(res.data.accessToken)
      navigate('/')
    } catch {
      setServerError('이메일 또는 비밀번호가 올바르지 않습니다')
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '320px' }}
    >
      <div>
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          {...register('email')}
          style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
        />
        {errors.email && (
          <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.email.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          {...register('password')}
          style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
        />
        {errors.password && (
          <span style={{ color: 'red', fontSize: '0.875rem' }}>{errors.password.message}</span>
        )}
      </div>

      {serverError && <p style={{ color: 'red', fontSize: '0.875rem' }}>{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        style={{ padding: '0.75rem', cursor: 'pointer' }}
      >
        {isSubmitting ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
