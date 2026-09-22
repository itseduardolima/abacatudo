import { Injectable } from '@nestjs/common'
import { Prisma, type Category as CategoryRow } from '@prisma/client'
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@gastos/shared'
import { ConflictError, NotFoundError } from '../../common/errors/domain.error'
import { CategoryRepository } from './category.repository'

const NAME_TAKEN = () => new ConflictError('CATEGORY_NAME_TAKEN', 'Você já tem uma categoria com esse nome.')
const NOT_FOUND = () => new NotFoundError('CATEGORY_NOT_FOUND', 'Categoria não encontrada.')

@Injectable()
export class CategoryService {
  constructor(private readonly repo: CategoryRepository) {}

  async create(userId: string, input: CreateCategoryInput): Promise<Category> {
    try {
      return toDto(await this.repo.create(userId, input.name))
    } catch (error) {
      if (isUniqueViolation(error)) throw NAME_TAKEN()
      throw error
    }
  }

  async list(userId: string, includeArchived: boolean): Promise<Category[]> {
    return (await this.repo.findMany(userId, includeArchived)).map(toDto)
  }

  async rename(userId: string, id: string, input: UpdateCategoryInput): Promise<Category> {
    try {
      return toDto(await this.repo.rename(userId, id, input.name))
    } catch (error) {
      if (isUniqueViolation(error)) throw NAME_TAKEN()
      if (isNotFound(error)) throw NOT_FOUND()
      throw error
    }
  }

  async archive(userId: string, id: string): Promise<void> {
    const result = await this.repo.archive(userId, id)
    if (result.count === 0) throw NOT_FOUND()
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

function toDto(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}
