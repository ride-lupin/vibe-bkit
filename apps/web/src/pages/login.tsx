import { LoginForm } from '@/components/login-form'

export function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-8">
      <h1 className="text-2xl font-bold mb-6">로그인</h1>
      <LoginForm />
    </main>
  )
}
