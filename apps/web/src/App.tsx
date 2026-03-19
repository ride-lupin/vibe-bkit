import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { LoginPage } from '@/pages/login'
import { HomePage } from '@/pages/home'
import { ProtectedRoute } from '@/lib/protected-route'

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
  return <RouterProvider router={router} />
}
