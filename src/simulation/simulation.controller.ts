import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SimulationService } from './simulation.service';
import { SimulationRequest } from './simulation.types';

@Controller('api/simulate')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Get('scenarios')
  listScenarios() {
    return this.simulationService.listScenarios();
  }

  @Post()
  simulate(@Body() request: SimulationRequest) {
    return this.simulationService.simulateHolidayDiscount(request);
  }

  @Post('scenarios/:scenarioId')
  simulateScenario(@Param('scenarioId') scenarioId: string) {
    return this.simulationService.simulateScenario(scenarioId);
  }
}
