import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { InputFile } from 'telegraf/types';

export enum OperationStatuses {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Schema({
  collection: 'operations',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Operation extends Document {
  @Prop({ required: true })
  group_id: Types.ObjectId;

  @Prop({ required: false })
  requisite_id: Types.ObjectId;

  @Prop({ required: true })
  group_chat_id: number;

  @Prop({ required: true })
  original_message_id: number;

  @Prop({ required: true })
  group_message_id: number;

  @Prop({ required: true })
  operator_id: Types.ObjectId;

  @Prop({ required: false })
  photo_file_id: string;

  @Prop({ required: false })
  document_file_id: string;

  @Prop({
    type: String,
    enum: OperationStatuses,
    default: OperationStatuses.PENDING,
  })
  status: string;

  created_at: Date;
  updated_at: Date;
}
export type OperationDocument = Operation & mongoose.Document;

export const OperationSchema = SchemaFactory.createForClass(Operation);
