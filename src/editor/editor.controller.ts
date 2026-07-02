import { Controller, Get, Header } from '@nestjs/common';
import { renderProcessEditor } from './editor-ui';

@Controller()
export class EditorController {
  @Get()
  @Header('content-type', 'text/html; charset=utf-8')
  getRoot(): string {
    return renderProcessEditor();
  }

  @Get('editor')
  @Header('content-type', 'text/html; charset=utf-8')
  getEditor(): string {
    return renderProcessEditor();
  }
}
