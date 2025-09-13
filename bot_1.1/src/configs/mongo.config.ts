import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = async (
    configService: ConfigService,
): Promise<MongooseModuleOptions> => {
    return {
        uri: getMongoString(configService),
        dbName: configService.get<string>('MONGO_DB_NAME'),
        directConnection: true,
        connectTimeoutMS: configService.get<number>('MONGO_TIMEOUT'),
        serverSelectionTimeoutMS: configService.get<number>('MONGO_TIMEOUT'),
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