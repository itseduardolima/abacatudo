import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import type { Envelope, EnvelopeList } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CreateEnvelopeDto } from './dto/create-envelope.dto'
import { UpdateEnvelopeDto } from './dto/update-envelope.dto'
import { EnvelopeService } from './envelope.service'

@Controller('budget/envelopes')
export class EnvelopeController {
  constructor(private readonly envelopes: EnvelopeService) {}

  @Get()
  list(@CurrentUser() userId: string, @Query('month') month?: string): Promise<EnvelopeList> {
    return this.envelopes.list(userId, month)
  }

  @Post()
  create(
    @CurrentUser() userId: string,
    @Body() body: CreateEnvelopeDto,
    @Query('month') month?: string,
  ): Promise<Envelope> {
    return this.envelopes.create(userId, month, body)
  }

  @Patch(':id')
  update(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateEnvelopeDto,
  ): Promise<Envelope> {
    return this.envelopes.update(userId, id, body)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.envelopes.remove(userId, id)
  }
}
