import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = async (
    configService: ConfigService,
): Promise<MongooseModuleOptions> => {

    // Логируем все переменные окружения
    console.log('🔍 MongoDB Configuration:');
    const login = configService.get<string>('MONGO_LOGIN');
    const password = configService.get<string>('MONGO_PASSWORD');
    const host = configService.get<string>('MONGO_HOST');
    const port = configService.get<string>('MONGO_PORT');
    const dbName = configService.get<string>('MONGO_DB_NAME');
    const authSource = configService.get<string>('MONGO_AUTH_SOURCE');
    const timeout = configService.get<number>('MONGO_TIMEOUT');

    console.log('MONGO_LOGIN:', login);
    console.log('MONGO_PASSWORD:', password);
    console.log('MONGO_HOST:', host);
    console.log('MONGO_PORT:', port);
    console.log('MONGO_DB_NAME:', dbName);
    console.log('MONGO_AUTH_SOURCE:', authSource);
    console.log('MONGO_TIMEOUT:', timeout);

    const connectionString = getMongoString(configService);
    console.log('📡 Connection string:', connectionString);

    return {
        uri: connectionString,
        dbName: dbName,
        directConnection: true,
        connectTimeoutMS: timeout,
        serverSelectionTimeoutMS: timeout,
    };
};

const getMongoString = (config: ConfigService) => {
    const login = config.get<string>('MONGO_LOGIN');
    const password = config.get<string>('MONGO_PASSWORD');
    const host = config.get<string>('MONGO_HOST');
    const port = config.get<string>('MONGO_PORT');
    const dbName = config.get<string>('MONGO_DB_NAME');

    return `mongodb://${login}:${password}@${host}:${port}/${dbName}?authSource=admin`;
};