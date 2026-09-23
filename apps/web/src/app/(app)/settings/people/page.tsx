'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { usePeoplePage } from './use-people-page'

export default function PeoplePage() {
  const {
    people,
    isLoadingPeople,
    isFormOpen,
    openForm,
    closeForm,
    register,
    errors,
    onSubmit,
    isSubmitting,
    ruleError,
    archivePerson,
    archivingId,
  } = usePeoplePage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 py-8">
      <div>
        <Link href="/" className="text-sm text-muted underline underline-offset-4">
          ← Início
        </Link>
        <h1 className="display-number mt-2 text-[2rem] text-ink">Pessoas</h1>
      </div>

      {isLoadingPeople && <p className="text-text">Carregando…</p>}

      {people.length > 0 && (
        <ul className="flex flex-col gap-3">
          {people.map((person) => (
            <li key={person.id} className="flex items-center justify-between rounded-card border border-border p-4">
              <span className="flex items-center gap-2 font-medium text-ink">
                {person.name}
                {person.isSelf && <Badge>Eu</Badge>}
              </span>
              {!person.isSelf && (
                <Button
                  variant="link"
                  size="sm"
                  state={archivingId === person.id ? 'loading' : 'idle'}
                  onClick={() => archivePerson(person.id)}
                >
                  Arquivar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!isFormOpen && (
        <Button variant="outline" onClick={openForm}>
          Nova pessoa
        </Button>
      )}

      {isFormOpen && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Input label="Nome" placeholder="Cônjuge, filho..." error={errors.name?.message} {...register('name')} />
          <div className="flex gap-3">
            <Button type="submit" state={isSubmitting ? 'loading' : 'idle'}>
              Salvar
            </Button>
            <Button type="button" variant="link" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </main>
  )
}
