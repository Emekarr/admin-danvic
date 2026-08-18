import { AdminDirectory } from '@/components/admin-data-pages'

export const metadata = { title: 'Courses' }

export default function Page() {
  return <AdminDirectory kind="course" />
}
