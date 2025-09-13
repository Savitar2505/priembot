import { MongooseModule } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { WithdrawSchema } from '../schemas/withdraw.schema';
import { WithdrawService } from './withdraw.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Withdraw', schema: WithdrawSchema }]),
  ],
  providers: [WithdrawService],
  exports: [WithdrawService],
})
export class WithdrawModule {}
