import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LoginSchema, type Login } from '@vibe-bkit/shared'
import { useAuthStore } from '@/stores/auth-store'
import { loginMutationOptions } from '@/services/auth/queries'

export function LoginForm() {
  const navigate = useNavigate()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Login>({
    resolver: zodResolver(LoginSchema),
  })

  const loginMutation = useMutation({
    ...loginMutationOptions(),
    onSuccess: (res) => {
      setAccessToken(res.data.accessToken)
      navigate('/')
    },
    onError: () => {
      setServerError('이메일 또는 비밀번호가 올바르지 않습니다')
    },
  })

  const onSubmit = (data: Login) => {
    setServerError(null)
    loginMutation.mutate(data)
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
        disabled={loginMutation.isPending}
        style={{ padding: '0.75rem', cursor: 'pointer' }}
      >
        {loginMutation.isPending ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}
