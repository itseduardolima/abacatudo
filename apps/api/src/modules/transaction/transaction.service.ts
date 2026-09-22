import { Injectable } from '@nestjs/common'
import type { Transaction, UpdateTransactionCategoryInput, UpdateTransactionPersonInput } from '@gastos/shared'
import { monthKey, monthRange } from '../../common/date/timezone'
import { DomainError, NotFoundError } from '../../common/errors/domain.error'
import { CategoryRepository } from '../category/category.repository'
import { PersonRepository } from '../person/person.repository'
import { normalizeMerchant } from '../rule/normalize-merchant'
import { RuleRepository } from '../rule/rule.repository'
import { SplitRepository } from '../split/split.repository'
import { toTransactionDto } from './transaction.mapper'
import { TransactionRepository } from './transaction.repository'

const NOT_FOUND = () => new NotFoundError('TRANSACTION_NOT_FOUND', 'Transação não encontrada.')
const MERCHANT_REQUIRED_FOR_RULE = () =>
  new DomainError(
    'MERCHANT_REQUIRED_FOR_RULE',
    'Essa transação não tem estabelecimento identificado — não dá pra criar uma regra.',
    400,
  )

@Injectable()
export class TransactionService {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly people: PersonRepository,
    private readonly categories: CategoryRepository,
    private readonly rules: RuleRepository,
    private readonly splits: SplitRepository,
  ) {}

  async listByMonth(userId: string, month?: string): Promise<Transaction[]> {
    const key = month ?? monthKey(new Date())
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) {
      throw new DomainError('INVALID_MONTH', 'Mês inválido (esperado AAAA-MM).', 400)
    }
    return (await this.repo.findMany(userId, monthRange(key))).map(toTransactionDto)
  }

  async updatePerson(userId: string, id: string, input: UpdateTransactionPersonInput): Promise<Transaction> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()

    const person = await this.people.findById(userId, input.personId)
    if (!person) throw new NotFoundError('PERSON_NOT_FOUND', 'Pessoa não encontrada.')

    if (input.alwaysForMerchant) {
      if (!existing.merchant) throw MERCHANT_REQUIRED_FOR_RULE()
      await this.rules.upsertPerson(userId, normalizeMerchant(existing.merchant), input.personId)
    }

    const result = await this.repo.updatePerson(userId, id, input.personId)
    if (result.count === 0) throw NOT_FOUND()
    // Corrigir a pessoa direto é uma forma de desfazer uma divisão — a transação volta a ter um dono só.
    await this.splits.deleteAll(userId, id)

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated)
  }

  async updateCategory(userId: string, id: string, input: UpdateTransactionCategoryInput): Promise<Transaction> {
    const existing = await this.repo.findById(userId, id)
    if (!existing) throw NOT_FOUND()

    const category = await this.categories.findById(userId, input.categoryId)
    if (!category) throw new NotFoundError('CATEGORY_NOT_FOUND', 'Categoria não encontrada.')

    if (input.alwaysForMerchant) {
      if (!existing.merchant) throw MERCHANT_REQUIRED_FOR_RULE()
      await this.rules.upsertCategory(userId, normalizeMerchant(existing.merchant), input.categoryId)
    }

    const result = await this.repo.updateCategory(userId, id, input.categoryId)
    if (result.count === 0) throw NOT_FOUND()

    const updated = await this.repo.findById(userId, id)
    if (!updated) throw NOT_FOUND()
    return toTransactionDto(updated)
  }
}
