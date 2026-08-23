import { IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateInstanceDto {
  @IsString()
  @MinLength(1)
  workflowId!: string;

  @IsInt()
  @Min(1)
  workflowVersion!: number;

  @IsString()
  @MinLength(1)
  correlationKey!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
