import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da yo‘q fieldlar o‘chadi
      forbidNonWhitelisted: true, // ortiqcha field bo‘lsa 400
      transform: true, // DTO transform ishlaydi
      transformOptions: {
        enableImplicitConversion: false, // ✅ MUHIM
      },
    }),
  );

  app.setGlobalPrefix('api');
  await app.listen(3001);
}
bootstrap();
