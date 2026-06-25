import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../config/env.validation';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => ({
        type: 'postgres',
        url: configService.get('databaseUrl', { infer: true }),
        ssl: configService.get('databaseSsl', { infer: true })
          ? { rejectUnauthorized: false }
          : false,
        synchronize: configService.get('databaseSynchronize', { infer: true }),
        logging: configService.get('typeormLogging', { infer: true }),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
