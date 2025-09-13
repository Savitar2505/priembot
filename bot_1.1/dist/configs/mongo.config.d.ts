import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';
export declare const getMongoConfig: (configService: ConfigService) => Promise<MongooseModuleOptions>;
