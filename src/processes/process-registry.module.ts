import { Module } from '@nestjs/common';
import { JsonFileStoreService } from '../storage/json-file-store.service';
import { ProcessRegistryController } from './process-registry.controller';
import { ProcessRegistryService } from './process-registry.service';

@Module({
  controllers: [ProcessRegistryController],
  providers: [JsonFileStoreService, ProcessRegistryService],
  exports: [ProcessRegistryService],
})
export class ProcessRegistryModule {}
