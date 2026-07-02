import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ProcessStatus } from '../process.types';

const PROCESS_STATUSES: ProcessStatus[] = ['draft', 'validated', 'scheduled', 'active', 'paused', 'retired'];

export class CreateProcessDto {
  @IsString()
  processId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @IsOptional()
  @IsIn(PROCESS_STATUSES)
  status?: ProcessStatus;

  @IsOptional()
  @IsString()
  activeFrom?: string;

  @IsOptional()
  @IsString()
  activeTo?: string;

  @IsArray()
  @IsString({ each: true })
  policyRefs!: string[];

  @IsArray()
  @IsString({ each: true })
  workflowRefs!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  campaignRefs?: string[];

  @IsOptional()
  @IsBoolean()
  killSwitch?: boolean;
}
