import { Body, Controller, Post } from '@nestjs/common';
import { SimulationRequest, SimulationService } from './simulation.service';

@Controller('api/simulate')
export class SimulationController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post()
  simulate(@Body() request: SimulationRequest) {
    return this.simulationService.simulateHolidayDiscount(request);
  }
}
