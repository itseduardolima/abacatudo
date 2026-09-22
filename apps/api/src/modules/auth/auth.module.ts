import { Module } from '@nestjs/common'
import { AuthController } from './auth.controller'
import { AuthRepository } from './auth.repository'
import { AuthService } from './auth.service'
import { LoginAttemptTracker } from './login-attempt.tracker'

// Exporta AuthService (não SessionMiddleware): o middleware é instanciado pelo AppModule via
// consumer.apply(), que resolve o construtor dele a partir do que o AppModule enxerga — bastando
// importar este módulo. Mesmo padrão do TenantModule/TenantMiddleware do pdv-web.
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, LoginAttemptTracker],
  exports: [AuthService],
})
export class AuthModule {}
