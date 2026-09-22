import { z } from 'zod'
import { idSchema } from './common'

export const bankConnectionStatusSchema = z.enum([
  'WAITING_USER_INPUT',
  'UPDATING',
  'UPDATED',
  'LOGIN_ERROR',
  'OUTDATED',
  'ERROR',
])
export type BankConnectionStatus = z.infer<typeof bankConnectionStatusSchema>

export const bankConnectionSchema = z
  .object({
    id: idSchema,
    institutionName: z.string(),
    status: bankConnectionStatusSchema,
    consentExpiresAt: z.string().datetime().nullable(),
    lastSyncAt: z.string().datetime().nullable(),
    lastErrorCode: z.string().nullable(),
    createdAt: z.string().datetime(),
  })
  .strict()
export type BankConnection = z.infer<typeof bankConnectionSchema>

export const connectBankResponseSchema = z.object({ id: idSchema, authorizeUrl: z.string().url() }).strict()
export type ConnectBankResponse = z.infer<typeof connectBankResponseSchema>

export const syncResultSchema = z
  .object({ accountsSynced: z.number().int(), transactionsSynced: z.number().int() })
  .strict()
export type SyncResult = z.infer<typeof syncResultSchema>
