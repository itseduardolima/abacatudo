import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import type { Category } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CategoryService } from './category.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update-category.dto'

@Controller('categories')
export class CategoryController {
  constructor(private readonly categories: CategoryService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() body: CreateCategoryDto): Promise<Category> {
    return this.categories.create(userId, body)
  }

  @Get()
  list(@CurrentUser() userId: string, @Query('includeArchived') includeArchived?: string): Promise<Category[]> {
    return this.categories.list(userId, includeArchived === 'true')
  }

  @Patch(':id')
  rename(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categories.rename(userId, id, body)
  }

  @Patch(':id/archive')
  @HttpCode(204)
  archive(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categories.archive(userId, id)
  }
}
