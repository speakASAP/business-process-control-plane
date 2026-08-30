import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { AuthIdentityGuard } from '../auth/auth-identity.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { CreateProcessDto } from './dto/create-process.dto';
import { ProcessRegistryService } from './process-registry.service';

@Controller('api/processes')
export class ProcessRegistryController {
  constructor(private readonly processRegistry: ProcessRegistryService) {}

  @Get()
  async listProcesses() {
    return this.processRegistry.listProcesses();
  }

  @Post()
  @UseGuards(AuthIdentityGuard)
  async createProcess(@Body() dto: CreateProcessDto, @Req() request: AuthenticatedRequest) {
    return this.processRegistry.createProcess(dto, this.actor(request));
  }

  @Get('store/info')
  async getStoreInfo() {
    return this.processRegistry.getStoreInfo();
  }

  @Get(':processId/audit')
  async getProcessAudit(@Param('processId') processId: string) {
    return this.processRegistry.getAudit(processId);
  }

  @Get(':processId/versions/:version')
  async getProcess(@Param('processId') processId: string, @Param('version', ParseIntPipe) version: number) {
    return this.processRegistry.getProcess(processId, version);
  }

  @Get(':processId/versions/:version/audit')
  async getProcessVersionAudit(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.processRegistry.getAudit(processId, version);
  }

  @Post(':processId/versions/:version/validate')
  @UseGuards(AuthIdentityGuard)
  async validateProcess(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.processRegistry.validateProcess(processId, version, this.actor(request));
  }

  @Post(':processId/versions/:version/schedule')
  @UseGuards(AuthIdentityGuard)
  async scheduleProcess(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      status: 'scheduled-in-registry',
      process: await this.processRegistry.scheduleProcess(processId, version, this.actor(request)),
      warnings: ['[MISSING: activation scheduler runtime is not wired]'],
    };
  }

  @Post(':processId/versions/:version/publish')
  @UseGuards(AuthIdentityGuard)
  async publishProcess(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      status: 'published-in-registry',
      process: await this.processRegistry.publishProcess(processId, version, this.actor(request)),
      warnings: ['[MISSING: signed publication and event bus broadcast]'],
    };
  }

  @Post(':processId/versions/:version/pause')
  @UseGuards(AuthIdentityGuard)
  async pauseProcess(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      status: 'paused-in-registry',
      process: await this.processRegistry.pauseProcess(processId, version, this.actor(request)),
      warnings: ['[MISSING: pause event broadcast to service adapters]'],
    };
  }

  @Post(':processId/versions/:version/retire')
  @UseGuards(AuthIdentityGuard)
  async retireProcess(
    @Param('processId') processId: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return {
      status: 'retired-in-registry',
      process: await this.processRegistry.retireProcess(processId, version, this.actor(request)),
      warnings: ['[MISSING: retirement event broadcast to service adapters]'],
    };
  }

  private actor(request: AuthenticatedRequest): string {
    return request.authIdentity?.actor ?? request.authIdentity?.subject ?? 'system';
  }
}
