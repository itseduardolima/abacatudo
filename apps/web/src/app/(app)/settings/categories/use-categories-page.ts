'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import type { Category, CreateCategoryInput } from '@gastos/shared'
import { useArchiveCategory } from '@/hooks/queries/use-archive-category'
import { useCategories } from '@/hooks/queries/use-categories'
import { useCreateCategory } from '@/hooks/queries/use-create-category'
import { useRenameCategory } from '@/hooks/queries/use-rename-category'
import { ApiClientError } from '@/lib/api-client'

// Hook de página: só orquestração (04-padroes-codigo). Um form só serve criar e renomear — `editing`
// diferencia os dois; mesma submissão numerada de use-accounts-page.ts contra a corrida do cancelar.
export function useCategoriesPage() {
  const categories = useCategories()
  const createCategory = useCreateCategory()
  const renameCategory = useRenameCategory()
  const archiveCategory = useArchiveCategory()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [ruleError, setRuleError] = useState<string | null>(null)
  const submissionRef = useRef(0)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateCategoryInput>({ defaultValues: { name: '' } })

  const isSaving = editing ? renameCategory.isPending : createCategory.isPending

  const onSubmit = handleSubmit(async (values) => {
    const submission = ++submissionRef.current
    setRuleError(null)
    try {
      if (editing) {
        await renameCategory.mutateAsync({ id: editing.id, input: values })
      } else {
        await createCategory.mutateAsync(values)
      }
      if (submission !== submissionRef.current) return
      reset()
      setIsFormOpen(false)
      setEditing(null)
    } catch (error) {
      if (!(error instanceof ApiClientError)) throw error
      if (submission !== submissionRef.current) return

      const fieldErrors = error.error.details?.fieldErrors as Record<string, string[] | undefined> | undefined
      if (fieldErrors?.name?.[0]) {
        setError('name', { message: fieldErrors.name[0] })
      } else {
        setRuleError(error.error.message)
      }
    }
  })

  const closeForm = () => {
    submissionRef.current++
    setIsFormOpen(false)
    setEditing(null)
    reset()
    setRuleError(null)
  }

  return {
    categories: categories.data ?? [],
    isLoadingCategories: categories.isPending,
    isFormOpen,
    editing,
    // Trocar de alvo sem passar por "Cancelar" (a lista continua clicável com o form aberto) também precisa
    // invalidar a submissão em andamento e limpar o erro da tentativa anterior — senão um erro de regra de
    // "Nova categoria" ficava colado embaixo de "Renomear categoria" depois de clicar direto na lista.
    openCreateForm: () => {
      submissionRef.current++
      setEditing(null)
      reset({ name: '' })
      setIsFormOpen(true)
      setRuleError(null)
    },
    openEditForm: (category: Category) => {
      submissionRef.current++
      setEditing(category)
      reset({ name: category.name })
      setIsFormOpen(true)
      setRuleError(null)
    },
    closeForm,
    register,
    errors,
    onSubmit,
    isSaving,
    ruleError,
    archiveCategory: (id: string) => archiveCategory.mutate(id),
    archivingId: archiveCategory.isPending ? archiveCategory.variables : undefined,
  }
}
