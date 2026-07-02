import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateProcessDto } from './dto/create-process.dto';
import { ProcessRegistryService } from './process-registry.service';

@Controller('api/processes')
export class ProcessRegistryController {
  constructor(private readonly processRegistry: ProcessRegistryService) {}

  @Get()
  listProcesses() {
    return this.processRegistry.listProcesses();
  }

  @Post()
  createProcess(@Body() dto: CreateProcessDto) {
    return this.processRegistry.createProcess(dto);
  }

  @Get(':processId/versions/:version')
  getProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return this.processRegistry.getProcess(processId, version);
  }

  @Post(':processId/versions/:version/validate')
  validateProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return this.processRegistry.validateProcess(processId, version);
  }

  @Post(':processId/versions/:version/publish')
  publishProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    const validation = this.processRegistry.validateProcess(processId, version);
    if (!validation.valid) {
      return {
        status: 'rejected',
        validation,
      };
    }

    return {
      status: 'published-in-memory',
      process: this.processRegistry.transition(processId, version, 'active'),
      warnings: ['[MISSING: signed publication and event bus broadcast]'],
    };
  }

  @Post(':processId/versions/:version/pause')
  pauseProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return {
      status: 'paused-in-memory',
      process: this.processRegistry.transition(processId, version, 'paused'),
      warnings: ['[MISSING: pause event broadcast to service adapters]'],
    };
  }
}
