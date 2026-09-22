import { Inject, Injectable } from '@nestjs/common'
import type { Category, Prisma } from '@prisma/client'
import { PRISMA, type PrismaService } from '../../prisma/prisma.client'

@Injectable()
export class CategoryRepository {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaService) {}

  create(userId: string, name: string): Promise<Category> {
    return this.prisma.category.create({ data: { userId, name } })
  }

  findMany(userId: string, includeArchived: boolean): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId, ...(includeArchived ? {} : { archivedAt: null }) },
      orderBy: { name: 'asc' },
    })
  }

  findById(userId: string, id: string): Promise<Category | null> {
    return this.prisma.category.findFirst({ where: { userId, id } })
  }

  // where combinando id (única) + userId: Prisma resolve como UPDATE ... WHERE id = ? AND userId = ?, e
  // lança P2025 se 0 linhas baterem — cobre tanto "não existe" quanto "é de outro usuário" sem distinguir.
  rename(userId: string, id: string, name: string): Promise<Category> {
    return this.prisma.category.update({ where: { id, userId }, data: { name } })
  }

  archive(userId: string, id: string): Promise<Prisma.BatchPayload> {
    return this.prisma.category.updateMany({ where: { userId, id }, data: { archivedAt: new Date() } })
  }
}
