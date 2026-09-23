'use client'

import { Button } from '@/components/ui/Button'
import { BackIcon, IconButton } from '@/components/ui/IconButton'
import { InlineAlert } from '@/components/ui/InlineAlert'
import { Input } from '@/components/ui/Input'
import { useCategoriesPage } from './use-categories-page'

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
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col gap-6 px-4 pb-28 pt-8">
      <div className="flex items-center gap-3">
        <IconButton href="/">
          <BackIcon />
        </IconButton>
        <h1 className="display-number text-[2rem] text-ink">Categorias</h1>
      </div>

      {isLoadingCategories && <p className="text-text">Carregando…</p>}

      {categories.length > 0 && (
        <ul className="flex flex-col gap-3">
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between rounded-card border border-border p-4">
              <span className="font-medium text-ink">{category.name}</span>
              <div className="flex gap-3">
                <Button variant="link" size="sm" onClick={() => openEditForm(category)}>
                  Renomear
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  state={archivingId === category.id ? 'loading' : 'idle'}
                  onClick={() => archiveCategory(category.id)}
                >
                  Arquivar
                </Button>
              </div>
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
