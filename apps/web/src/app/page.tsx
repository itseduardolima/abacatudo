import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'

// Página provisória: o login entra na Sprint 1 (page.tsx é só view).
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[1200px] flex-col justify-between px-4 py-8">
      <Logo height={60} />
      <section className="max-w-[720px]">
        <h1 className="display-number text-balance text-[clamp(3rem,12vw,6.5rem)] text-ink">
          Da fatura, só o que é seu.
        </h1>
        <p className="mt-8 max-w-[52ch] text-lg text-text">
          A base do AbacaTudo está no ar. As telas entram uma sprint por vez.
        </p>
        <div className="mt-8">
          <Button variant="outline">Em construção</Button>
        </div>
      </section>
      <p className="text-sm text-muted">O acesso é só por convite.</p>
    </main>
  )
}
