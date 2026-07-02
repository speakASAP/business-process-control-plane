import { Module } from '@nestjs/common';
import { EditorController } from './editor.controller';

@Module({
  controllers: [EditorController],
})
export class EditorModule {}
