import { Suspense } from 'react'
import { LoginForm } from './login-form'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-6">
          <div className="text-center">Chargement...</div>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
