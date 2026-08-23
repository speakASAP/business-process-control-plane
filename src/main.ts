import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // Node v22+/v24: without reflect-metadata loaded, @nestjs/schedule's decorator metadata
  // is dropped and @Cron jobs never fire — with no error anywhere. Assert rather than
  // trust, because the failure mode is silence.
  if (typeof (Reflect as unknown as Record<string, unknown>).getMetadata !== 'function') {
    throw new Error('reflect-metadata did not install Reflect.getMetadata; @Cron jobs would silently never fire');
  }

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({ origin: true, credentials: true });

  const port = Number(process.env.PORT ?? 3375);
  await app.listen(port);
}

void bootstrap();
