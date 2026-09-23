import { Module } from '@nestjs/common'
import { InsightController } from './insight.controller'
import { InsightRepository } from './insight.repository'
import { InsightService } from './insight.service'

@Module({
  controllers: [InsightController],
  providers: [InsightService, InsightRepository],
})
export class InsightModule {}
