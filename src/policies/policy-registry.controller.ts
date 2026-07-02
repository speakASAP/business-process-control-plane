import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PolicyRegistryService } from './policy-registry.service';

@Controller('api/policies')
export class PolicyRegistryController {
  constructor(private readonly policyRegistry: PolicyRegistryService) {}

  @Get()
  listPolicies() {
    return this.policyRegistry.listPolicies();
  }

  @Get(':policyId/versions/:version')
  getPolicy(@Param('policyId') policyId: string, @Param('version', ParseIntPipe) version: number) {
    return this.policyRegistry.getPolicy(policyId, version);
  }

  @Post(':policyId/versions/:version/validate')
  validatePolicy(@Param('policyId') policyId: string, @Param('version', ParseIntPipe) version: number) {
    return this.policyRegistry.validatePolicy(policyId, version);
  }
}
