import { Module } from '@nestjs/common';
import {ConfigModule} from "@nestjs/config";
import {BotModule} from "./bot/bot.module";
import {DatabaseModule} from "./database/database.module";
import {UserModule} from "./user/user.module";
import {GroupModule} from "./group/group.module";
import {RequisiteModule} from "./requisite/requisite.module";

@Module({

  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UserModule,
    GroupModule,
    RequisiteModule,
    BotModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
