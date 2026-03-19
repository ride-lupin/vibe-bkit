import { LoginForm } from '@/components/login-form'

export function LoginPage() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '4rem 2rem',
      }}
    >
      <h1>로그인</h1>
      <LoginForm />
    </main>
  )
}
