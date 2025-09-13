import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { getMongoConfig } from '../configs/mongo.config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: getMongoConfig,
    }),
  ],
})
export class DatabaseModule {}