import type { Metadata } from 'next'
import { Montserrat, Open_Sans } from 'next/font/google'
import '@danvic/ui/styles.css'
import './brand.css'
import './admin.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'DANVIC Administration', template: '%s · DANVIC' },
  description: 'Secure learning operations and administrator access for DANVIC.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${openSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
