import { Prisma, type Category as CategoryRow } from '@prisma/client'
import { ConflictError, NotFoundError } from '../../common/errors/domain.error'
import { CategoryService } from './category.service'
import type { CategoryRepository } from './category.repository'

function repoMock() {
  return {
    create: jest.fn(),
    findMany: jest.fn(),
    rename: jest.fn(),
    archive: jest.fn(),
  } as unknown as jest.Mocked<CategoryRepository>
}

function row(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: 'cat-1',
    userId: 'user-1',
    name: 'Mercado',
    archivedAt: null,
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  }
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: '6.19.3' })
}

describe('CategoryService', () => {
  it('create: devolve o DTO', async () => {
    const repo = repoMock()
    repo.create.mockResolvedValue(row())
    const service = new CategoryService(repo)

    await expect(service.create('user-1', { name: 'Mercado' })).resolves.toEqual({
      id: 'cat-1',
      name: 'Mercado',
      archivedAt: null,
      createdAt: '2026-09-01T00:00:00.000Z',
    })
  })

  it('create: nome duplicado vira 409 CATEGORY_NAME_TAKEN, não o erro cru do Prisma', async () => {
    const repo = repoMock()
    repo.create.mockRejectedValue(prismaError('P2002'))
    const service = new CategoryService(repo)

    await expect(service.create('user-1', { name: 'Mercado' })).rejects.toBeInstanceOf(ConflictError)
  })

  it('create: outro erro do Prisma não é mascarado como conflito', async () => {
    const repo = repoMock()
    repo.create.mockRejectedValue(prismaError('P2003'))
    const service = new CategoryService(repo)

    await expect(service.create('user-1', { name: 'Mercado' })).rejects.not.toBeInstanceOf(ConflictError)
  })

  it('rename: nome duplicado também vira 409', async () => {
    const repo = repoMock()
    repo.rename.mockRejectedValue(prismaError('P2002'))
    const service = new CategoryService(repo)

    await expect(service.rename('user-1', 'cat-1', { name: 'Lazer' })).rejects.toBeInstanceOf(ConflictError)
  })

  it('rename: categoria inexistente (ou de outro usuário) vira 404', async () => {
    const repo = repoMock()
    repo.rename.mockRejectedValue(prismaError('P2025'))
    const service = new CategoryService(repo)

    await expect(service.rename('user-1', 'de-outro', { name: 'Lazer' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('archive: 404 quando não encontra a categoria do usuário', async () => {
    const repo = repoMock()
    repo.archive.mockResolvedValue({ count: 0 })
    const service = new CategoryService(repo)

    await expect(service.archive('user-1', 'de-outro')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('list: repassa o filtro de arquivadas', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([row()])
    const service = new CategoryService(repo)

    await service.list('user-1', true)
    expect(repo.findMany).toHaveBeenCalledWith('user-1', true)
  })
})
