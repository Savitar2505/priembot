import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = async (): Promise<MongooseModuleOptions> => {

    return {
        uri: 'mongodb://mongodb:27017/mydb',
        dbName: 'mydb',
        auth: {
            username: 'admin',
            password: 'admin',
        },
        authSource: 'admin',
        directConnection: true,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
    };
};