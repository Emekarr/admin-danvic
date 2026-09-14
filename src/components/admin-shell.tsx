'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { apiFetch, type AdminProfile } from '@danvic/api-client'
import { AppShell, type NavigationGroup } from '@danvic/ui'
import {
  Archive,
  BookOpen,
  CalendarDays,
  CircleCheck,
  ClipboardCheck,
  FileCheck2,
  FileX2,
  Files,
  History,
  LayoutDashboard,
  Library,
  ListChecks,
  ShieldCheck,
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
      { label: 'Overview', href: '/content-assessment', icon: LayoutDashboard },
      { label: 'All content', href: '/content-assessment/content', icon: Files },
      { label: 'Pending review', href: '/content-assessment/content/pending', icon: FileCheck2 },
      { label: 'Approved', href: '/content-assessment/content/approved', icon: ShieldCheck },
      { label: 'Rejected', href: '/content-assessment/content/rejected', icon: FileX2 },
      { label: 'Published', href: '/content-assessment/content/published', icon: BookOpen },
      { label: 'Archived', href: '/content-assessment/content/archived', icon: Archive },
    ] },
    { label: 'Assessment', items: [
      { label: 'Assessment overview', href: '/content-assessment/assessments', icon: ClipboardCheck },
      { label: 'Assignments', href: '/content-assessment/assessments/assignments', icon: ListChecks },
      { label: 'Quizzes', href: '/content-assessment/assessments/quizzes', icon: ListChecks },
      { label: 'Exams', href: '/content-assessment/assessments/exams', icon: ListChecks },
      { label: 'Question bank', href: '/content-assessment/question-bank', icon: Library },
      { label: 'Pending assessment', href: '/content-assessment/assessments/pending', icon: FileCheck2 },
    ] },
    { label: 'Content Review', items: [
      { label: 'Technical accuracy', href: '/content-assessment/reviews/technical-accuracy', icon: CircleCheck },
      { label: 'Brand consistency', href: '/content-assessment/reviews/brand-consistency', icon: CircleCheck },
      { label: 'Copyright / IP', href: '/content-assessment/reviews/copyright-ip', icon: CircleCheck },
      { label: 'Safety & regulatory', href: '/content-assessment/reviews/safety-regulatory', icon: CircleCheck },
      { label: 'Content quality', href: '/content-assessment/reviews/content-quality', icon: CircleCheck },
      { label: 'Review history', href: '/content-assessment/reviews/history', icon: History },
    ] },
    { label: 'Version Control', items: [
      { label: 'Published versions', href: '/content-assessment/versions/published', icon: BookOpen },
      { label: 'Draft versions', href: '/content-assessment/versions/drafts', icon: Files },
      { label: 'Version history', href: '/content-assessment/versions/history', icon: History },
      { label: 'Controlled updates', href: '/content-assessment/versions/controlled-updates', icon: FileCheck2 },
      { label: 'Review dates', href: '/content-assessment/review-dates', icon: CalendarDays },
    ] },
    { label: 'Tutors', items: [
      { label: 'Overview', href: '/content-assessment/tutors/overview', icon: LayoutDashboard },
      { label: 'All Tutors', href: '/content-assessment/tutors', icon: Users },
      { label: 'Tutors with Pending Content', href: '/content-assessment/tutors/pending', icon: FileCheck2 },
      { label: 'Tutors with Approved Content', href: '/content-assessment/tutors/approved', icon: ShieldCheck },
      { label: 'Tutors with Rejected Content', href: '/content-assessment/tutors/rejected', icon: Archive },
      { label: 'Tutors with Content Requiring Updates', href: '/content-assessment/tutors/requires-updates', icon: History },
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
