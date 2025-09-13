import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = async (): Promise<MongooseModuleOptions> => {

    console.log('🔍 Using hardcoded MongoDB configuration');

    const connectionString = 'mongodb://admin:admin@mongodb:27017/mydb?authSource=admin';
    console.log('📡 Connection string:', connectionString);

    return {
        uri: connectionString,
        dbName: 'mydb',
        directConnection: true,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
    };
};

// Упрощаем функцию для использования без ConfigService
export const mongoConfigFactory = {
    provide: 'MONGO_CONFIG',
    useFactory: getMongoConfig,
};