import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import mongoose from 'mongoose';
import { MongoServerError } from 'mongodb';

// Глобальная обработка ошибок
process.on('unhandledRejection', (error) => {
  if (error instanceof MongoServerError) {
    console.error('🔴 MONGODB ERROR DETAILS:');
    console.error('Operation:', error.errorResponse?.operationName);
    console.error('Command:', error.errorResponse?.commandName);
    console.error('Collection:', error.errorResponse?.errmsg?.match(/collection: (\w+)/)?.[1]);
    console.error('Full error:', JSON.stringify(error.errorResponse, null, 2));
  }
  console.error('Unhandled Rejection:', error);
});

async function bootstrap() {
  // Явно регистрируем модели перед запуском
  console.log('🔍 Registering mongoose models...');

  // Подключаемся к MongoDB
  await mongoose.connect('mongodb://admin:admin@mongodb:27017/mydb?authSource=admin', {
    dbName: 'mydb',
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });

  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log('🚀 Server is running on http://localhost:3000');
}

bootstrap();