import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <BottomNav />
    </>
  )
}
