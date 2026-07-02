import { Controller, Get } from '@nestjs/common';
import { CapabilityRegistryService } from './capability-registry.service';

@Controller('api/capabilities')
export class CapabilityRegistryController {
  constructor(private readonly capabilityRegistry: CapabilityRegistryService) {}

  @Get()
  listCapabilities() {
    return this.capabilityRegistry.listCapabilities();
  }
}
