import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { BotUpdate } from './bot.update';
import { botOptions } from '../configs/bot.config';
import { UserModule } from '../user/user.module';
import { GroupModule } from '../group/group.module';
import { RequisiteModule } from '../requisite/requisite.module';
import { OperatorUpdate } from './operator.update';
import { RequisiteUpdate } from './requisite.update';
import { GroupUpdate } from './group.update';
import { BalanceUpdate } from './balance.update';
import { WithdrawModule } from '../withdraw/withdraw.module';
import { OperationModule } from '../operation/operation.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync(botOptions()),
    UserModule,
    GroupModule,
    RequisiteModule,
    WithdrawModule,
    OperationModule,
  ],
  controllers: [],
  providers: [
    OperatorUpdate,
    GroupUpdate,
    BalanceUpdate,
    RequisiteUpdate,
    BotUpdate,
  ],
})
export class BotModule {}
