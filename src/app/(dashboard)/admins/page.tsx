import { AdminDirectory } from '@/components/admin-data-pages'

export const metadata = { title: 'Admins' }

export default function Page() {
  return <AdminDirectory kind="admin" />
}
