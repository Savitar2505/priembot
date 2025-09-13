import { MongooseModuleOptions } from '@nestjs/mongoose';

export const getMongoConfig = async (): Promise<MongooseModuleOptions> => {

    console.log('🔍 Mongoose configuration is being loaded...');

    const uri = 'mongodb://admin:admin@mongodb:27017/mydb?authSource=admin&directConnection=true';
    console.log('📡 Using MongoDB URI:', uri);

    return {
        uri: uri,
        dbName: 'mydb',
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
    };
};