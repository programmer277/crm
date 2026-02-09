import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envValidationSchema } from './config/env.validation';
import { appConfig } from './config/app.config';

import { RoomsModule } from './rooms/rooms.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [appConfig],
    }),

    // ✅ DB layer
    PrismaModule,

    // ✅ Feature module
    RoomsModule,
  ],
})
export class AppModule {}
