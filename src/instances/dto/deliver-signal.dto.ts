import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class DeliverSignalDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
