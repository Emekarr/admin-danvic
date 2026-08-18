'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch, type AdminProfile } from '@danvic/api-client'
import { AppShell } from '@danvic/ui'
import { NotificationCenter } from './notifications-center'
import { SessionRenewal } from './session-renewal'

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void apiFetch<{ admin: AdminProfile }>('/api/auth/me')
      .then(({ admin: profile }) => setAdmin(profile))
      .catch(() => {
        setError('Your session has ended. Please sign in again.')
        router.replace('/login')
      })
  }, [router])

  if (!admin) {
    return (
      <main className="sb-login-form-wrap" style={{ minHeight: '100vh' }}>
        <p className="sb-form-message" data-tone={error ? 'error' : 'info'}>
          {error || 'Loading your workspace…'}
        </p>
      </main>
    )
  }

  return (
    <AppShell
      kind="admin"
      displayName={`${admin.firstName} ${admin.lastName}`}
      email={admin.email}
      topbarActions={<NotificationCenter />}
      onLogout={async () => {
        await apiFetch('/api/auth/logout', { method: 'POST', body: '{}' })
      }}
    >
      <SessionRenewal />
      <div className="ad-page">{children}</div>
    </AppShell>
  )
}
