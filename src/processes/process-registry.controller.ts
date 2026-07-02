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

  @Get('store/info')
  getStoreInfo() {
    return this.processRegistry.getStoreInfo();
  }

  @Get(':processId/audit')
  getProcessAudit(@Param('processId') processId: string) {
    return this.processRegistry.getAudit(processId);
  }

  @Get(':processId/versions/:version')
  getProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return this.processRegistry.getProcess(processId, version);
  }

  @Get(':processId/versions/:version/audit')
  getProcessVersionAudit(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.processRegistry.getAudit(processId, version);
  }

  @Post(':processId/versions/:version/validate')
  validateProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return this.processRegistry.validateProcess(processId, version);
  }

  @Post(':processId/versions/:version/schedule')
  scheduleProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return {
      status: 'scheduled-in-registry',
      process: this.processRegistry.scheduleProcess(processId, version),
      warnings: ['[MISSING: activation scheduler runtime is not wired]'],
    };
  }

  @Post(':processId/versions/:version/publish')
  publishProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return {
      status: 'published-in-registry',
      process: this.processRegistry.publishProcess(processId, version),
      warnings: ['[MISSING: signed publication and event bus broadcast]'],
    };
  }

  @Post(':processId/versions/:version/pause')
  pauseProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return {
      status: 'paused-in-registry',
      process: this.processRegistry.pauseProcess(processId, version),
      warnings: ['[MISSING: pause event broadcast to service adapters]'],
    };
  }

  @Post(':processId/versions/:version/retire')
  retireProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return {
      status: 'retired-in-registry',
      process: this.processRegistry.retireProcess(processId, version),
      warnings: ['[MISSING: retirement event broadcast to service adapters]'],
    };
  }
}
