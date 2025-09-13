import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  collection: 'groups',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Group {
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  telegram_group_id: string;

  @Prop({
    type: [Types.ObjectId],
    ref: 'User',
    default: [],
  })
  operator_ids: Types.ObjectId[];

  // @Prop({
  //   type: [Types.ObjectId],
  //   ref: 'Requisite',
  //   default: [],
  // })
  // requisite_ids: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  balance: number;
}
export type GroupDocument = Group & mongoose.Document;

export const GroupSchema = SchemaFactory.createForClass(Group);
