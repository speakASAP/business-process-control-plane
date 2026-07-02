import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { WorkflowRegistryService } from './workflow-registry.service';

@Controller('api/workflows')
export class WorkflowRegistryController {
  constructor(private readonly workflowRegistry: WorkflowRegistryService) {}

  @Get()
  listWorkflows() {
    return this.workflowRegistry.listWorkflows();
  }

  @Get(':workflowId/versions/:version')
  getWorkflow(@Param('workflowId') workflowId: string, @Param('version', ParseIntPipe) version: number) {
    return this.workflowRegistry.getWorkflow(workflowId, version);
  }

  @Post(':workflowId/versions/:version/validate')
  validateWorkflow(@Param('workflowId') workflowId: string, @Param('version', ParseIntPipe) version: number) {
    return this.workflowRegistry.validateWorkflow(workflowId, version);
  }
}
