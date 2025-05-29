import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'grubboots',
  description: 'Created by hollerlabs',
  generator: 'hollerlabs',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
