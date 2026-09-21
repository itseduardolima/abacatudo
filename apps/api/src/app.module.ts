import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { ZodValidationPipe } from 'nestjs-zod'
import { validateEnv } from './common/config/env'
import { DomainExceptionFilter } from './common/filters/domain-exception.filter'
import { AuthGuard } from './common/guards/auth.guard'
import { RequestIdMiddleware } from './common/middlewares/request-id.middleware'
import { HealthModule } from './modules/health/health.module'
import { PrismaModule } from './prisma/prisma.module'

// Módulos de domínio entram aqui conforme forem criados, um por vez.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Ligado por padrão em todo ambiente; só o .env de dev local desliga (08-seguranca § 5).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const enabled = config.get<string>('RATE_LIMIT_ENABLED', 'true') !== 'false'
        return [{ ttl: 60_000, limit: 120, skipIf: () => !enabled }]
      },
    }),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path')
  }
}
