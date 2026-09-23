'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Barra flutuante do protótipo (08-fatura .nav): pílula com 16px de margem, só o item ativo mostra
// rótulo (dentro de uma pílula lima); os outros são só o ícone. Nav de verdade é Início/Classificar/
// Orçamento/Relatórios (05-componentizacao § layout) — "Classificar" aponta pra /transactions (onde a
// correção de categoria/pessoa já existe) até existir a tela dedicada do protótipo (09-classificar).
const LINKS = [
  { href: '/', label: 'Início', icon: HomeIcon },
  { href: '/transactions', label: 'Classificar', icon: ClassifyIcon },
] as const
const SOON = [
  { label: 'Orçamento', icon: BudgetIcon },
  { label: 'Relatórios', icon: ReportsIcon },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-4 bottom-4 z-10 mx-auto flex h-16 max-w-[388px] items-center gap-1 rounded-pill bg-surface p-2 shadow-hair md:hidden"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {LINKS.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'flex h-12 flex-none items-center gap-2 rounded-pill bg-primary px-[18px] text-sm font-semibold text-primary-ink'
                : 'flex h-12 flex-1 items-center justify-center rounded-pill text-text'
            }
          >
            <Icon />
            {isActive && label}
          </Link>
        )
      })}
      {SOON.map(({ label, icon: Icon }) => (
        <span
          key={label}
          className="flex h-12 flex-1 items-center justify-center rounded-pill text-border"
          title={`${label} (em breve)`}
        >
          <Icon />
        </span>
      ))}
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3.5 11.2 12 4l8.5 7.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 9.6V20h12V9.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ClassifyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3.5 12.2V4.5h7.7l9.3 9.3-7.7 7.7z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="9" r="1.3" />
    </svg>
  )
}

function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 20v-7M12 20V5M19 20v-10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
