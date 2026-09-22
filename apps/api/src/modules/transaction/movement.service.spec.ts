import { DomainError } from '../../common/errors/domain.error'
import { MovementService } from './movement.service'
import type { MovementRepository } from './movement.repository'

function repoMock() {
  return { findMany: jest.fn() } as unknown as jest.Mocked<MovementRepository>
}

describe('MovementService', () => {
  it('listByMonth: devolve o que a Repository trouxer (débito, Pix, TED... nunca cartão)', async () => {
    const repo = repoMock()
    repo.findMany.mockResolvedValue([])
    const service = new MovementService(repo)

    const result = await service.listByMonth('user-1', '2026-09')

    expect(repo.findMany).toHaveBeenCalledWith('user-1', { start: expect.any(Date), end: expect.any(Date) })
    expect(result).toEqual([])
  })

  it('listByMonth: mês em formato inválido é rejeitado antes de tocar no banco', async () => {
    const repo = repoMock()
    const service = new MovementService(repo)

    await expect(service.listByMonth('user-1', 'setembro')).rejects.toBeInstanceOf(DomainError)
    expect(repo.findMany).not.toHaveBeenCalled()
  })
})
