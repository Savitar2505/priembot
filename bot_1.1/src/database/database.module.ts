import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://admin:admin@mongodb:27017/mydb?authSource=admin', {
      dbName: 'mydb',
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    }),
  ],
})
export class DatabaseModule {}