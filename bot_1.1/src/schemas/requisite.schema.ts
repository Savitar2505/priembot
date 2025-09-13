import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({
  collection: 'requisites',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Requisite {
  _id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: false })
  owner: string;

  @Prop({ type: String })
  type: string;

  @Prop({ type: String, required: true })
  account_number: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  operator_id: Types.ObjectId | null;

  @Prop({ type: Number, default: 0 })
  balance: number;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: String, default: null })
  description: string | null;
}

export type RequisiteDocument = Requisite & mongoose.Document;

export const RequisiteSchema = SchemaFactory.createForClass(Requisite);
