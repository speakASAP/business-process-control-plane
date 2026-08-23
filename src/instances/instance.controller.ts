import { Body, Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { DeliverSignalDto } from './dto/deliver-signal.dto';
import { InstanceRepositoryService } from './instance-repository.service';
import { InstanceStatus } from './instance.types';
import { WorkflowExecutorService } from './workflow-executor.service';

@Controller('api/instances')
export class InstanceController {
  constructor(
    private readonly executor: WorkflowExecutorService,
    private readonly repo: InstanceRepositoryService,
  ) {}

  @Post()
  async create(@Body() body: CreateInstanceDto) {
    return this.executor.start({
      workflowId: body.workflowId,
      workflowVersion: body.workflowVersion,
      correlationKey: body.correlationKey,
      context: body.context ?? {},
    });
  }

  @Get()
  async list(@Query('correlationKey') correlationKey?: string, @Query('status') status?: InstanceStatus) {
    return this.repo.list({ correlationKey, status });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const instance = await this.repo.findById(id);
    if (!instance) {
      // 404 so callers can tell "no such instance" from "the lookup blew up".
      throw new NotFoundException(`workflow instance ${id} not found`);
    }
    return instance;
  }

  @Get(':id/audit')
  async audit(@Param('id') id: string) {
    const instance = await this.repo.findById(id);
    if (!instance) {
      throw new NotFoundException(`workflow instance ${id} not found`);
    }
    return { instance, steps: await this.repo.findSteps(id) };
  }

  @Post(':id/signals')
  async signal(@Param('id') id: string, @Body() body: DeliverSignalDto) {
    return this.executor.deliverSignal(id, body.name, body.payload ?? {});
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.repo.cancel(id);
  }
}
