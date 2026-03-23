import { useEffect, useRef } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LoginPage } from '@/pages/login'
import { HomePage } from '@/pages/home'
import { ProtectedRoute } from '@/lib/protected-route'
import { silentRefresh } from '@/lib/api'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomePage />
      </ProtectedRoute>
    ),
  },
])

export default function App() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    silentRefresh()
  }, [])

  return <RouterProvider router={router} />
}
