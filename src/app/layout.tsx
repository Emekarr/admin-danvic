import type { Metadata } from 'next'
import '@danvic/ui/styles.css'
import './admin.css'

export const metadata: Metadata = {
  title: { default: 'DANVIC Administration', template: '%s · DANVIC' },
  description: 'Secure learning operations and administrator access for DANVIC.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
