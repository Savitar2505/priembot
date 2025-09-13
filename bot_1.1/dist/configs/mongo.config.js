"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMongoConfig = void 0;
const getMongoConfig = async (configService) => {
    return {
        uri: getMongoString(configService),
        dbName: configService.get('MONGO_DB_NAME'),
        directConnection: true,
        connectTimeoutMS: configService.get('MONGO_TIMEOUT'),
        serverSelectionTimeoutMS: configService.get('MONGO_TIMEOUT'),
    };
};
exports.getMongoConfig = getMongoConfig;
const getMongoString = (config) => {
    return ('mongodb://' +
        config.get('MONGO_HOST') +
        ':' +
        config.get('MONGO_PORT'));
};
//# sourceMappingURL=mongo.config.js.map