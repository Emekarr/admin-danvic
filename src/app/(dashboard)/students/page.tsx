import { AdminDirectory } from '@/components/admin-data-pages'

export const metadata = { title: 'Students' }

export default function Page() {
  return <AdminDirectory kind="student" />
}
