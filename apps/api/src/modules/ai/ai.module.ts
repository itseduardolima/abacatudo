import { Module } from '@nestjs/common'
import { CategoryModule } from '../category/category.module'
import { AiController } from './ai.controller'
import { AiUsageRepository } from './ai-usage.repository'
import { CategorySuggestionRepository } from './category-suggestion.repository'
import { CategorySuggestionService } from './category-suggestion.service'
import { ClaudeClient } from './claude.client'

@Module({
  imports: [CategoryModule],
  controllers: [AiController],
  providers: [ClaudeClient, CategorySuggestionRepository, AiUsageRepository, CategorySuggestionService],
})
export class AiModule {}
