'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch, type AdminProfile } from '@danvic/api-client'
import { AppShell, type NavigationGroup } from '@danvic/ui'
import {
  Archive,
  FileCheck2,
  Files,
  History,
  Library,
  MailPlus,
  Users,
} from 'lucide-react'
import { NotificationCenter } from './notifications-center'
import { SessionRenewal } from './session-renewal'

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [admin, setAdmin] = useState<AdminProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void apiFetch<{ admin: AdminProfile }>('/api/auth/me')
      .then(({ admin: profile }) => setAdmin(profile))
      .catch((cause: unknown) => {
        const code = (cause as { code?: string }).code
        if (code === 'TWO_FACTOR_SETUP_REQUIRED') {
          const next = pathname?.startsWith('/') ? pathname : '/dashboard'
          router.replace(`/two-factor/setup?next=${encodeURIComponent(next)}`)
          return
        }
        setError('Your session has ended. Please sign in again.')
        router.replace('/login')
      })
  }, [pathname, router])

  if (!admin) {
    return (
      <main className="sb-login-form-wrap" style={{ minHeight: '100vh' }}>
        <p className="sb-form-message" data-tone={error ? 'error' : 'info'}>
          {error || 'Loading your workspace…'}
        </p>
      </main>
    )
  }

  const canReviewContent = admin.isSuperAdmin || admin.permissions.some((permission) =>
    ['review_content', 'manage_content_assessment', 'content_assessment'].includes(permission),
  )
  if (pathname?.startsWith('/content-assessment') && !canReviewContent) {
    return <main className="sb-login-form-wrap"><p className="sb-form-message" data-tone="error">Access denied. Your administrator permissions do not include Content Assessment.</p></main>
  }
  const contentNavigation: NavigationGroup[] = [
    { label: 'Content', items: [
      { label: 'All content', href: '/content-assessment/content', icon: Files },
      { label: 'Pending review', href: '/content-assessment/content/pending', icon: FileCheck2 },
      { label: 'Archived', href: '/content-assessment/content/archived', icon: Archive },
    ] },
    { label: 'Assessment', items: [
      { label: 'Assessment overview', href: '/content-assessment/assessments', icon: Files },
      { label: 'Question bank', href: '/content-assessment/question-bank', icon: Library },
    ] },
    { label: 'Version Control', items: [{ label: 'Versions', href: '/content-assessment/versions', icon: History }] },
    { label: 'Tutors', items: [
      { label: 'Tutor overview', href: '/content-assessment/tutors/overview', icon: Users },
      { label: 'Invite tutor', href: '/invitations#invite', icon: MailPlus },
    ] },
  ]

  return (
    <AppShell
      kind="admin"
      displayName={`${admin.firstName} ${admin.lastName}`}
      email={admin.email}
      {...(canReviewContent ? { navigationOverride: contentNavigation } : {})}
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
