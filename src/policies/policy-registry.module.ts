import { Module } from '@nestjs/common';
import { PolicyRegistryController } from './policy-registry.controller';
import { PolicyRegistryService } from './policy-registry.service';

@Module({
  controllers: [PolicyRegistryController],
  providers: [PolicyRegistryService],
  exports: [PolicyRegistryService],
})
export class PolicyRegistryModule {}
