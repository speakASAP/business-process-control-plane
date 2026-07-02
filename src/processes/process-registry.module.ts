import { Module } from '@nestjs/common';
import { ProcessRegistryController } from './process-registry.controller';
import { ProcessRegistryService } from './process-registry.service';

@Module({
  controllers: [ProcessRegistryController],
  providers: [ProcessRegistryService],
  exports: [ProcessRegistryService],
})
export class ProcessRegistryModule {}
