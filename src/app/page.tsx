'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AdminShell } from '@/components/admin-shell'
import { ContentAssessmentRoute } from '@/components/content-assessment'

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/') router.replace('/dashboard')
  }, [pathname, router])

  // Static hosts serve this document for runtime content/tutor detail URLs.
  // Render the same workspace here so those URLs do not fall through to 404.
  if (pathname?.startsWith('/content-assessment')) {
    const slug = pathname.split('/').filter(Boolean).slice(1)
    return (
      <AdminShell>
        <ContentAssessmentRoute slug={slug} />
      </AdminShell>
    )
  }

  return null
}
