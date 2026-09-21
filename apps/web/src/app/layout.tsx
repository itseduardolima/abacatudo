import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import '@fontsource-variable/inter'
import { QueryProvider } from '@/components/providers/query-provider'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'AbacaTudo',
  description: 'Da fatura, só o que é seu.',
}

export const viewport: Viewport = { themeColor: '#ffffff' }

// A CSP com nonce (middleware.ts) exige renderização dinâmica: o nonce muda a cada requisição.
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
