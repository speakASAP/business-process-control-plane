import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthIdentityGuard } from './auth-identity.guard';
import { AuthValidationClient } from './auth-validation.client';

@Module({
  imports: [ConfigModule],
  providers: [AuthValidationClient, AuthIdentityGuard],
  exports: [AuthValidationClient, AuthIdentityGuard],
})
export class AuthModule {}
