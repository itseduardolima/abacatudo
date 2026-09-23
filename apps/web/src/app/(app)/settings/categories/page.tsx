'use client'

import { Pencil, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { useCategoriesPage } from './use-categories-page'

// Linha sem card, divisória fina (mesmo padrão de Pessoas/Contas) — ícone de categoria + nome, ações por
// ícone (lápis renomeia, X arquiva) em vez de link de texto.
export default function CategoriesPage() {
  const {
    categories,
    isLoadingCategories,
    isFormOpen,
    editing,
    openCreateForm,
    openEditForm,
    closeForm,
    register,
    errors,
    onSubmit,
    isSaving,
    ruleError,
    archiveCategory,
    archivingId,
  } = useCategoriesPage()

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 md:pb-10 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Categorias</h1>
      </div>

      {isLoadingCategories && <p className="text-text">Carregando…</p>}

      {categories.length > 0 && (
        <ul className="flex flex-col">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center gap-3 border-b border-surface py-3 last:border-b-0">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface text-ink">
                <Tag size={18} strokeWidth={1.8} />
              </span>
              <p className="flex-1 font-semibold text-ink">{category.name}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-[34px] !px-0"
                onClick={() => openEditForm(category)}
                aria-label={`Renomear ${category.name}`}
              >
                <Pencil size={16} strokeWidth={1.8} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-[34px] !px-0"
                state={archivingId === category.id ? 'loading' : 'idle'}
                onClick={() => archiveCategory(category.id)}
                aria-label={`Arquivar ${category.name}`}
              >
                <X size={18} strokeWidth={1.8} />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {!isFormOpen && (
        <Button variant="outline" onClick={openCreateForm}>
          Nova categoria
        </Button>
      )}

      {isFormOpen && (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          {ruleError && <InlineAlert>{ruleError}</InlineAlert>}
          <Input
            label={editing ? 'Renomear categoria' : 'Nome'}
            placeholder="Mercado, Lazer..."
            error={errors.name?.message}
            {...register('name')}
          />
          <div className="flex gap-3">
            <Button type="submit" state={isSaving ? 'loading' : 'idle'}>
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
