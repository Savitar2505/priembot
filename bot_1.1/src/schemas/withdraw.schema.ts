import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Types } from 'mongoose';

export enum WithdrawStatuses {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
@Schema({
  collection: 'withdraws',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Withdraw {
  @Prop({
    type: String,
    enum: ['OPERATOR', 'GROUP'],
    required: true,
  })
  target_type: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
  })
  operator?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Requisite',
    required: false,
  })
  requisite?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Group',
    required: false,
  })
  group?: Types.ObjectId;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: Number, required: false })
  amount_usdt?: number;

  @Prop({
    type: String,
    enum: WithdrawStatuses,
    default: WithdrawStatuses.PENDING,
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  admin?: Types.ObjectId;

  @Prop()
  reject_reason?: string;
}

export type WithdrawDocument = Withdraw & mongoose.Document;

export const WithdrawSchema = SchemaFactory.createForClass(Withdraw);
