import { Suspense } from 'react'
import { AcceptInvitationForm } from '@/components/auth-forms'

export const metadata = { title: 'Accept administrator invitation' }
export default function Page() {
  return <Suspense fallback={null}><AcceptInvitationForm /></Suspense>
}
